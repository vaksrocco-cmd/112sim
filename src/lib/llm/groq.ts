// Integraatori fail: Groq API (ainult serveris). Kasutame AINULT eestikeelseks kõnetuvastuseks (Whisper, tasuta tase).
// LLM-ina Groqi ei kasutata: otsused teeb OpenAI. Dokumentatsioon: https://console.groq.com/docs/speech-to-text
import { fetchWithTimeout, LlmError } from './types';

const URL = 'https://api.groq.com/openai/v1/audio/transcriptions';

export const groqConfigured = () => Boolean(process.env.GROQ_API_KEY);
export const groqSttModel = () => process.env.GROQ_STT_MODEL || 'whisper-large-v3-turbo';

/**
 * Kõnetuvastus (Whisper). `prompt` aitab konteksti anda, aga ÄRA pane sinna stsenaariumi tõde:
 * muidu "kuuleb" mudel aadressi, mida helistaja ei öelnud.
 */
export async function groqTranscribe(
  audio: Blob,
  opts: { language?: string; prompt?: string; filename?: string; timeoutMs?: number } = {},
): Promise<string> {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new LlmError('GROQ_API_KEY puudub (.env.local või Verceli Environment Variables)', 401);
  const form = new FormData();
  form.append('file', audio, opts.filename ?? 'speech.webm');
  form.append('model', groqSttModel());
  form.append('language', opts.language ?? 'et');
  form.append('response_format', 'json');
  form.append('temperature', '0');
  if (opts.prompt) form.append('prompt', opts.prompt);
  const res = await fetchWithTimeout(URL, { method: 'POST', headers: { authorization: `Bearer ${key}` }, body: form }, opts.timeoutMs ?? 10000);
  if (!res.ok) throw new LlmError(`Groq API ${res.status}: ${(await res.text().catch(() => '')).slice(0, 300)}`, res.status);
  return ((await res.json()) as { text?: string }).text?.trim() ?? '';
}
