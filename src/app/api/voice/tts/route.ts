// HÄÄL. KNOWLEDGE.md 9.1: tekst -> eestikeelne kõne.
// Päring: POST { text } -> audio/wav. Pakkuja: TTS_PROVIDER = tartunlp (vaikimisi) | browser.
// TartuNLP avalik API (võtit pole vaja): POST https://api.tartunlp.ai/text-to-speech/v2 { text, speaker } -> audio/wav.
// 501 tähendab: klient kasutab brauseri speechSynthesis't.
import { z } from 'zod';

export const maxDuration = 30;

const Body = z.object({ text: z.string().min(1).max(600) });

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return new Response('bad_request', { status: 400 });
  if ((process.env.TTS_PROVIDER || 'tartunlp') !== 'tartunlp') return new Response('tts_not_configured', { status: 501 });

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch('https://api.tartunlp.ai/text-to-speech/v2', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text: parsed.data.text, speaker: process.env.TARTUNLP_SPEAKER || 'mari' }),
      signal: ctrl.signal,
    });
    if (!res.ok || !res.body) return new Response('tts_failed', { status: 502 });
    return new Response(res.body, {
      headers: { 'content-type': res.headers.get('content-type') ?? 'audio/wav', 'cache-control': 'no-store' },
    });
  } catch {
    return new Response('tts_failed', { status: 502 });
  } finally {
    clearTimeout(timer);
  }
}
