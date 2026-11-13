// AJU (Ats, feat/brain). KNOWLEDGE.md 9.2: kohtunik. Tõde jääb serverisse.
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { extractFacts } from '@/lib/agents/extract';
import { getScenario } from '@/lib/scenarios';
import type { CallFacts, StateVisit, TranscriptSegment } from '@/lib/types';

const Body = z.object({
  scenarioId: z.string(),
  transcript: z.array(z.object({ id: z.string(), speaker: z.enum(['caller', 'dispatcher']), text: z.string(), startMs: z.number(), endMs: z.number() })),
  prevFacts: z.record(z.unknown()),
  stateHistory: z.array(z.object({ stateId: z.string(), enteredAtMs: z.number() })),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  const scenario = getScenario(parsed.data.scenarioId);
  if (!scenario) return NextResponse.json({ error: 'unknown_scenario' }, { status: 400 });
  const prevFacts = parsed.data.prevFacts as unknown as CallFacts;
  try {
    const facts = await extractFacts({
      scenario,
      transcript: parsed.data.transcript as TranscriptSegment[],
      prevFacts,
      stateHistory: parsed.data.stateHistory as StateVisit[],
    });
    return NextResponse.json({ facts });
  } catch (e) {
    // Kohtuniku viga ei tohi kõnet katkestada: tagasta eelmised faktid.
    console.error('[extract]', e);
    return NextResponse.json({ facts: prevFacts, degraded: true });
  }
}
