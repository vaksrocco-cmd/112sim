// AJU (Ats, feat/brain). KNOWLEDGE.md 9.6 ja 10.3: analüütik.
// Kood arvutab punktid, ajad ja tulemuse. LLM (OpenAI tark mudel) lisab ainult tsitaadid ja tekstid.
// LLM-i vea korral tuleb raport ikka: punktid ja põhjendused koodist, soovitused mallidest.
import { buildEndingText } from '../director/endings';
import { computeOutcome } from '../director/outcome';
import { llmJson } from '../llm';
import type { AnalysisReport, CallSession, RubricId, RubricItemResult, Scenario } from '../types';
import { loadPrompt } from './prompts';
import { computeTimes, scoreSession } from './scoring';
import { verifiedQuote } from './text';

const RUBRIC_IDS: RubricId[] = ['incident', 'location', 'patient', 'change', 'answers', 'clarity', 'ending'];

const SCHEMA = {
  type: 'object',
  properties: {
    evidence: {
      type: 'array',
      items: {
        type: 'object',
        properties: { id: { type: 'string', enum: RUBRIC_IDS }, quote: { type: ['string', 'null'] } },
        required: ['id', 'quote'],
        additionalProperties: false,
      },
    },
    missed: { type: 'array', items: { type: 'string' } },
    tips: { type: 'array', items: { type: 'string' } },
    whatWouldHaveHappened: { type: 'string' },
  },
  required: ['evidence', 'missed', 'tips', 'whatWouldHaveHappened'],
  additionalProperties: false,
};

interface AnalystOutput {
  evidence: { id: RubricId; quote: string | null }[];
  missed: string[];
  tips: string[];
  whatWouldHaveHappened: string;
}

const FALLBACK_TIPS: Record<RubricId, string> = {
  incident: 'Ütle esimese lausega, mis juhtus ja kellega.',
  location: 'Ütle aadress kohe koos asulaga: tänav, maja, linn või vald.',
  patient: 'Ütle ise, kas abivajaja on teadvusel ja kas ta hingab.',
  change: 'Kui midagi muutub, ütle seda päästekorraldajale kohe.',
  answers: 'Vasta igale küsimusele lühidalt ja täpselt.',
  clarity: 'Räägi rahulikult ja püsi teemas.',
  ending: 'Jää liinile, kuni päästekorraldaja lubab kõne lõpetada.',
};

/** Soovitused koodist: read, kus kaotati kõige rohkem punkte. Kasutusel, kui LLM ei vasta. */
export function fallbackTips(rubric: RubricItemResult[]): [string, string, string] {
  const ranked = [...rubric].sort((a, b) => b.maxPoints - b.points - (a.maxPoints - a.points)).map((r) => FALLBACK_TIPS[r.id]);
  return [ranked[0], ranked[1], ranked[2]];
}

export async function analyzeSession(session: CallSession, scenario: Scenario): Promise<AnalysisReport> {
  const rubric = scoreSession(session, scenario);
  const result = computeOutcome(session.finalFacts, session.events, scenario, session.durationMs);
  const callerSegments = session.transcript.filter((s) => s.speaker === 'caller');

  const report: AnalysisReport = {
    sessionId: session.id,
    score: rubric.reduce((s, r) => s + r.points, 0),
    outcome: result.outcome,
    times: computeTimes(session, scenario),
    rubric: rubric.map((r) => ({ ...r, evidence: verifiedQuote(r.evidence, callerSegments) })),
    missed: rubric.filter((r) => r.points === 0 && !r.notApplicable).map((r) => r.why).slice(0, 4),
    tips: fallbackTips(rubric),
    whatWouldHaveHappened: buildEndingText(result) || 'Kiirabi sai õige info õigel ajal ja jõudis kiiresti kohale.',
  };

  try {
    const out = await llmJson<AnalystOutput>({
      tier: 'smart',
      system: loadPrompt('analyst'),
      messages: [
        {
          role: 'user',
          content: JSON.stringify({
            transcript: session.transcript.map((s) => ({ atMs: s.startMs, speaker: s.speaker, text: s.text })),
            events: session.events,
            facts: session.finalFacts,
            outcome: result.outcome,
            outcomeReasons: result.reasons,
            rubric: rubric.map(({ id, label, points, maxPoints, why, notApplicable }) => ({ id, label, points, maxPoints, why, notApplicable })),
          }),
        },
      ],
      schema: SCHEMA,
      schemaName: 'analysis_texts',
      effort: 'low',
      maxTokens: 4096,
      timeoutMs: 20000,
    });

    const clean = (s: unknown) => (typeof s === 'string' ? s.trim() : '');
    const quotes = new Map(out.evidence.map((e) => [e.id, verifiedQuote(e.quote, callerSegments)]));
    const tips = out.tips.map(clean).filter(Boolean);
    return {
      ...report,
      // Punktid, ajad ja tulemus jäävad koodi omadeks; LLM-ilt tulevad ainult kontrollitud tsitaadid ja tekstid.
      rubric: report.rubric.map((r) => ({ ...r, evidence: quotes.get(r.id) ?? r.evidence })),
      missed: out.missed.map(clean).filter(Boolean).slice(0, 4),
      tips: [tips[0] ?? report.tips[0], tips[1] ?? report.tips[1], tips[2] ?? report.tips[2]],
      whatWouldHaveHappened: clean(out.whatWouldHaveHappened) || report.whatWouldHaveHappened,
    };
  } catch (e) {
    console.error('[analyze] LLM ebaõnnestus, raport tuleb koodi tekstidega', e instanceof Error ? e.message : e);
    return report;
  }
}
