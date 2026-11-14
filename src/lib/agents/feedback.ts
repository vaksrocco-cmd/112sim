// AJU. Tagasiside ideaalse kõne järjekorras. Oleku (öeldud / küsimise peale / poolik / ütlemata) määrab KOOD
// kohtuniku faktidest ja transkriptist; LLM võib lisada ainult tsitaadi, ühe lause ja näidislause (analyze.ts).
import type { CallSession, FeedbackStatus, FeedbackStep, FeedbackStepId, PublicScenario } from '../types';
import { firstChange } from './scoring';

export const STEP_LABEL: Record<FeedbackStepId, string> = {
  where: 'Kus',
  what: 'Mis juhtus',
  who: 'Kellega',
  condition: 'Seisund',
  when: 'Millal',
  change: 'Muutus',
};

const WHO = /\b(vana(ema|isa)|ema|isa|mees|naine|laps|poeg|tütar|õde|vend|abikaasa|sõber|naaber|inimene|võõras|\d+[- ]?aastane|aastane)\w*/i;
const WHEN = /\b(äkki|järsku|just|praegu|nüüd|hetk|minut|tund|ennist|hommikul|õhtul|täna|sekund)\w*/i;

const NOTE: Record<FeedbackStepId, Record<FeedbackStatus, string>> = {
  where: {
    said: 'Ütlesid täieliku aadressi ise. Nii saab abi kohe teele.',
    prompted: 'Aadress tuli täis alles küsimise peale. Ütle see kohe alguses.',
    partial: 'Aadress jäi poolikuks. Vaja on tänavat, majanumbrit ja asulat.',
    missing: 'Asukohta sa ei öelnud. Ilma selleta ei saa abi välja saata.',
  },
  what: {
    said: 'Ütlesid selgelt, mis juhtus.',
    prompted: 'Mis juhtus, selgus alles küsimise peale.',
    partial: 'Kirjeldus jäi üldiseks. Ütle, mida sa täpselt näed.',
    missing: 'Sa ei öelnud, mis juhtus.',
  },
  who: {
    said: 'Ütlesid, kes abi vajab.',
    prompted: 'Kes abi vajab, selgus alles küsimise peale.',
    partial: 'Abivajaja kohta jäi info poolikuks.',
    missing: 'Sa ei öelnud, kes abi vajab.',
  },
  condition: {
    said: 'Teadvus ja hingamine said selgeks.',
    prompted: 'Teadvus ja hingamine selgusid küsimise peale.',
    partial: 'Selgeks sai ainult üks: kas teadvus või hingamine.',
    missing: 'Teadvus ja hingamine jäid teadmata.',
  },
  when: {
    said: 'Ütlesid, millal see algas.',
    prompted: 'Algusaeg selgus küsimise peale.',
    partial: 'Algusaeg jäi ebatäpseks.',
    missing: 'Sa ei öelnud, millal see algas.',
  },
  change: {
    said: 'Märkasid muutust ja ütlesid selle kohe edasi.',
    prompted: 'Teatasid muutusest hilinemisega.',
    partial: 'Muutuse kirjeldus jäi poolikuks.',
    missing: 'Olukord muutus, aga sa ei öelnud seda.',
  },
};

export const STEP_TIP: Record<FeedbackStepId, string> = {
  where: 'Alusta aadressist: tänav, majanumber ja asula ühes lauses.',
  what: 'Ütle teise lausega, mis juhtus: mida sa näed.',
  who: 'Ütle, kes abi vajab: näiteks vanaema, umbes 70-aastane.',
  condition: 'Ütle ise, kas ta on teadvusel ja kas ta hingab.',
  when: 'Ütle, millal see algas: näiteks just praegu või viis minutit tagasi.',
  change: 'Kui midagi muutub, ütle seda kohe, ära oota küsimust.',
};

/** Sammud koodist. Tsitaadid tulevad ainult faktidest (kohtunik on need juba transkriptist võtnud). */
export function buildSteps(session: CallSession, scenario: PublicScenario): FeedbackStep[] {
  const f = session.finalFacts;
  const caller = session.transcript.filter((s) => s.speaker === 'caller');
  const find = (re: RegExp) => caller.find((s) => re.test(s.text));
  const step = (id: FeedbackStepId, status: FeedbackStatus, example: string, extra: Partial<FeedbackStep> = {}): FeedbackStep => ({
    id,
    label: STEP_LABEL[id],
    status,
    note: NOTE[id][status],
    example,
    ...extra,
  });

  const loc = f.location;
  const where = step(
    'where',
    loc.level === 'complete' ? (loc.volunteered === false ? 'prompted' : 'said') : loc.level === 'partial' ? 'partial' : 'missing',
    `Aadress on ${loc.street ?? 'tänav'} ${loc.house ?? 'ja majanumber'}, ${loc.settlement ?? loc.municipality ?? 'linn või asula'}.`,
    { atMs: loc.completeAtMs ?? loc.partialAtMs },
  );

  const what = step('what', f.incident.said ? 'said' : 'missing', 'Tal hakkas äkki halb ja ta ei räägi selgelt.', {
    atMs: f.incident.atMs,
    quote: f.incident.quote,
  });

  const whoSeg = find(WHO);
  const who = step('who', whoSeg || f.patient.ageSaid ? 'said' : 'missing', 'Abi vajab mu vanaema, ta on umbes 70-aastane.', { atMs: whoSeg?.startMs });

  const known = Number(f.patient.conscious !== 'unknown') + Number(f.patient.breathing !== 'unknown');
  const condition = step('condition', known === 2 ? 'said' : known === 1 ? 'partial' : 'missing', 'Ta on teadvusel ja hingab.');

  const whenSeg = find(WHEN);
  const when = step('when', whenSeg ? 'said' : 'missing', 'See algas just praegu.', { atMs: whenSeg?.startMs });

  const steps = [where, what, who, condition, when];
  const ch = firstChange(session, scenario);
  if (ch) {
    steps.push(
      step('change', ch.reactionMs === null ? 'missing' : ch.reactionMs <= ch.windowMs ? 'said' : 'prompted', 'Oodake, nüüd ta seisund muutus.', {
        atMs: ch.report?.atMs,
        quote: ch.report?.quote,
      }),
    );
  }
  return steps;
}

/** Soovitused ideaalses järjekorras nende sammude kohta, mis ei õnnestunud. */
export function stepTips(steps: FeedbackStep[]): string[] {
  return steps.filter((s) => s.status !== 'said').map((s) => STEP_TIP[s.id]);
}
