// AJU (Ats, feat/brain). KNOWLEDGE.md 9.6: punktid arvutab kood.
import type { CallSession, PublicScenario, RubricItemResult } from '../types';

export const RUBRIC: { id: RubricItemResult['id']; label: string; maxPoints: number }[] = [
  { id: 'incident', label: 'Ütles, mis juhtus', maxPoints: 20 },
  { id: 'location', label: 'Täpne asukoht', maxPoints: 25 },
  { id: 'patient', label: 'Abivajaja seisund', maxPoints: 15 },
  { id: 'change', label: 'Teatas muutusest', maxPoints: 15 },
  { id: 'answers', label: 'Vastas küsimustele', maxPoints: 10 },
  { id: 'clarity', label: 'Selgus', maxPoints: 10 },
  { id: 'ending', label: 'Jäi liinile kuni loani', maxPoints: 5 },
];

export function scoreSession(_session: CallSession, _scenario: PublicScenario): RubricItemResult[] {
  // TODO(Ats): reeglid KNOWLEDGE.md 9.6 tabelist.
  return RUBRIC.map((r) => ({ ...r, points: 0, why: 'Hindamine ei ole veel valmis.' }));
}
