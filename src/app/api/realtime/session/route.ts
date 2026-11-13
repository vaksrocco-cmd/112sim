// HÄÄL (Sander, feat/voice). KNOWLEDGE.md 9.1: ajutine Realtime'i võti brauserile.
// Päris OPENAI_API_KEY ei lahku serverist. Päästekorraldaja EI tea tõde: kasutame avalikku stsenaariumi.
// Juhend: https://developers.openai.com/api/docs/guides/realtime-webrtc
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getPublicScenario } from '@/lib/scenarios';

const Body = z.object({ scenarioId: z.string() });

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  const scenario = getPublicScenario(parsed.data.scenarioId);
  if (!scenario) return NextResponse.json({ error: 'unknown_scenario' }, { status: 400 });
  const key = process.env.OPENAI_API_KEY;
  if (!key) return NextResponse.json({ error: 'OPENAI_API_KEY puudub' }, { status: 500 });

  const model = process.env.REALTIME_MODEL ?? 'gpt-realtime-2.1';
  const voice = process.env.REALTIME_VOICE ?? 'marin';

  // TODO(Sander): lisa sessiooni seadistusse dokumentatsiooni järgi (väljade nimed juhendist, mitte mälust):
  //  - juhised: loadPrompt('dispatcher', { dispatcherWhitelist }) failist '@/lib/agents/prompts'
  //  - tööriistad dispatch_ambulance ja end_call (sama kuju mis /api/voice/turn TOOLS)
  //  - helistaja kõne transkriptsioon keelega 'et' ja kõnetuvastus (VAD)
  //  - soovi korral päis OpenAI-Safety-Identifier (anonüümne, mitte isikuandmed)
  const res = await fetch('https://api.openai.com/v1/realtime/client_secrets', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ session: { type: 'realtime', model, audio: { output: { voice } } } }),
    cache: 'no-store',
  });
  if (!res.ok) {
    console.error('[realtime/session]', res.status, (await res.text().catch(() => '')).slice(0, 300));
    return NextResponse.json({ error: 'realtime_session_failed' }, { status: 502 });
  }
  const data = (await res.json()) as { value?: string };
  if (!data.value) return NextResponse.json({ error: 'realtime_session_failed' }, { status: 502 });
  return NextResponse.json({ ephemeralKey: data.value, model });
}
