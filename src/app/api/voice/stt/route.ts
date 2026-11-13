// HÄÄL. Kõnetuvastus: helistaja lause (heli) -> tekst, eesti keeles.
// Pakkuja: ElevenLabs Scribe, kui ELEVENLABS_API_KEY on olemas; muidu (või vea korral) Groq Whisper.
// Päring: POST multipart/form-data, väli `audio` (webm/ogg/mp4/wav). Vastus: { text, provider }.
// Heli ei salvestata: see läheb ainult tuvastusse ja unustatakse.
// Dokumentatsioon: https://elevenlabs.io/docs/api-reference/speech-to-text/convert
import { NextResponse } from 'next/server';
import { groqConfigured, groqTranscribe } from '@/lib/llm';

export const maxDuration = 30;

const MAX_BYTES = 4 * 1024 * 1024;
// Kõnetuvastus "kuuleb" vaikuses tihti neid fraase. Tõde siia EI lisata (muidu tekib aadress, mida ei öeldud).
const HALLUCINATIONS = [/^tänan vaatamast/i, /^aitäh vaatamast/i, /subtiitrid/i, /^tellige kanal/i, /^\W*$/, /^\(.*\)$/];
const HINT = 'Hädaabikõne Eestis. Helistaja räägib eesti keeles, mis juhtus, mis aadressil ta on ja kuidas abivajajal läheb.';

async function elevenLabsTranscribe(audio: Blob, filename: string): Promise<string> {
  const form = new FormData();
  form.append('file', audio, filename);
  form.append('model_id', process.env.ELEVENLABS_STT_MODEL || 'scribe_v2');
  form.append('language_code', 'et');
  form.append('tag_audio_events', 'false');
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10000);
  try {
    const res = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
      method: 'POST',
      headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY ?? '' },
      body: form,
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`ElevenLabs STT ${res.status}: ${(await res.text().catch(() => '')).slice(0, 200)}`);
    return ((await res.json()) as { text?: string }).text?.trim() ?? '';
  } finally {
    clearTimeout(timer);
  }
}

export async function POST(req: Request) {
  const eleven = Boolean(process.env.ELEVENLABS_API_KEY);
  if (!eleven && !groqConfigured()) return NextResponse.json({ error: 'stt_not_configured' }, { status: 501 });
  const form = await req.formData().catch(() => null);
  const audio = form?.get('audio');
  if (!(audio instanceof Blob) || audio.size === 0) return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  if (audio.size > MAX_BYTES) return NextResponse.json({ error: 'too_large' }, { status: 413 });
  const filename = audio instanceof File && audio.name ? audio.name : 'speech.webm';

  let text: string | null = null;
  let provider = '';
  if (eleven) {
    try {
      text = await elevenLabsTranscribe(audio, filename);
      provider = 'elevenlabs';
    } catch (e) {
      console.error('[voice/stt]', e instanceof Error ? e.message : e);
    }
  }
  if (text === null && groqConfigured()) {
    try {
      text = await groqTranscribe(audio, { language: 'et', prompt: HINT, filename });
      provider = 'groq';
    } catch (e) {
      console.error('[voice/stt]', e instanceof Error ? e.message : e);
    }
  }
  if (text === null) return NextResponse.json({ error: 'stt_failed' }, { status: 502 });
  return NextResponse.json({ text: HALLUCINATIONS.some((re) => re.test(text)) ? '' : text, provider });
}
