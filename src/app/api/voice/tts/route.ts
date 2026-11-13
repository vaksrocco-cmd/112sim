// HÄÄL (Sander, feat/voice). KNOWLEDGE.md 9.1: tekst -> eestikeelne kõne.
// Päring: POST { text } -> vastus: audio (audio/wav või audio/mpeg).
// TODO(Sander): vali pakkuja (TartuNLP / ElevenLabs) ja võta API kuju DOKUMENTATSIOONIST, mitte mälust (CLAUDE.md reegel 10).
//               Võtmed ainult serveris (TTS_PROVIDER, ELEVENLABS_API_KEY ...). Kuni see puudub, kasutab klient brauseri speechSynthesis't.
import { z } from 'zod';

const Body = z.object({ text: z.string().min(1).max(600) });

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return new Response('bad_request', { status: 400 });
  return new Response('tts_not_configured', { status: 501 });
}
