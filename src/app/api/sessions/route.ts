// Integraatori fail. Salvestab lõppenud kõne.
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createSession } from '@/lib/db/sessions';
import { getScenario } from '@/lib/scenarios';
import type { CallSession } from '@/lib/types';

const Body = z.object({
  scenarioId: z.string(),
  scenarioVersion: z.number(),
  durationMs: z.number().nonnegative(),
  transcript: z.array(z.object({ id: z.string(), speaker: z.enum(['caller', 'dispatcher']), text: z.string(), startMs: z.number(), endMs: z.number() })),
  events: z.array(z.object({ type: z.string(), atMs: z.number() }).passthrough()),
  stateHistory: z.array(z.object({ stateId: z.string(), enteredAtMs: z.number() })),
  finalFacts: z.record(z.unknown()),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'bad_request', issues: parsed.error.issues }, { status: 400 });
  if (!getScenario(parsed.data.scenarioId)) return NextResponse.json({ error: 'unknown_scenario' }, { status: 400 });
  const s = await createSession(parsed.data as unknown as Omit<CallSession, 'id' | 'createdAt'>);
  return NextResponse.json({ id: s.id });
}
