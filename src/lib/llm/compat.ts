// Integraatori fail: Chat Completions API klient (fetch, ilma SDK-ta).
// Otse fetch'iga, et vältida lisasõltuvust.
import {
  fetchWithTimeout,
  LlmError,
  parseJson,
  sseJson,
  type LlmCallOptions,
  type LlmJsonOptions,
  type LlmStreamOptions,
} from './types';

export interface ChatClientConfig {
  name: string;
  baseUrl: string;
  keyEnv: string;
  /** Mõtlemispingutus: mida saata `reasoning_effort` väljal (undefined = ära saada). */
  effort: (requested?: string) => string | undefined;
  /** Sama, kui päringus on tööriistad (Chat Completions ei luba mõne mudeliga tööriistu koos mõtlemisega). */
  toolEffort?: () => string | undefined;
}

interface ChatResponse {
  choices: { message: { content: string | null; refusal?: string | null } }[];
}

interface StreamChunk {
  choices?: {
    delta?: {
      content?: string | null;
      tool_calls?: { index: number; function?: { name?: string; arguments?: string } }[];
    };
  }[];
  error?: { message?: string };
}

export function createChatClient(cfg: ChatClientConfig) {
  const configured = () => Boolean(process.env[cfg.keyEnv]);

  function auth(): Record<string, string> {
    const key = process.env[cfg.keyEnv];
    if (!key) throw new LlmError(`${cfg.keyEnv} puudub (.env.local või Verceli Environment Variables)`, 401);
    return { authorization: `Bearer ${key}` };
  }

  async function request(path: string, init: RequestInit, timeoutMs: number, signal?: AbortSignal): Promise<Response> {
    const res = await fetchWithTimeout(`${cfg.baseUrl}${path}`, init, timeoutMs, signal);
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new LlmError(`${cfg.name} API ${res.status}: ${text.slice(0, 500)}`, res.status);
    }
    return res;
  }

  const chat = (body: unknown, timeoutMs: number, signal?: AbortSignal) =>
    request(
      '/chat/completions',
      { method: 'POST', headers: { 'content-type': 'application/json', ...auth() }, body: JSON.stringify(body) },
      timeoutMs,
      signal,
    );

  function baseBody(opts: LlmCallOptions): Record<string, unknown> {
    const effort = cfg.effort(opts.effort);
    return {
      model: opts.model,
      messages: [...(opts.system ? [{ role: 'system', content: opts.system }] : []), ...opts.messages],
      ...(opts.maxTokens ? { max_completion_tokens: opts.maxTokens } : {}),
      ...(effort ? { reasoning_effort: effort } : {}),
    };
  }

  function firstText(data: ChatResponse): string {
    const msg = data.choices?.[0]?.message;
    if (msg?.refusal) throw new LlmError(`Mudel keeldus: ${msg.refusal.slice(0, 200)}`, 400);
    return msg?.content ?? '';
  }

  async function text(opts: LlmCallOptions): Promise<string> {
    const res = await chat(baseBody(opts), opts.timeoutMs ?? 15000);
    return firstText((await res.json()) as ChatResponse);
  }

  /** Struktureeritud JSON (response_format = json_schema, strict). */
  async function json<T>(opts: LlmJsonOptions): Promise<T> {
    const res = await chat(
      {
        ...baseBody(opts),
        response_format: {
          type: 'json_schema',
          json_schema: { name: opts.schemaName ?? 'result', strict: true, schema: opts.schema },
        },
      },
      opts.timeoutMs ?? 15000,
    );
    return parseJson<T>(firstText((await res.json()) as ChatResponse), cfg.name);
  }

  /** Voog: tekstitükid kohe; tööriistakutsed `onToolUse` kaudu, kui vastus on lõppenud. */
  async function* stream(opts: LlmStreamOptions): AsyncGenerator<string> {
    const res = await chat(
      {
        ...baseBody(opts),
        ...(opts.tools?.length
          ? {
              ...(cfg.toolEffort?.() ? { reasoning_effort: cfg.toolEffort() } : {}),
              tools: opts.tools.map((t) => ({
                type: 'function',
                function: { name: t.name, description: t.description, parameters: t.parameters },
              })),
            }
          : {}),
        stream: true,
      },
      opts.timeoutMs ?? 20000,
      opts.signal,
    );

    const toolCalls = new Map<number, { name: string; args: string }>();
    for await (const chunk of sseJson<StreamChunk>(res)) {
      if (chunk.error) throw new LlmError(`${cfg.name} voo viga: ${chunk.error.message ?? 'tundmatu'}`);
      const delta = chunk.choices?.[0]?.delta;
      if (!delta) continue;
      if (delta.content) yield delta.content;
      for (const tc of delta.tool_calls ?? []) {
        const cur = toolCalls.get(tc.index) ?? { name: '', args: '' };
        if (tc.function?.name) cur.name = tc.function.name;
        if (tc.function?.arguments) cur.args += tc.function.arguments;
        toolCalls.set(tc.index, cur);
      }
    }
    if (!opts.onToolUse) return;
    for (const [, tc] of [...toolCalls.entries()].sort((a, b) => a[0] - b[0])) {
      if (!tc.name) continue;
      let input: unknown = {};
      try {
        input = tc.args ? JSON.parse(tc.args) : {};
      } catch {
        input = {};
      }
      opts.onToolUse(tc.name, input);
    }
  }

  return { configured, text, json, stream };
}
