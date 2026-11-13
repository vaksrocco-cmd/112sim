// AJU (Ats, feat/brain). KNOWLEDGE.md 9.6 ja 10.3.
import type { AnalysisReport, CallSession, Scenario } from '../types';
import { scoreSession } from './scoring';

export async function analyzeSession(session: CallSession, scenario: Scenario): Promise<AnalysisReport> {
  // TODO(Ats): LLM (llmJson failist '@/lib/llm') kirjutab tõendid, missed, tips ja whatWouldHaveHappened (models.smart()).
  // Kood kirjutab punktid alati üle. LLM-i vea korral tagasta raport ilma tekstideta.
  const rubric = scoreSession(session, scenario);
  return {
    sessionId: session.id,
    score: rubric.reduce((s, r) => s + r.points, 0),
    outcome: 'good',
    times: { durationMs: session.durationMs },
    rubric,
    missed: [],
    tips: ['Analüüs ei ole veel valmis.', 'Proovi hiljem uuesti.', 'Vaata transkripti.'],
    whatWouldHaveHappened: '',
  };
}
