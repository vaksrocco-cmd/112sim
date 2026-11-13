// AJU (Ats, feat/brain). KNOWLEDGE.md 9.3. Puhas deterministlik funktsioon: ei võrku, ei kella, ei juhuslikkust.
import type { Condition, DirectorAction, DirectorInput } from '../types';
import { buildEndingText } from './endings';
import { computeOutcome } from './outcome';

export function directorStep(i: DirectorInput): DirectorAction[] {
  const { nowMs, scenario, stateId, stateEnteredAtMs, facts, events } = i;
  const { rules } = scenario;
  const state = scenario.states.find((s) => s.id === stateId);
  if (!state || state.kind === 'ending') return [];

  const ended = events.find((e) => e.type === 'call_ended');
  const dispatch = events.find((e) => e.type === 'ambulance_dispatched');
  const wrapUp = events.find((e) => e.type === 'wrap_up_requested');

  // 1) Lõpp
  if (ended || nowMs >= rules.maxCallMs || (wrapUp && nowMs - wrapUp.atMs >= rules.wrapUpGraceMs)) {
    const o = computeOutcome(facts, events, scenario, nowMs);
    return [{ type: 'finish', outcome: o.outcome, endingText: buildEndingText(o) }];
  }

  // 2) Seisundi üleminek (esimene sobiv võidab)
  const reported = facts.changeReports.some((r) => r.stateId === stateId);
  const windowOver = state.requiresReport && nowMs - stateEnteredAtMs >= (state.reportWindowMs ?? 0);
  const holds = (c: Condition) =>
    c.type === 'call_elapsed'
      ? nowMs >= c.ms
      : c.type === 'change_unreported'
        ? windowOver && !reported
        : nowMs >= c.ms && facts.location.level !== 'complete';
  for (const t of scenario.transitions) {
    if (t.from === stateId && t.when.some(holds)) return [{ type: 'transition', to: t.to, reason: t.reason }];
  }

  // 3) Kõne lõpetamise märguanne päästekorraldajale
  const windowOpen = state.requiresReport && !reported && !windowOver;
  if (dispatch && !wrapUp && !windowOpen && nowMs - dispatch.atMs >= rules.arrivalAfterDispatchMs) {
    return [{ type: 'wrap_up', cue: rules.wrapUpCue }];
  }
  return [];
}
