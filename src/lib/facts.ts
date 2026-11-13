// Integraatori fail. KNOWLEDGE.md 8 ja 9.2 (monotoonsus).
import type { CallFacts, CallMs, TriState } from './types';

export function emptyFacts(): CallFacts {
  return {
    incident: { said: false },
    location: { level: 'none', wrongParts: [] },
    patient: { ageSaid: false, conscious: 'unknown', breathing: 'unknown' },
    symptomsReported: [],
    changeReports: [],
    dialogue: { questionsAsked: 0, questionsAnswered: 0, contradictions: 0, offTopicTurns: 0 },
  };
}

const LEVEL = { none: 0, partial: 1, complete: 2 } as const;

function earliest(a?: CallMs, b?: CallMs): CallMs | undefined {
  if (a === undefined) return b;
  if (b === undefined) return a;
  return Math.min(a, b);
}

function tri(prev: TriState, next: TriState): TriState {
  // Seisund võib päriselt muutuda (teadvusel -> teadvuseta), seega uus teadmine võidab,
  // aga "unknown" ei kustuta varem teada olnut.
  return next === 'unknown' ? prev : next;
}

/**
 * Ühendab kohtuniku uue väljundi eelmisega nii, et kord öeldud fakt ei kao ja
 * esimese ütlemise aeg ei muutu hilisemaks.
 */
export function mergeFacts(prev: CallFacts, next: CallFacts): CallFacts {
  const incidentSaid = prev.incident.said || next.incident.said;
  const firstIncident = prev.incident.said ? prev.incident : next.incident;

  const prevLevel = LEVEL[prev.location.level];
  const nextLevel = LEVEL[next.location.level];
  const level = nextLevel > prevLevel ? next.location.level : prev.location.level;

  const symptoms = new Map<string, CallFacts['symptomsReported'][number]>();
  for (const s of [...prev.symptomsReported, ...next.symptomsReported]) {
    const cur = symptoms.get(s.symptom);
    if (!cur || s.atMs < cur.atMs) symptoms.set(s.symptom, s);
  }

  const reports = new Map<string, CallFacts['changeReports'][number]>();
  for (const r of [...prev.changeReports, ...next.changeReports]) {
    const cur = reports.get(r.stateId);
    if (!cur || r.atMs < cur.atMs) reports.set(r.stateId, r);
  }

  return {
    incident: {
      said: incidentSaid,
      atMs: earliest(prev.incident.atMs, next.incident.atMs),
      quote: firstIncident.quote ?? next.incident.quote,
      volunteered: prev.incident.volunteered ?? next.incident.volunteered,
    },
    location: {
      street: next.location.street ?? prev.location.street,
      house: next.location.house ?? prev.location.house,
      apartment: next.location.apartment ?? prev.location.apartment,
      settlement: next.location.settlement ?? prev.location.settlement,
      municipality: next.location.municipality ?? prev.location.municipality,
      level,
      partialAtMs: earliest(prev.location.partialAtMs, next.location.partialAtMs),
      completeAtMs: earliest(prev.location.completeAtMs, next.location.completeAtMs),
      wrongParts: level === 'complete' ? [] : next.location.wrongParts,
      volunteered: prev.location.volunteered ?? next.location.volunteered,
    },
    patient: {
      ageSaid: prev.patient.ageSaid || next.patient.ageSaid,
      conscious: tri(prev.patient.conscious, next.patient.conscious),
      breathing: tri(prev.patient.breathing, next.patient.breathing),
    },
    symptomsReported: [...symptoms.values()].sort((a, b) => a.atMs - b.atMs),
    changeReports: [...reports.values()].sort((a, b) => a.atMs - b.atMs),
    dialogue: {
      questionsAsked: Math.max(prev.dialogue.questionsAsked, next.dialogue.questionsAsked),
      questionsAnswered: Math.max(prev.dialogue.questionsAnswered, next.dialogue.questionsAnswered),
      contradictions: Math.max(prev.dialogue.contradictions, next.dialogue.contradictions),
      offTopicTurns: Math.max(prev.dialogue.offTopicTurns, next.dialogue.offTopicTurns),
    },
  };
}
