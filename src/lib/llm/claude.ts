// Integraatori fail: ühine Claude API klient (ainult serveris).
// Dokumentatsioon: https://platform.claude.com/docs/en/build-with-claude/structured-outputs
// Kasutame otse fetch'i, et vältida lisasõltuvust.

const API_URL = 'https://api.anthropic.com/v1/messages';

export type ClaudeRole = 'user' | 'assistant';
export interface ClaudeMessage {
  role: ClaudeRole;
  content: string;
}

export interface ClaudeCallOptions {
  model: string;
  system?: string;
  messages: ClaudeMessage[];
  maxTokens?: number;
  timeoutMs?: number;
}

export class ClaudeError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
  }
}

function apiKey(): string {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new ClaudeError('ANTHROPIC_API_KEY puudub (.env.local)');
  return key;
}

function headers(): Record<string, string> {
  return {
    'content-type': 'application/json',
    'x-api-key': apiKey(),
    'anthropic-version': process.env.ANTHROPIC_VERSION ?? '2023-06-01',
  };
}

export const models = {
  /** Kiire: kohtunik ja päästekorraldaja. */
  fast: () => process.env.CLAUDE_FAST_MODEL ?? 'claude-haiku-5-5',
  /** Tark: analüütik. */
  smart: () => process.env.CLAUDE_SMART_MODEL ?? 'claude-sonnet-5-5',
};

interface ContentBlock {
  type: string;
  text?: string;
}

async function post(body: unknown, timeoutMs: number, signal?: AbortSignal): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  signal?.addEventListener('abort', () => ctrl.abort());
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new ClaudeError(`Claude API ${res.status}: ${text.slice(0, 500)}`, res.status);
    }
    return res;
  } finally {
    clearTimeout(timer);
  }
}

/** Tavaline tekstivastus. */
export async function claudeText(opts: ClaudeCallOptions): Promise<string> {
  const res = await post(
    { model: opts.model, max_tokens: opts.maxTokens ?? 1024, system: opts.system, messages: opts.messages },
    opts.timeoutMs ?? 15000,
  );
  const data = (await res.json()) as { content: ContentBlock[] };
  return data.content.filter((b) => b.type === 'text').map((b) => b.text ?? '').join('');
}

/**
 * Struktureeritud JSON-vastus (output_config.format = json_schema).
 * Skeemis peab igal objektil olema additionalProperties: false; numbrilised ja
 * stringi pikkuse piirangud ei ole lubatud.
 */
export async function claudeJson<T>(opts: ClaudeCallOptions & { schema: object }): Promise<T> {
  const res = await post(
    {
      model: opts.model,
      max_tokens: opts.maxTokens ?? 2048,
      system: opts.system,
      messages: opts.messages,
      output_config: { format: { type: 'json_schema', schema: opts.schema } },
    },
    opts.timeoutMs ?? 15000,
  );
  const data = (await res.json()) as { content: ContentBlock[] };
  const text = data.content.filter((b) => b.type === 'text').map((b) => b.text ?? '').join('');
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new ClaudeError(`Claude tagastas vigase JSON-i: ${text.slice(0, 200)}`);
  }
}

/**
 * Voogedastus: tagastab teksti tükid kohe, kui need tulevad (madal viivitus häälele).
 * Tööriistakutsed tulevad eraldi `onToolUse` kaudu, kui vastus on lõppenud.
 */
export async function* claudeStream(
  opts: ClaudeCallOptions & {
    tools?: { name: string; description: string; input_schema: object }[];
    signal?: AbortSignal;
    onToolUse?: (name: string, input: unknown) => void;
  },
): AsyncGenerator<string> {
  const res = await post(
    {
      model: opts.model,
      max_tokens: opts.maxTokens ?? 512,
      system: opts.system,
      messages: opts.messages,
      tools: opts.tools,
      stream: true,
    },
    opts.timeoutMs ?? 20000,
    opts.signal,
  );
  if (!res.body) throw new ClaudeError('Voog puudub');

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  const toolBlocks = new Map<number, { name: string; json: string }>();

  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx: number;
    while ((idx = buffer.indexOf('\n\n')) >= 0) {
      const raw = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      const dataLine = raw.split('\n').find((l) => l.startsWith('data:'));
      if (!dataLine) continue;
      let ev: {
        type: string;
        index?: number;
        delta?: { type: string; text?: string; partial_json?: string };
        content_block?: { type: string; name?: string };
      };
      try {
        ev = JSON.parse(dataLine.slice(5).trim());
      } catch {
        continue;
      }
      if (ev.type === 'content_block_start' && ev.content_block?.type === 'tool_use' && ev.index !== undefined) {
        toolBlocks.set(ev.index, { name: ev.content_block.name ?? '', json: '' });
      } else if (ev.type === 'content_block_delta' && ev.delta) {
        if (ev.delta.type === 'text_delta' && ev.delta.text) yield ev.delta.text;
        if (ev.delta.type === 'input_json_delta' && ev.index !== undefined) {
          const b = toolBlocks.get(ev.index);
          if (b) b.json += ev.delta.partial_json ?? '';
        }
      } else if (ev.type === 'content_block_stop' && ev.index !== undefined) {
        const b = toolBlocks.get(ev.index);
        if (b && opts.onToolUse) {
          let input: unknown = {};
          try {
            input = b.json ? JSON.parse(b.json) : {};
          } catch {
            input = {};
          }
          opts.onToolUse(b.name, input);
        }
      } else if (ev.type === 'error') {
        throw new ClaudeError(`Claude voo viga: ${JSON.stringify(ev).slice(0, 300)}`);
      }
    }
  }
}
