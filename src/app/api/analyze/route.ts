// AJU (Ats, feat/brain). KNOWLEDGE.md 9.6: analüüs. Punktid arvutab kood.
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { analyzeSession } from '@/lib/agents/analyze';
import { getSession, saveAnalysis } from '@/lib/db/sessions';
import { getScenario } from '@/lib/scenarios';

export const maxDuration = 60;

const Body = z.object({ sessionId: z.string(), quick: z.boolean().optional() });

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  const session = await getSession(parsed.data.sessionId);
  if (!session) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  const scenario = getScenario(session.scenarioId);
  if (!scenario) return NextResponse.json({ error: 'unknown_scenario' }, { status: 400 });
  const report = await analyzeSession(session, scenario, { quick: parsed.data.quick });
  await saveAnalysis(session.id, report);
  return NextResponse.json(report);
}
