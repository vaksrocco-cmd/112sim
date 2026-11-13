// Integraatori fail: pakkujast sõltumatud LLM-i tüübid .

export type LlmRole = 'user' | 'assistant';
export interface LlmMessage {
  role: LlmRole;
  content: string;
}

export interface LlmCallOptions {
  model: string;
  system?: string;
  messages: LlmMessage[];
  /** Ülempiir väljundile (sh mõtlemistokenid). */
  maxTokens?: number;
  timeoutMs?: number;
  /** 'low' | 'medium' | 'high'. Madalam = kiirem vastus. */
  effort?: string;
}

/** Tööriist pakkujast sõltumatul kujul. `parameters` on JSON Schema objekt. */
export interface LlmTool {
  name: string;
  description: string;
  parameters: object;
}

export interface LlmStreamOptions extends LlmCallOptions {
  tools?: LlmTool[];
  signal?: AbortSignal;
  onToolUse?: (name: string, input: unknown) => void;
}

export interface LlmJsonOptions extends LlmCallOptions {
  /**
   * JSON Schema. Range režiim: igal objektil
   * `additionalProperties: false` ja KÕIK väljad `required` hulgas; valikuline väli on nullitav
   * (`type: ['number', 'null']`). Pikkuse- ja arvupiiranguid (minLength, minimum …) ära kasuta.
   */
  schema: object;
  schemaName?: string;
}

export class LlmError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
  }
}

/** Ajutine viga (429, 5xx, võrk, ajapiir): tasub korrata või minna varupakkujale. */
export function isRetryable(e: unknown): boolean {
  const status = e instanceof LlmError ? e.status : undefined;
  return status === undefined || status === 429 || status >= 500;
}

export async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
  signal?: AbortSignal,
): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  const onAbort = () => ctrl.abort();
  signal?.addEventListener('abort', onAbort);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
  }
}

/** Loeb SSE voost `data:` read ja annab need JSON-ina. */
export async function* sseJson<T>(res: Response): AsyncGenerator<T> {
  if (!res.body) throw new LlmError('Voog puudub');
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
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
      try {
        yield JSON.parse(payload) as T;
      } catch {
        /* poolik rida: jäta vahele */
      }
    }
  }
}

export function parseJson<T>(text: string, who: string): T {
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new LlmError(`${who} tagastas vigase JSON-i: ${text.slice(0, 200)}`);
  }
}
