// Integraatori fail. Mudel MÕISTAB helistaja viimast lauset ja täidab väikese struktuuri; midagi muud ta ei otsusta.
// Mida päästekorraldaja ütleb, otsustab policy.ts. Tõde (stsenaariumi vastuseid) mudelile EI anta.
import { llmJson } from '../llm';
import { NO_UNDERSTANDING, type CallState, type Understanding } from './policy';

const nullable = { type: ['string', 'null'] };
const tri = { type: 'string', enum: ['yes', 'no', 'unknown'] };

const SCHEMA = {
  type: 'object',
  properties: {
    what: nullable,
    settlement: nullable,
    street: nullable,
    house: nullable,
    confirmation: { type: 'string', enum: ['yes', 'no', 'none'] },
    conscious: tri,
    breathing: tri,
    change: { type: 'string', enum: ['none', 'vague', 'described'] },
    intent: { type: 'string', enum: ['info', 'only_help_request', 'offtopic', 'agitated', 'asks_eta', 'asks_what_to_do', 'unclear'] },
    unheard: { type: 'string', enum: ['none', 'settlement', 'street', 'house'] },
  },
  required: ['what', 'settlement', 'street', 'house', 'confirmation', 'conscious', 'breathing', 'change', 'intent', 'unheard'],
  additionalProperties: false,
};

const SYSTEM = `Sa analüüsid hädaabikõne helistaja VIIMAST lauset ja täidad JSON-i. Sa ei vasta helistajale.
Tekst tuleb kõnetuvastusest ja võib sisaldada vigu (sarnase kõlaga sõnad, kokku-lahku kirjutus, numbrid sõnadega).
Kui lause lõpus on nurksulgudes teine variant, on see sama lause teise tuvastaja järgi: kasuta mõistlikumat tõlgendust.

Väljad (täida AINULT selle järgi, mida helistaja selles lauses ütles; muidu null / "unknown" / "none"):
- what: mis juhtus, lühidalt helistaja sõnadega (nt "vanaema räägib segaselt, suunurk on viltu"). null, kui ta ei öelnud.
- street: tänava või tee nimi algvormis (nt "Männikäbi tee"). house: maja number numbrina (nt "14"; "neliteist" = "14").
- settlement: linn, alevik, küla või vald algvormis (nt "Haabneemes" = "Haabneeme").
- confirmation: "yes" või "no" ainult siis, kui päästekorraldaja just kordas aadressi ja helistaja vastas sellele.
- conscious, breathing: abivajaja kohta. "räägib", "istub", "vaatab" = teadvusel "yes". "ei vasta", "silmad kinni" = "no".
- change: "described", kui helistaja kirjeldab, et abivajaja seisund MUUTUS või halvenes võrreldes varasemaga;
  "vague", kui ta ütleb ainult, et midagi muutus; muidu "none". Esimene kirjeldus juhtunust EI ole muutus.
- intent: "info" (annab infot või vastab küsimusele); "only_help_request" (ainult "saatke kiirabi" / "aidake", ilma sisuta);
  "asks_eta" (küsib, millal abi tuleb); "asks_what_to_do" (küsib, mida teha); "agitated" (paanika, karjumine, vandumine ilma infota);
  "offtopic" (räägib muust); "unclear" (arusaamatu, katkendlik või tühi).
- unheard: kui helistaja ütles aadressi osa, aga see on tekstis ilmselgelt moonutatud ja sa ei saa sellest aru, märgi see osa.
Ära oleta. Ära täida välja teadmise põhjal, mida helistaja ei öelnud.`;

export interface UnderstandInput {
  state: CallState;
  lastDispatcherLine: string;
  callerText: string;
}

export async function understand(input: UnderstandInput): Promise<Understanding> {
  const known = {
    juhtunu: input.state.what,
    aadress: { tänav: input.state.street, maja: input.state.house, asula: input.state.settlement },
    aadressi_korrati_üle: input.state.addressReadBack,
  };
  try {
    const u = await llmJson<Understanding>({
      tier: 'fast',
      system: SYSTEM,
      messages: [
        {
          role: 'user',
          content: `SENI TEADA: ${JSON.stringify(known)}\nPÄÄSTEKORRALDAJA ÜTLES: ${input.lastDispatcherLine || '(kõne algus)'}\nHELISTAJA ÜTLES: ${input.callerText}`,
        },
      ],
      schema: SCHEMA,
      schemaName: 'understanding',
      effort: 'low',
      maxTokens: 400,
      timeoutMs: 6000,
    });
    return { ...NO_UNDERSTANDING, ...u };
  } catch (e) {
    console.error('[dispatcher] understand failed', e instanceof Error ? e.message : e);
    return fallbackUnderstanding(input.callerText);
  }
}

/** Kui mudel ei vasta: lihtsad reeglid, et kõne ei jääks seisma (aadress kujul „X tee 14“, jah/ei, teadvus, hingamine). */
export function fallbackUnderstanding(text: string): Understanding {
  const t = text.toLowerCase();
  const addr = text.match(/([\p{Lu}][\p{L}-]+(?:\s[\p{L}-]+)?\s(?:tee|tänav|tn|mnt|maantee|puiestee|pst|põik))\s*(\d+[a-zA-Z]?)/u);
  const yes = /^\s*(jah|jaa|õige|just|täpselt)\b/u.test(t);
  const no = /^\s*(ei|vale)\b/u.test(t);
  return {
    ...NO_UNDERSTANDING,
    what: /(räägi|segas|vajus|kukku|insul|valu|veri|hinga|teadvus|krambi|õnnetus)/u.test(t) ? text.trim().slice(0, 120) : null,
    street: addr?.[1] ?? null,
    house: addr?.[2] ?? null,
    confirmation: yes ? 'yes' : no ? 'no' : 'none',
    conscious: /teadvuseta|ei vasta|ei reageeri/u.test(t) ? 'no' : /teadvusel/u.test(t) ? 'yes' : 'unknown',
    breathing: /ei hinga/u.test(t) ? 'no' : /hingab/u.test(t) ? 'yes' : 'unknown',
    intent: 'info',
  };
}
