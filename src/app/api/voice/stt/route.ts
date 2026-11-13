// HÄÄL. Kõnetuvastus: helistaja lause (heli) -> tekst. Groq Whisper, keel 'et'.
// Päring: POST multipart/form-data, väli `audio` (webm/ogg/mp4/wav). Vastus: { text }.
// Heli ei salvestata: see läheb ainult tuvastusse ja unustatakse.
import { NextResponse } from 'next/server';
import { groqConfigured, groqTranscribe } from '@/lib/llm';

export const maxDuration = 30;

const MAX_BYTES = 4 * 1024 * 1024;
// Whisper "kuuleb" vaikuses tihti neid fraase. Tõde siia EI lisata (muidu tekib aadress, mida ei öeldud).
const HALLUCINATIONS = [/^tänan vaatamast/i, /^aitäh vaatamast/i, /subtiitrid/i, /^tellige kanal/i, /^\W*$/];
const HINT = 'Hädaabikõne Eestis. Helistaja räägib eesti keeles, mis juhtus, mis aadressil ta on ja kuidas abivajajal läheb.';

export async function POST(req: Request) {
  if (!groqConfigured()) return NextResponse.json({ error: 'stt_not_configured' }, { status: 501 });
  const form = await req.formData().catch(() => null);
  const audio = form?.get('audio');
  if (!(audio instanceof Blob) || audio.size === 0) return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  if (audio.size > MAX_BYTES) return NextResponse.json({ error: 'too_large' }, { status: 413 });
  try {
    const filename = audio instanceof File && audio.name ? audio.name : 'speech.webm';
    const text = await groqTranscribe(audio, { language: 'et', prompt: HINT, filename });
    return NextResponse.json({ text: HALLUCINATIONS.some((re) => re.test(text)) ? '' : text });
  } catch (e) {
    console.error('[voice/stt]', e instanceof Error ? e.message : e);
    return NextResponse.json({ error: 'stt_failed' }, { status: 502 });
  }
}
