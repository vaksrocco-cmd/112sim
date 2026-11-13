// HÄÄL. KNOWLEDGE.md 9.1: tekst -> eestikeelne kõne.
// Päring: POST { text } -> heli. Pakkuja: ElevenLabs (voog, kiire), kui ELEVENLABS_API_KEY on olemas;
// muidu (või vea korral) TartuNLP avalik API (tasuta, aga aeglasem). 501/502 = klient kasutab brauseri häält.
// Dokumentatsioon: https://elevenlabs.io/docs/api-reference/text-to-speech/stream
//   NB: vaikimisi mudel eleven_multilingual_v2 EI oska eesti keelt; eleven_v4_turbo oskab ja on kõige kiirem.
import { z } from 'zod';

export const maxDuration = 30;

const Body = z.object({ text: z.string().min(1).max(600) });

async function timed(url: string, init: RequestInit, ms: number): Promise<Response | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal });
    return res.ok && res.body ? res : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return new Response('bad_request', { status: 400 });
  const { text } = parsed.data;
  if (process.env.TTS_PROVIDER === 'browser') return new Response('tts_not_configured', { status: 501 });

  if (process.env.ELEVENLABS_API_KEY) {
    const voice = process.env.ELEVENLABS_VOICE_ID || 'JBFqnCBsd6RMkjVDRZzb';
    const res = await timed(
      `https://api.elevenlabs.io/v1/text-to-speech/${voice}/stream?output_format=mp3_44100_64`,
      {
        method: 'POST',
        headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY, 'content-type': 'application/json' },
        body: JSON.stringify({ text, model_id: process.env.ELEVENLABS_TTS_MODEL || 'eleven_v4_turbo', language_code: 'et' }),
      },
      8000,
    );
    if (res) return new Response(res.body, { headers: { 'content-type': 'audio/mpeg', 'cache-control': 'no-store', 'x-tts': 'elevenlabs' } });
    console.error('[voice/tts] ElevenLabs ebaõnnestus, proovin TartuNLP-d');
  }

  const res = await timed(
    'https://api.tartunlp.ai/text-to-speech/v2',
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text, speaker: process.env.TARTUNLP_SPEAKER || 'mari' }),
    },
    15000,
  );
  if (!res) return new Response('tts_failed', { status: 502 });
  return new Response(res.body, {
    headers: { 'content-type': res.headers.get('content-type') ?? 'audio/wav', 'cache-control': 'no-store', 'x-tts': 'tartunlp' },
  });
}
