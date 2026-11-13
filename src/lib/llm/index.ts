// Integraatori fail. Kõik moodulid impordivad LLM-i siit: `import { llmJson } from '@/lib/llm'`.
//
// Tööjaotus:
//   OpenAI = kõik otsused (päästekorraldaja, kohtunik, analüütik).
//   Groq   = ainult eestikeelne kõnetuvastus (groqTranscribe, Whisper). LLM-ina Groqi ei kasutata.
// Kutsuja valib taseme ('fast' | 'smart'), mitte mudeli nime.
import { groqConfigured, groqSttModel } from './groq';
import { openai, openaiModels } from './openai';
import { isRetryable, type LlmCallOptions, type LlmJsonOptions, type LlmStreamOptions } from './types';

export type LlmTier = 'fast' | 'smart';
type Tiered<T> = Omit<T, 'model'> & { tier: LlmTier };

/** Üks kordus ajutise vea korral (429, 5xx, võrk, ajapiir). */
async function withRetry<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (e) {
    if (!isRetryable(e)) throw e;
    return run();
  }
}

export function llmText(opts: Tiered<LlmCallOptions>): Promise<string> {
  return withRetry(() => openai.text({ ...opts, model: openaiModels[opts.tier]() }));
}

export function llmJson<T>(opts: Tiered<LlmJsonOptions>): Promise<T> {
  return withRetry(() => openai.json<T>({ ...opts, model: openaiModels[opts.tier]() }));
}

/** Voog: tekstitükid kohe, kui need tulevad; tööriistakutsed `onToolUse` kaudu. */
export function llmStream(opts: Tiered<LlmStreamOptions>): AsyncGenerator<string> {
  return openai.stream({ ...opts, model: openaiModels[opts.tier]() });
}

/** Seadistuse ülevaade /api/health jaoks: ainult jah/ei ja mudelite nimed, mitte võtmeid. */
export function llmStatus() {
  const on = openai.configured();
  return {
    openai: on,
    groq: groqConfigured(),
    models: {
      dispatcher: on ? openaiModels.fast() : null,
      judge: on ? openaiModels.fast() : null,
      analyst: on ? openaiModels.smart() : null,
      stt: groqConfigured() ? groqSttModel() : null,
    },
  };
}

export { groqConfigured, groqTranscribe } from './groq';
export { LlmError } from './types';
export type { LlmCallOptions, LlmJsonOptions, LlmMessage, LlmRole, LlmStreamOptions, LlmTool } from './types';
