// AJU (Ats, feat/brain). KNOWLEDGE.md 9.2 ja 10.2: kohtunik.
// LLM (OpenAI kiire mudel) täidab CallFacts; kood kontrollib tsitaadid, ajad ja monotoonsuse.
import { mergeFacts } from '../facts';
import { llmJson } from '../llm';
import type { CallFacts, Scenario, StateVisit, TranscriptSegment, TriState } from '../types';
import { loadPrompt } from './prompts';
import { snapToCaller, verifiedQuote } from './text';

export interface ExtractInput {
  scenario: Scenario;
  transcript: TranscriptSegment[];
  prevFacts: CallFacts;
  stateHistory: StateVisit[];
}

const nullable = (type: string) => ({ type: [type, 'null'] });
const obj = (properties: Record<string, unknown>) => ({
  type: 'object',
  properties,
  required: Object.keys(properties),
  additionalProperties: false,
});

/** Range skeem: kõik väljad kohustuslikud, valikulised nullitavad (OpenAI range režiim). */
export const FACTS_SCHEMA = obj({
  incident: obj({ said: { type: 'boolean' }, atMs: nullable('number'), quote: nullable('string'), volunteered: nullable('boolean') }),
  location: obj({
    street: nullable('string'),
    house: nullable('string'),
    apartment: nullable('string'),
    settlement: nullable('string'),
    municipality: nullable('string'),
    level: { type: 'string', enum: ['none', 'partial', 'complete'] },
    partialAtMs: nullable('number'),
    completeAtMs: nullable('number'),
    wrongParts: { type: 'array', items: { type: 'string', enum: ['street', 'house', 'settlement'] } },
    volunteered: nullable('boolean'),
  }),
  patient: obj({
    ageSaid: { type: 'boolean' },
    conscious: { type: 'string', enum: ['yes', 'no', 'unknown'] },
    breathing: { type: 'string', enum: ['yes', 'no', 'unknown'] },
  }),
  symptomsReported: { type: 'array', items: obj({ symptom: { type: 'string' }, atMs: { type: 'number' }, quote: { type: 'string' } }) },
  changeReports: { type: 'array', items: obj({ stateId: { type: 'string' }, atMs: { type: 'number' }, quote: { type: 'string' } }) },
  dialogue: obj({
    questionsAsked: { type: 'number' },
    questionsAnswered: { type: 'number' },
    contradictions: { type: 'number' },
    offTopicTurns: { type: 'number' },
  }),
});

type Nullable<T> = { [K in keyof T]: T[K] | null };
interface RawFacts {
  incident: Nullable<Required<CallFacts['incident']>>;
  location: Nullable<Required<CallFacts['location']>>;
  patient: { ageSaid: boolean; conscious: TriState; breathing: TriState };
  symptomsReported: { symptom: string; atMs: number; quote: string }[];
  changeReports: { stateId: string; atMs: number; quote: string }[];
  dialogue: CallFacts['dialogue'];
}

const count = (n: unknown) => (typeof n === 'number' && Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0);

/** Koodi järelkontroll: tsitaat peab olema transkriptis, aeg helistaja lause alguses, id-d stsenaariumist. */
export function sanitizeFacts(raw: RawFacts, input: ExtractInput): CallFacts {
  const { transcript, scenario, stateHistory } = input;
  const symptomIds = new Set(scenario.symptoms.map((s) => s.id));
  const level = raw.location.level ?? 'none';

  return {
    incident: {
      said: Boolean(raw.incident.said),
      atMs: raw.incident.said ? snapToCaller(raw.incident.atMs, transcript) : undefined,
      quote: verifiedQuote(raw.incident.quote, transcript),
      volunteered: raw.incident.volunteered ?? undefined,
    },
    location: {
      street: raw.location.street ?? undefined,
      house: raw.location.house ?? undefined,
      apartment: raw.location.apartment ?? undefined,
      settlement: raw.location.settlement ?? undefined,
      municipality: raw.location.municipality ?? undefined,
      level,
      partialAtMs: level === 'none' ? undefined : snapToCaller(raw.location.partialAtMs ?? raw.location.completeAtMs, transcript),
      completeAtMs: level === 'complete' ? snapToCaller(raw.location.completeAtMs, transcript) : undefined,
      wrongParts: raw.location.wrongParts ?? [],
      volunteered: raw.location.volunteered ?? undefined,
    },
    patient: raw.patient,
    symptomsReported: raw.symptomsReported
      .filter((s) => symptomIds.has(s.symptom))
      .map((s) => ({ symptom: s.symptom, atMs: snapToCaller(s.atMs, transcript) ?? 0, quote: verifiedQuote(s.quote, transcript) ?? '' })),
    changeReports: raw.changeReports.flatMap((r) => {
      const visit = stateHistory.find((v) => v.stateId === r.stateId);
      const state = scenario.states.find((s) => s.id === r.stateId);
      const atMs = snapToCaller(r.atMs, transcript);
      // Teade loeb ainult siis, kui seisund on päriselt alanud ja lause öeldi pärast seda (lause lõpp > seisundi algus).
      const seg = transcript.find((s) => s.speaker === 'caller' && s.startMs === atMs);
      if (!visit || !state?.requiresReport || atMs === undefined || !seg || seg.endMs <= visit.enteredAtMs) return [];
      return [{ stateId: r.stateId, atMs: Math.max(atMs, visit.enteredAtMs), quote: verifiedQuote(r.quote, transcript) ?? '' }];
    }),
    dialogue: {
      questionsAsked: count(raw.dialogue.questionsAsked),
      questionsAnswered: count(raw.dialogue.questionsAnswered),
      contradictions: count(raw.dialogue.contradictions),
      offTopicTurns: count(raw.dialogue.offTopicTurns),
    },
  };
}

export function buildExtractMessage({ scenario, transcript, prevFacts, stateHistory }: ExtractInput): string {
  const truth = {
    patsient: scenario.truth.patient,
    aadress: scenario.truth.address,
    sümptomiteSõnastik: scenario.symptoms,
    seisundid: scenario.states
      .filter((s) => s.kind === 'loop')
      .map((s) => ({ id: s.id, kirjeldus: s.caption, observable: s.observable, vitals: s.vitals, requiresReport: s.requiresReport })),
  };
  const lines = [...transcript]
    .sort((a, b) => a.startMs - b.startMs)
    .map((s) => `[${s.startMs}–${s.endMs}] ${s.speaker}: ${s.text}`)
    .join('\n');
  return [
    `TÕDE\n${JSON.stringify(truth)}`,
    `SEISUNDITE AJALUGU\n${JSON.stringify(stateHistory)}`,
    `TRANSKRIPT\n${lines || '(tühi)'}`,
    `EELMISED FAKTID\n${JSON.stringify(prevFacts)}`,
  ].join('\n\n');
}

export async function extractFacts(input: ExtractInput): Promise<CallFacts> {
  if (!input.transcript.some((s) => s.speaker === 'caller')) return input.prevFacts;
  const raw = await llmJson<RawFacts>({
    tier: 'fast',
    system: loadPrompt('extractor'),
    messages: [{ role: 'user', content: buildExtractMessage(input) }],
    schema: FACTS_SCHEMA,
    schemaName: 'call_facts',
    effort: 'low',
    maxTokens: 4096,
    timeoutMs: 8000,
  });
  return mergeFacts(input.prevFacts, sanitizeFacts(raw, input));
}
