import { describe, expect, it } from 'vitest';
import { getPublicScenario, getScenario, listScenarioIds } from './index';

describe('scenarios', () => {
  it('public scenario never contains truth', () => {
    for (const id of listScenarioIds()) {
      const pub = getPublicScenario(id)!;
      expect(pub).toBeDefined();
      expect('truth' in pub).toBe(false);
      expect(JSON.stringify(pub)).not.toContain('"truth"');
    }
  });

  it('every transition and reportable state is consistent', () => {
    for (const id of listScenarioIds()) {
      const s = getScenario(id)!;
      const ids = new Set(s.states.map((x) => x.id));
      for (const t of s.transitions) {
        expect(ids.has(t.from)).toBe(true);
        expect(ids.has(t.to)).toBe(true);
      }
      for (const st of s.states) {
        if (st.requiresReport) expect(st.reportWindowMs).toBeGreaterThan(0);
        for (const o of st.observable) expect(s.symptoms.some((x) => x.id === o)).toBe(true);
      }
    }
  });
});
