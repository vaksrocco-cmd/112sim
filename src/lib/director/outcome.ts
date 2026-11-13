// AJU (Ats, feat/brain). KNOWLEDGE.md 9.3 tulemuse tabel. Puhas funktsioon.
import type { CallEvent, CallFacts, CallMs, Outcome, PublicScenario, StateVisit } from '../types';

export type OutcomeReason = 'no_dispatch' | 'location_incomplete' | 'change_unreported' | 'location_late';

export interface OutcomeResult {
  outcome: Outcome;
  reasons: OutcomeReason[];
}

/** Seisundite külastused sündmustest (esimene korduv seisund algab hetkel 0). */
export function visitsFromEvents(events: CallEvent[], scenario: PublicScenario): StateVisit[] {
  const first = scenario.states.find((s) => s.kind === 'loop') ?? scenario.states[0];
  const visits: StateVisit[] = [{ stateId: first.id, enteredAtMs: 0 }];
  for (const e of events) if (e.type === 'state_changed') visits.push({ stateId: e.to, enteredAtMs: e.atMs });
  return visits;
}

export function computeOutcome(
  facts: CallFacts,
  events: CallEvent[],
  scenario: PublicScenario,
  nowMs: CallMs,
): OutcomeResult {
  const reasons: OutcomeReason[] = [];
  if (!events.some((e) => e.type === 'ambulance_dispatched')) reasons.push('no_dispatch');
  if (facts.location.level !== 'complete') reasons.push('location_incomplete');
  if (reasons.length) return { outcome: 'bad', reasons };

  const unreported = visitsFromEvents(events, scenario).some((v) => {
    const state = scenario.states.find((s) => s.id === v.stateId);
    if (!state?.requiresReport) return false;
    const window = state.reportWindowMs ?? 0;
    const report = facts.changeReports.find((r) => r.stateId === v.stateId);
    return report ? report.atMs - v.enteredAtMs > window : nowMs - v.enteredAtMs >= window;
  });
  if (unreported) reasons.push('change_unreported');
  if ((facts.location.completeAtMs ?? 0) > scenario.rules.addressDeadlineMs) reasons.push('location_late');
  return { outcome: reasons.length ? 'delayed' : 'good', reasons };
}
