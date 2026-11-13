import { describe, expect, it } from 'vitest';
import { emptyFacts, mergeFacts } from './facts';

describe('mergeFacts', () => {
  it('keeps a fact once it was true and keeps the earliest time', () => {
    const a = emptyFacts();
    a.incident = { said: true, atMs: 3000, quote: 'vanaema räägib segaselt' };
    const b = emptyFacts();
    b.incident = { said: false };
    const m = mergeFacts(a, b);
    expect(m.incident.said).toBe(true);
    expect(m.incident.atMs).toBe(3000);
    expect(m.incident.quote).toBe('vanaema räägib segaselt');
  });

  it('never lowers the location level and keeps the earliest complete time', () => {
    const a = emptyFacts();
    a.location = { level: 'complete', completeAtMs: 11500, wrongParts: [] };
    const b = emptyFacts();
    b.location = { level: 'partial', partialAtMs: 9000, completeAtMs: 20000, wrongParts: ['house'] };
    const m = mergeFacts(a, b);
    expect(m.location.level).toBe('complete');
    expect(m.location.completeAtMs).toBe(11500);
    expect(m.location.partialAtMs).toBe(9000);
    expect(m.location.wrongParts).toEqual([]);
  });

  it('unions symptoms and change reports by id with earliest time', () => {
    const a = emptyFacts();
    a.symptomsReported = [{ symptom: 'speech_problem', atMs: 3000, quote: 'x' }];
    a.changeReports = [{ stateId: 'S2', atMs: 52000, quote: 'y' }];
    const b = emptyFacts();
    b.symptomsReported = [
      { symptom: 'speech_problem', atMs: 8000, quote: 'z' },
      { symptom: 'face_droop', atMs: 52000, quote: 'w' },
    ];
    b.changeReports = [{ stateId: 'S2', atMs: 60000, quote: 'v' }];
    const m = mergeFacts(a, b);
    expect(m.symptomsReported.map((s) => [s.symptom, s.atMs])).toEqual([
      ['speech_problem', 3000],
      ['face_droop', 52000],
    ]);
    expect(m.changeReports).toEqual([{ stateId: 'S2', atMs: 52000, quote: 'y' }]);
  });

  it('lets a known vital sign change but not be erased by unknown', () => {
    const a = emptyFacts();
    a.patient.conscious = 'yes';
    const b = emptyFacts();
    expect(mergeFacts(a, b).patient.conscious).toBe('yes');
    b.patient.conscious = 'no';
    expect(mergeFacts(a, b).patient.conscious).toBe('no');
  });
});
