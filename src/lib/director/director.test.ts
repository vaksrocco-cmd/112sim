import { describe, expect, it } from 'vitest';
import goodCall from '@fixtures/transcripts/good_call.json';
import { analyzeSession } from '../agents/analyze';
import { buildSteps } from '../agents/feedback';
import { scoreSession, totalScore } from '../agents/scoring';
import { emptyFacts } from '../facts';
import { getPublicScenario, getScenario } from '../scenarios';
import type { CallEvent, CallFacts, CallSession, TranscriptFixture } from '../types';
import { directorStep } from './director';
import { computeOutcome } from './outcome';

const scenario = getPublicScenario('vanaema-insult')!;
const fixture = goodCall as unknown as TranscriptFixture;

const goodFacts = (): CallFacts => ({
  incident: { said: true, atMs: 3000, quote: 'mu vanaema hakkas äkki segaselt rääkima' },
  location: { street: 'Männikäbi tee', house: '14', settlement: 'Haabneeme', level: 'complete', partialAtMs: 5000, completeAtMs: 5000, wrongParts: [] },
  patient: { ageSaid: true, conscious: 'yes', breathing: 'yes' },
  symptomsReported: [
    { symptom: 'speech_problem', atMs: 3000, quote: 'ta ei leia sõnu' },
    { symptom: 'face_droop', atMs: 11000, quote: 'suunurk vajus viltu' },
  ],
  changeReports: [{ stateId: 'S2', atMs: 11000, quote: 'nüüd ta suunurk vajus viltu' }],
  dialogue: { questionsAsked: 5, questionsAnswered: 5, contradictions: 0, offTopicTurns: 0 },
});

const started: CallEvent = { type: 'call_started', atMs: 0 };
const dispatched: CallEvent = { type: 'ambulance_dispatched', atMs: 9000, priority: 'A', address: 'Männikäbi tee 14', summary: '' };
const toS2: CallEvent = { type: 'state_changed', atMs: 4000, from: 'S1', to: 'S2', reason: '' };

const step = (nowMs: number, stateId: string, stateEnteredAtMs: number, facts: CallFacts, events: CallEvent[]) =>
  directorStep({ nowMs, scenario, stateId, stateEnteredAtMs, facts, events });

describe('directorStep', () => {
  it('moves S1 to S2 exactly at 4 s', () => {
    expect(step(3999, 'S1', 0, emptyFacts(), [started])).toEqual([]);
    expect(step(4000, 'S1', 0, emptyFacts(), [started])[0]).toMatchObject({ type: 'transition', to: 'S2' });
  });

  it('moves S2 to S3 when the change is not reported within the window', () => {
    const facts = { ...goodFacts(), changeReports: [] };
    expect(step(23999, 'S2', 4000, facts, [started, dispatched, toS2])).toEqual([]);
    expect(step(24000, 'S2', 4000, facts, [started, dispatched, toS2])[0]).toMatchObject({ type: 'transition', to: 'S3' });
  });

  it('asks the dispatcher to wrap up once help has arrived and the change is reported', () => {
    expect(step(18000, 'S2', 4000, goodFacts(), [started, dispatched, toS2])).toEqual([]);
    expect(step(19000, 'S2', 4000, goodFacts(), [started, dispatched, toS2])[0]).toMatchObject({ type: 'wrap_up' });
  });

  it('finishes with a good outcome after a good call and returns nothing in an ending state', () => {
    const events: CallEvent[] = [started, dispatched, toS2, { type: 'call_ended', atMs: 31000, reason: 'dispatcher_ended' }];
    expect(step(31000, 'S2', 4000, goodFacts(), events)).toEqual([{ type: 'finish', outcome: 'good', endingText: '' }]);
    expect(step(31000, 'END_GOOD', 31000, goodFacts(), events)).toEqual([]);
  });
});

describe('computeOutcome', () => {
  it('is bad without dispatch or without a complete address', () => {
    expect(computeOutcome(goodFacts(), [started], scenario, 20000).reasons).toEqual(['no_dispatch']);
    const partial = { ...goodFacts(), location: { ...goodFacts().location, level: 'partial' as const } };
    expect(computeOutcome(partial, [started, dispatched], scenario, 35000).outcome).toBe('bad');
  });

  it('is delayed when the change was not reported in time', () => {
    const facts = { ...goodFacts(), changeReports: [] };
    expect(computeOutcome(facts, [started, dispatched, toS2], scenario, 35000)).toEqual({ outcome: 'delayed', reasons: ['change_unreported'] });
  });
});

describe('scoring', () => {
  const session = (facts: CallFacts, events: CallEvent[]): CallSession => ({
    id: 't',
    scenarioId: scenario.id,
    scenarioVersion: 1,
    createdAt: '2026-11-13T00:00:00Z',
    durationMs: 31000,
    transcript: fixture.segments.map((s, i) => ({ ...s, id: String(i) })),
    events,
    stateHistory: [{ stateId: 'S1', enteredAtMs: 0 }, { stateId: 'S2', enteredAtMs: 4000 }],
    finalFacts: facts,
  });
  const ended: CallEvent = { type: 'call_ended', atMs: 31000, reason: 'dispatcher_ended' };

  it('gives the good call 100 points', () => {
    const rubric = scoreSession(session(goodFacts(), [started, dispatched, toS2, ended]), scenario);
    expect(rubric.reduce((s, r) => s + r.points, 0)).toBe(fixture.expect?.score);
  });

  it('gives 8 for a partial address and 0 for hanging up before dispatch', () => {
    const facts = { ...goodFacts(), location: { ...goodFacts().location, level: 'partial' as const, completeAtMs: undefined } };
    const rubric = scoreSession(session(facts, [started, { type: 'call_ended', atMs: 20000, reason: 'caller_hangup' }]), scenario);
    expect(rubric.find((r) => r.id === 'location')?.points).toBe(8);
    expect(rubric.find((r) => r.id === 'ending')?.points).toBe(0);
  });

  it('gives a silent call 0 points and marks unrated rows instead of full marks', () => {
    const silent: CallSession = {
      ...session(emptyFacts(), [started, toS2, { type: 'call_ended', atMs: 40000, reason: 'timeout' }]),
      durationMs: 40000,
      transcript: [{ id: '0', speaker: 'dispatcher', text: 'Häirekeskus, tere. Mis juhtus?', startMs: 0, endMs: 2000 }],
    };
    const rubric = scoreSession(silent, scenario);
    expect(rubric.find((r) => r.id === 'answers')?.points).toBe(0);
    expect(rubric.find((r) => r.id === 'clarity')).toMatchObject({ points: 0, notApplicable: true });
    expect(totalScore(rubric)).toBe(0);
    expect(buildSteps(silent, scenario).map((s) => s.status)).toEqual(['missing', 'missing', 'missing', 'missing', 'missing', 'missing']);
  });

  it('orders feedback as where, what, who, condition, when, change', () => {
    const steps = buildSteps(session(goodFacts(), [started, dispatched, toS2, ended]), scenario);
    expect(steps.map((s) => s.id)).toEqual(['where', 'what', 'who', 'condition', 'when', 'change']);
    expect(steps.find((s) => s.id === 'where')?.status).toBe('said');
  });

  it('still returns a full report when no LLM key is configured', async () => {
    const report = await analyzeSession(session(goodFacts(), [started, dispatched, toS2, ended]), getScenario('vanaema-insult')!);
    expect(report.score).toBe(100);
    expect(report.outcome).toBe('good');
    expect(report.tips).toHaveLength(3);
    expect(report.times.changeReactionMs).toBe(7000);
  });
});
