// Integraatori fail: ühine OpenAI API klient (ainult serveris). KNOWLEDGE.md D-13.
// Chat Completions otse fetch'iga, et vältida lisasõltuvust.
// Dokumentatsioon:
//   https://developers.openai.com/api/reference/resources/chat/subresources/completions/methods/create
//   https://developers.openai.com/api/docs/guides/structured-outputs

const API_URL = 'https://api.openai.com/v1/chat/completions';

export type LlmRole = 'user' | 'assistant';
export interface LlmMessage {
  role: LlmRole;
  content: string;
}

export interface LlmCallOptions {
  model: string;
  system?: string;
  messages: LlmMessage[];
  /** Ülempiir väljundile (sh mõtlemistokenid). Vaikimisi piirangut ei saadeta. */
  maxTokens?: number;
  timeoutMs?: number;
  /** nt 'low'. Vaikimisi ei saadeta (mudeli vaikeväärtus). Kõik mudelid ei toeta kõiki väärtusi. */
  reasoningEffort?: string;
}

/** Tööriist pakkujast sõltumatul kujul. `parameters` on JSON Schema objekt. */
export interface LlmTool {
  name: string;
  description: string;
  parameters: object;
}

export class LlmError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
  }
}

function apiKey(): string {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new LlmError('OPENAI_API_KEY puudub (.env.local või Verceli Environment Variables)');
  return key;
}

export const models = {
  /** Kiire: kohtunik ja kaskaadi päästekorraldaja. Odavam variant: gpt-6-luna. */
  fast: () => process.env.OPENAI_FAST_MODEL ?? 'gpt-6.1-terra',
  /** Tark: analüütik. */
  smart: () => process.env.OPENAI_SMART_MODEL ?? 'gpt-6.1-sol',
  /** Kiire mudeli mõtlemispingutus (nt 'low'); tühi = mudeli vaikeväärtus. */
  fastEffort: () => process.env.OPENAI_FAST_REASONING_EFFORT || undefined,
};

function baseBody(opts: LlmCallOptions): Record<string, unknown> {
  return {
    model: opts.model,
    messages: [...(opts.system ? [{ role: 'system', content: opts.system }] : []), ...opts.messages],
    ...(opts.maxTokens ? { max_completion_tokens: opts.maxTokens } : {}),
    ...(opts.reasoningEffort ? { reasoning_effort: opts.reasoningEffort } : {}),
  };
}

async function post(body: unknown, timeoutMs: number, signal?: AbortSignal): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  const onAbort = () => ctrl.abort();
  signal?.addEventListener('abort', onAbort);
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey()}` },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new LlmError(`OpenAI API ${res.status}: ${text.slice(0, 500)}`, res.status);
    }
    return res;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
  }
}

/** Üks kordus ajutise vea korral (429, 5xx, võrk, ajapiir). */
async function postWithRetry(body: unknown, timeoutMs: number): Promise<Response> {
  try {
    return await post(body, timeoutMs);
  } catch (e) {
    const status = e instanceof LlmError ? e.status : undefined;
    const retryable = status === undefined || status === 429 || status >= 500;
    if (!retryable) throw e;
    return post(body, timeoutMs);
  }
}

interface ChatResponse {
  choices: { message: { content: string | null; refusal?: string | null } }[];
}

function firstText(data: ChatResponse): string {
  const msg = data.choices?.[0]?.message;
  if (msg?.refusal) throw new LlmError(`Mudel keeldus: ${msg.refusal.slice(0, 200)}`);
  return msg?.content ?? '';
}

export async function llmText(opts: LlmCallOptions): Promise<string> {
  const res = await postWithRetry(baseBody(opts), opts.timeoutMs ?? 15000);
  return firstText((await res.json()) as ChatResponse);
}

/**
 * Struktureeritud JSON-vastus (response_format = json_schema, strict).
 * Range režiimi nõuded skeemile: igal objektil `additionalProperties: false` ja KÕIK väljad on
 * `required` hulgas. Valikuline väli kirjelda nullitavana (nt `type: ['number', 'null']`) ja
 * eemalda `null`-id koodis enne meie tüüpidesse panemist.
 */
export async function llmJson<T>(opts: LlmCallOptions & { schema: object; schemaName?: string }): Promise<T> {
  const res = await postWithRetry(
    {
      ...baseBody(opts),
      response_format: {
        type: 'json_schema',
        json_schema: { name: opts.schemaName ?? 'result', strict: true, schema: opts.schema },
      },
    },
    opts.timeoutMs ?? 15000,
  );
  const text = firstText((await res.json()) as ChatResponse);
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new LlmError(`Mudel tagastas vigase JSON-i: ${text.slice(0, 200)}`);
  }
}

interface StreamChunk {
  choices?: {
    delta?: {
      content?: string | null;
      tool_calls?: { index: number; id?: string; function?: { name?: string; arguments?: string } }[];
    };
    finish_reason?: string | null;
  }[];
  error?: { message?: string };
}

/**
 * Voogedastus: tagastab teksti tükid kohe, kui need tulevad (madal viivitus häälele).
 * Tööriistakutsed tulevad `onToolUse` kaudu, kui vastus on lõppenud.
 */
export async function* llmStream(
  opts: LlmCallOptions & {
    tools?: LlmTool[];
    signal?: AbortSignal;
    onToolUse?: (name: string, input: unknown) => void;
  },
): AsyncGenerator<string> {
  const res = await post(
    {
      ...baseBody(opts),
      ...(opts.tools?.length
        ? {
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
  if (!res.body) throw new LlmError('Voog puudub');

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  const toolCalls = new Map<number, { name: string; args: string }>();

  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx: number;
    while ((idx = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, idx).trim();
      buffer = buffer.slice(idx + 1);
      if (!line.startsWith('data:')) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === '[DONE]') continue;
      let chunk: StreamChunk;
      try {
        chunk = JSON.parse(payload) as StreamChunk;
      } catch {
        continue;
      }
      if (chunk.error) throw new LlmError(`OpenAI voo viga: ${chunk.error.message ?? 'tundmatu'}`);
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
  }

  if (opts.onToolUse) {
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
}
