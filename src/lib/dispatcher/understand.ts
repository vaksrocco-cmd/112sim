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

/** Üldised Eesti kohanimed lühikese asulavastuse kiireks äratundmiseks (mitte stsenaariumi tõde). */
const PLACES = [
  'Tallinn', 'Tartu', 'Narva', 'Pärnu', 'Viljandi', 'Rakvere', 'Maardu', 'Kuressaare', 'Haapsalu', 'Keila', 'Saue', 'Saku', 'Jüri', 'Tabasalu',
  'Viimsi', 'Haabneeme', 'Pringi', 'Püünsi', 'Rohuneeme', 'Leppneeme', 'Tammneeme', 'Randvere', 'Miiduranna', 'Pärnamäe', 'Lubja', 'Muuga',
  'Pirita', 'Merivälja', 'Lasnamäe', 'Mustamäe', 'Kristiine', 'Nõmme',
];

/**
 * Kiirtee: lühike vastus just küsitud küsimusele („Jah“, „14“, „Haabneemes“) mõistetakse reeglitega, mudelit ootamata.
 * Tagastab null, kui lause on pikem või võib sisaldada midagi muud (siis otsustab mudel).
 */
export function quickUnderstanding(state: CallState, callerText: string): Understanding | null {
  const text = callerText.replace(/\[kõnetuvastuse teine variant:[^\]]*\]/giu, '').trim();
  const t = text.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
  const words = t ? t.split(' ') : [];
  if (!words.length || words.length > 5) return null;
  // Võimalik muutus, küsimus või uus info: jäta mudelile.
  if (/(muutu|nüüd|vajus|kukku|halve|kaua|millal|mida ma|appi|kiiresti)/u.test(t)) return null;
  const yes = /^(jah|jaa|jah on|on|õige|just|täpselt|jah õige|õige jah|sain|jah sain)$/u.test(t) || /^(jah|jaa)\b/u.test(t);
  const no = /^(ei|ei ole|vale|ei ei)$/u.test(t) || /^ei\b/u.test(t);
  const base = { ...NO_UNDERSTANDING, intent: 'info' as const };
  switch (state.lastTopic) {
    case 'confirm':
      return yes && words.length <= 3 ? { ...base, confirmation: 'yes' } : no && words.length <= 2 ? { ...base, confirmation: 'no' } : null;
    case 'conscious':
      if (/teadvuseta|ei vasta|ei reageeri/u.test(t)) return { ...base, conscious: 'no' };
      return yes || /^(on )?teadvusel$/u.test(t) ? { ...base, conscious: 'yes' } : no ? { ...base, conscious: 'no' } : null;
    case 'breathing':
      if (/ei hinga/u.test(t)) return { ...base, breathing: 'no' };
      return yes || /^hingab( normaalselt)?$/u.test(t) ? { ...base, breathing: 'yes' } : no ? { ...base, breathing: 'no' } : null;
    case 'location:house': {
      const m = t.match(/^(?:maja |number |maja number )?(\d{1,4}[a-z]?)$/u);
      return m ? { ...base, house: m[1] } : null;
    }
    case 'location:settlement':
    case 'location:all': {
      if (words.length > 3) return null;
      const place = PLACES.find((p) => words.some((w) => w.startsWith(p.toLowerCase()) && w.length <= p.length + 3));
      return place ? { ...base, settlement: place } : null;
    }
    default:
      return null;
  }
}

export async function understand(input: UnderstandInput): Promise<Understanding> {
  const quick = quickUnderstanding(input.state, input.callerText);
  if (quick) return quick;
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
