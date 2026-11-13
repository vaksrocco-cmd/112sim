// AJU (Ats, feat/brain). KNOWLEDGE.md 9.2 ja 10.2.
import type { CallFacts, Scenario, StateVisit, TranscriptSegment } from '../types';

export interface ExtractInput {
  scenario: Scenario;
  transcript: TranscriptSegment[];
  prevFacts: CallFacts;
  stateHistory: StateVisit[];
}

export async function extractFacts(input: ExtractInput): Promise<CallFacts> {
  // TODO(Ats): Claude (lib/llm/claude.ts claudeJson, models.fast()) + mergeFacts + koodi järelkontroll.
  return input.prevFacts;
}
