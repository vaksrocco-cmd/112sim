// HÄÄL. Päästekorraldaja üks voor, versioon 2: mudel mõistab helistaja lauset, KOOD otsustab vastuse (lib/dispatcher/policy.ts).
// Päring:  POST { scenarioId, state?, lastDispatcherLine?, callerText?, cue?, idle? }
// Vastus:  NDJSON: {"type":"tool",...} | {"type":"text","delta":"[rahulik] ..."} | {"type":"state","state":{...}} | {"type":"done"}
// Päästekorraldaja EI tea tõde: kasutame ainult avalikku stsenaariumi ja selle lubatud juhiste loendit.
import { z } from 'zod';
import { emptyCallState, nextMove, NO_UNDERSTANDING, type CallState } from '@/lib/dispatcher/policy';
import { understand } from '@/lib/dispatcher/understand';
import { getPublicScenario } from '@/lib/scenarios';

export const maxDuration = 30;

const Body = z.object({
  scenarioId: z.string(),
  state: z.record(z.unknown()).optional(),
  lastDispatcherLine: z.string().max(600).optional(),
  callerText: z.string().max(1200).optional(),
  /** Süsteemi märguanne (kiirabi jõudis kohale): kõne lõpetatakse. */
  cue: z.boolean().optional(),
  /** Helistaja vaikib: päästekorraldaja võtab ise jutujärje. */
  idle: z.boolean().optional(),
  /** Lühike demo (umbes 30 s): mis juhtus -> kus -> millal -> mida teha. */
  short: z.boolean().optional(),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return new Response('bad_request', { status: 400 });
  const scenario = getPublicScenario(parsed.data.scenarioId);
  if (!scenario) return new Response('unknown_scenario', { status: 400 });

  const state: CallState = { ...emptyCallState(), ...(parsed.data.state as Partial<CallState> | undefined) };
  const { cue, idle, short, callerText, lastDispatcherLine } = parsed.data;
  const u = cue || idle || !callerText?.trim() ? NO_UNDERSTANDING : await understand({ state, lastDispatcherLine: lastDispatcherLine ?? '', callerText });
  const move = nextMove(state, u, { whitelist: scenario.dispatcherWhitelist, cue, idle, short });

  const lines: unknown[] = [];
  if (move.dispatch) lines.push({ type: 'tool', name: 'dispatch_ambulance', input: { priority: 'A', address: move.dispatch.address, summary: move.dispatch.summary } });
  lines.push({ type: 'text', delta: `[${move.emotion}] ${move.say}` });
  if (move.endCall) lines.push({ type: 'tool', name: 'end_call', input: {} });
  lines.push({ type: 'state', state: move.state, understood: u });
  lines.push({ type: 'done' });
  return new Response(lines.map((l) => JSON.stringify(l)).join('\n') + '\n', {
    headers: { 'content-type': 'application/x-ndjson; charset=utf-8', 'cache-control': 'no-store' },
  });
}
