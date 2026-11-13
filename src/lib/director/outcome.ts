// AJU (Ats, feat/brain). KNOWLEDGE.md 9.3 tulemuse tabel.
import type { CallEvent, CallFacts, CallMs, Outcome, PublicScenario } from '../types';

export type OutcomeReason = 'no_dispatch' | 'location_incomplete' | 'change_unreported' | 'location_late';

export interface OutcomeResult {
  outcome: Outcome;
  reasons: OutcomeReason[];
}

export function computeOutcome(
  _facts: CallFacts,
  _events: CallEvent[],
  _scenario: PublicScenario,
  _nowMs: CallMs,
): OutcomeResult {
  // TODO(Ats)
  return { outcome: 'good', reasons: [] };
}
