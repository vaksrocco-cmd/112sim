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

/**
 * Muutus, mida hinnatakse: viimane teatamist nõudev seisund, mis tekkis kõne AJAL (nt kokkuvajumine 2. minutil).
 * Kui kõne lõppes enne ühtegi muutust, siis algseisund. Tagastab reaktsiooniaja (ms) või null, kui ei teatatud.
 */
export function firstChange(session: CallSession, scenario: PublicScenario) {
  const visits = session.stateHistory.filter((v) => scenario.states.find((s) => s.id === v.stateId)?.requiresReport);
  const during = visits.filter((v) => v.enteredAtMs > 0);
  const v = during[during.length - 1] ?? visits[0];
  if (!v) return null;
  const state = scenario.states.find((s) => s.id === v.stateId)!;
  const report = session.finalFacts.changeReports.find((r) => r.stateId === v.stateId);
  return {
    visit: v,
    windowMs: state.reportWindowMs ?? 0,
    report,
    reactionMs: report ? Math.max(0, report.atMs - v.enteredAtMs) : null,
  };
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

const wordCount = (t: string) => t.trim().split(/\s+/).filter(Boolean).length;

export function callerWords(session: CallSession): number {
  return session.transcript.filter((s) => s.speaker === 'caller').reduce((n, s) => n + wordCount(s.text), 0);
}

/**
 * Küsimused ja vastused transkriptist: küsimus on päästekorraldaja lause, milles on küsimärk; vastatud on see siis,
 * kui helistaja ütles midagi enne järgmist päästekorraldaja lauset. Küsimust, millele ei jäänud aega vastata
 * (kõne lõppes või päästekorraldaja rääkis kohe edasi), ei loeta. Kui transkripti pole, tagastab null.
 */
export function questionStats(session: CallSession): { asked: number; answered: number } | null {
  const t = session.transcript;
  if (!t.some((s) => s.speaker === 'dispatcher')) return null;
  let asked = 0;
  let answered = 0;
  t.forEach((seg, i) => {
    if (seg.speaker !== 'dispatcher' || !seg.text.includes('?')) return;
    const next = t[i + 1];
    if (next?.speaker === 'caller') {
      asked++;
      if (wordCount(next.text) > 0) answered++;
      return;
    }
    const roomToAnswer = (next ? next.startMs : session.durationMs) - seg.endMs;
    if (roomToAnswer >= 4000) asked++;
  });
  return { asked, answered };
}

/** Lõppskoor 0–100. Read, mida ei saanud hinnata, jäävad arvestusest välja (ei anna ega võta punkte). */
export function totalScore(rubric: RubricItemResult[]): number {
  const rated = rubric.filter((r) => !r.notApplicable);
  const max = rated.reduce((n, r) => n + r.maxPoints, 0);
  return max ? Math.round((100 * rated.reduce((n, r) => n + r.points, 0)) / max) : 0;
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
      consciousKnown ? 'Teadvus teada' : 'Teadvus jäi teadmata',
      breathingKnown ? 'hingamine teada' : 'hingamine jäi teadmata',
      `kirjeldatud sümptomeid: ${kinds}`,
    ].join('; ') + '.',
    { atMs: f.symptomsReported[0]?.atMs, evidence: f.symptomsReported[0]?.quote },
  );

  // change
  const ch = firstChange(session, scenario);
  const change = !ch
    ? row('change', 0, 'Olukord selle kõne ajal ei muutunud.', { notApplicable: true })
    : ch.reactionMs === null
      ? row('change', 0, 'Olukord muutus, aga sa ei teatanud sellest.')
      : row(
          'change',
          ch.reactionMs <= 10000 ? 15 : ch.reactionMs <= ch.windowMs ? 11 : 5,
          `Teatasid muutusest ${sec(ch.reactionMs)} pärast selle algust.`,
          { atMs: ch.report?.atMs, evidence: ch.report?.quote },
        );

  // answers, clarity: loetakse transkriptist. Kui pole, mida hinnata, siis rida ei anna punkte ega võta neid ära.
  const d = f.dialogue;
  const q = questionStats(session);
  const asked = q ? q.asked : d.questionsAsked;
  // Kohtunik loeb ainult asjakohaseid vastuseid: kui tema arvates jäi rohkem küsimusi vastuseta, kehtib tema arv.
  const judgedMissed = Math.max(0, d.questionsAsked - d.questionsAnswered);
  const answered = q ? Math.max(0, q.asked - Math.max(q.asked - q.answered, judgedMissed)) : Math.min(d.questionsAnswered, d.questionsAsked);
  const answers =
    asked === 0
      ? row('answers', 0, 'Päästekorraldaja ei jõudnud ühtegi küsimust esitada.', { notApplicable: true })
      : row('answers', Math.round((10 * answered) / asked), `Vastasid ${answered} küsimusele ${asked}-st.`);
  const words = callerWords(session);
  const saidEnough = session.transcript.length ? words >= 6 : f.incident.said || f.location.level !== 'none';
  const clarity = !saidEnough
    ? row('clarity', 0, 'Sa rääkisid liiga vähe, et selgust hinnata.', { notApplicable: true })
    : row(
        'clarity',
        10 - 3 * d.contradictions - 2 * d.offTopicTurns - 2 * f.location.wrongParts.length,
        d.contradictions + d.offTopicTurns + f.location.wrongParts.length === 0
          ? 'Jutt oli selge ja asjakohane.'
          : `Vastuolusid: ${d.contradictions}; teemast mööda: ${d.offTopicTurns}; valesti öeldud aadressiosi: ${f.location.wrongParts.length}.`,
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
