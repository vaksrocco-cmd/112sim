// HÄÄL. KNOWLEDGE.md 9.1: tekst -> eestikeelne kõne.
// Päring: POST { text, emotion? } -> heli.
// Põhipakkuja on TartuNLP (Tartu Ülikool): eesti emakeelega hääled, õige hääldus ja kohanimed, ~1 s lause kohta.
// ElevenLabs on ainult varu: selle kontol on ainult inglise aktsendiga hääled ja tasuta pakett on 10 000 märki kuus.
// 501/502 = klient kasutab brauseri häält.
import { z } from 'zod';

export const maxDuration = 30;
// Kõnesüntees asub Eestis: jooksuta seda marsruuti Põhjamaades (Stockholm, varuks Frankfurt), et heli jõuaks kiiremini.
export const preferredRegion = ['arn1', 'fra1'];

const Body = z.object({ text: z.string().min(1).max(600), emotion: z.enum(['calm', 'firm', 'urgent']).optional() });

/** Toon: kindlam ja tungivam hääl räägib veidi kiiremini (valjus lisandub brauseris). */
const SPEED = { calm: 1, firm: 1.08, urgent: 1.16 } as const;

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
  const emotion = parsed.data.emotion ?? 'calm';
  const provider = process.env.TTS_PROVIDER || 'tartunlp';
  if (provider === 'browser') return new Response('tts_not_configured', { status: 501 });

  const tartu = () =>
    timed(
      'https://api.tartunlp.ai/text-to-speech/v2',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text, speaker: process.env.TARTUNLP_SPEAKER || 'mari', speed: SPEED[emotion] }),
      },
      6000,
    ).then((res) => (res ? { res, type: res.headers.get('content-type') ?? 'audio/wav', name: 'tartunlp' } : null));

  const eleven = () =>
    process.env.ELEVENLABS_API_KEY
      ? timed(
          `https://api.elevenlabs.io/v1/text-to-speech/${process.env.ELEVENLABS_VOICE_ID || 'XrExE9yKIg1WjnnlVkGX'}/stream?output_format=mp3_44100_64`,
          {
            method: 'POST',
            headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY, 'content-type': 'application/json' },
            body: JSON.stringify({
              text,
              model_id: process.env.ELEVENLABS_TTS_MODEL || 'eleven_v3_conversational',
              language_code: 'et',
              voice_settings: { speed: SPEED[emotion], stability: emotion === 'calm' ? 0.6 : 0.4 },
            }),
          },
          8000,
        ).then((res) => (res ? { res, type: 'audio/mpeg', name: 'elevenlabs' } : null))
      : Promise.resolve(null);

  const order = provider === 'elevenlabs' ? [eleven, tartu] : [tartu, eleven];
  for (const attempt of order) {
    const out = await attempt();
    if (out) return new Response(out.res.body, { headers: { 'content-type': out.type, 'cache-control': 'no-store', 'x-tts': out.name } });
  }
  return new Response('tts_failed', { status: 502 });
}
