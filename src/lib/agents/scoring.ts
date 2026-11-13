// AJU (Ats, feat/brain). KNOWLEDGE.md 9.6: punktid arvutab kood, mitte LLM.
import type { AnalysisReport, CallSession, PublicScenario, RubricItemResult } from '../types';

export const RUBRIC: { id: RubricItemResult['id']; label: string; maxPoints: number }[] = [
  { id: 'incident', label: 'Ütles, mis juhtus', maxPoints: 20 },
  { id: 'location', label: 'Täpne asukoht', maxPoints: 25 },
  { id: 'patient', label: 'Abivajaja seisund', maxPoints: 15 },
  { id: 'change', label: 'Teatas muutusest', maxPoints: 15 },
  { id: 'answers', label: 'Vastas küsimustele', maxPoints: 10 },
  { id: 'clarity', label: 'Selgus', maxPoints: 10 },
  { id: 'ending', label: 'Jäi liinile kuni loani', maxPoints: 5 },
];

const sec = (ms: number) => `${Math.round(ms / 1000)} s`;

/** Esimese teatamist nõudva seisundi külastus ja reaktsiooniaeg (ms) või null, kui ei teatatud. */
export function firstChange(session: CallSession, scenario: PublicScenario) {
  for (const v of session.stateHistory) {
    const state = scenario.states.find((s) => s.id === v.stateId);
    if (!state?.requiresReport) continue;
    const report = session.finalFacts.changeReports.find((r) => r.stateId === v.stateId);
    return {
      visit: v,
      windowMs: state.reportWindowMs ?? 0,
      report,
      reactionMs: report ? Math.max(0, report.atMs - v.enteredAtMs) : null,
    };
  }
  return null;
}

export function computeTimes(session: CallSession, scenario: PublicScenario): AnalysisReport['times'] {
  const f = session.finalFacts;
  return {
    incidentMs: f.incident.said ? f.incident.atMs : undefined,
    locationMs: f.location.level === 'complete' ? f.location.completeAtMs : undefined,
    changeReactionMs: firstChange(session, scenario)?.reactionMs ?? undefined,
    durationMs: session.durationMs,
  };
}

export function scoreSession(session: CallSession, scenario: PublicScenario): RubricItemResult[] {
  const f = session.finalFacts;
  const row = (id: RubricItemResult['id'], points: number, why: string, extra: Partial<RubricItemResult> = {}) => {
    const def = RUBRIC.find((r) => r.id === id)!;
    return { ...def, points: Math.max(0, Math.min(def.maxPoints, points)), why, ...extra };
  };

  // incident
  const iAt = f.incident.atMs ?? Infinity;
  const incident = !f.incident.said
    ? row('incident', 0, 'Sa ei öelnud selgelt, mis juhtus.')
    : row('incident', iAt <= 15000 ? 20 : iAt <= 30000 ? 15 : 10, `Ütlesid, mis juhtus, ${sec(iAt)} pärast kõne algust.`, {
        atMs: f.incident.atMs,
        evidence: f.incident.quote,
      });

  // location
  const cAt = f.location.completeAtMs ?? Infinity;
  const location =
    f.location.level === 'complete'
      ? row(
          'location',
          15 + (cAt <= 30000 ? 10 : cAt <= 60000 ? 6 : cAt <= 120000 ? 3 : 0),
          Number.isFinite(cAt) ? `Täielik aadress oli teada ${sec(cAt)} pärast kõne algust.` : 'Aadress oli täielik.',
          { atMs: f.location.completeAtMs },
        )
      : f.location.level === 'partial'
        ? row('location', 8, 'Aadress jäi poolikuks: tänav, maja ja asula peavad kõik olema öeldud.', { atMs: f.location.partialAtMs })
        : row('location', 0, 'Asukohta ei öeldud.');

  // patient
  const kinds = new Set(f.symptomsReported.map((s) => s.symptom)).size;
  const consciousKnown = f.patient.conscious !== 'unknown';
  const breathingKnown = f.patient.breathing !== 'unknown';
  const patient = row(
    'patient',
    (consciousKnown ? 5 : 0) + (breathingKnown ? 5 : 0) + (kinds >= 2 ? 5 : kinds === 1 ? 3 : 0),
    [
      consciousKnown ? 'teadvus teada' : 'teadvus jäi teadmata',
      breathingKnown ? 'hingamine teada' : 'hingamine jäi teadmata',
      `kirjeldatud sümptomeid: ${kinds}`,
    ].join('; ') + '.',
    { atMs: f.symptomsReported[0]?.atMs, evidence: f.symptomsReported[0]?.quote },
  );

  // change
  const ch = firstChange(session, scenario);
  const change = !ch
    ? row('change', 15, 'Olukord selle kõne ajal ei muutunud.', { notApplicable: true })
    : ch.reactionMs === null
      ? row('change', 0, 'Olukord muutus, aga sa ei teatanud sellest.')
      : row(
          'change',
          ch.reactionMs <= 10000 ? 15 : ch.reactionMs <= ch.windowMs ? 11 : 5,
          `Teatasid muutusest ${sec(ch.reactionMs)} pärast selle algust.`,
          { atMs: ch.report?.atMs, evidence: ch.report?.quote },
        );

  // answers, clarity
  const d = f.dialogue;
  const answers = row(
    'answers',
    d.questionsAsked === 0 ? 10 : Math.round((10 * Math.min(d.questionsAnswered, d.questionsAsked)) / d.questionsAsked),
    d.questionsAsked === 0 ? 'Küsimusi ei esitatud.' : `Vastasid ${Math.min(d.questionsAnswered, d.questionsAsked)} küsimusele ${d.questionsAsked}-st.`,
  );
  const clarity = row(
    'clarity',
    10 - 3 * d.contradictions - 2 * d.offTopicTurns,
    d.contradictions + d.offTopicTurns === 0 ? 'Jutt oli selge ja asjakohane.' : `Vastuolusid: ${d.contradictions}; teemast mööda: ${d.offTopicTurns}.`,
  );

  // ending
  const ended = session.events.find((e) => e.type === 'call_ended');
  const dispatched = session.events.some((e) => e.type === 'ambulance_dispatched');
  const ending =
    ended?.type === 'call_ended' && ended.reason === 'dispatcher_ended'
      ? row('ending', 5, 'Jäid liinile, kuni päästekorraldaja lubas lõpetada.')
      : dispatched
        ? row('ending', 2, 'Lõpetasid kõne pärast abi saatmist, aga enne luba.')
        : row('ending', 0, 'Kõne lõppes enne, kui abi jõuti välja saata.');

  return [incident, location, patient, change, answers, clarity, ending];
}
