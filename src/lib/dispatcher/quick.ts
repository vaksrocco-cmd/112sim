// Integraatori fail. Kiirtee: lihtne vastus mõistetakse reeglitega, ilma mudelita. Puhas kood (ei võrku), et ka telefon
// saaks seda kasutada ja vastata kohe, ilma serverisse pöördumata (vt lib/voice/cascade.ts).
import { NO_UNDERSTANDING, type CallState, type Understanding } from './policy';

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
  // Juhendamise ajal (kontrollküsimused, juhised) loeb ka pikem vastus lihtsaks; aadressi ja seisundi puhul ainult lühike.
  const relaxed = /^(age|onset|arms|check|howis|guide|side|watch|recheck)/u.test(state.lastTopic ?? '');
  if (!words.length || words.length > (relaxed ? 9 : 5)) return null;
  // Võimalik muutus, küsimus või uus info: jäta mudelile.
  if (/(muutu|nüüd|vajus|kukku|halve|kaua|millal|mida ma|mida teha|appi|kiiresti|kramp|oksenda|\?)/u.test(callerText.toLowerCase())) return null;
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
    case 'recheck:conscious':
      // „Kas ta on endiselt teadvusel?“ – „ei“ tähendab, et seisund muutus: teadvuseta, hingamine tuleb uuesti küsida.
      if (no || /teadvuseta|ei vasta|ei reageeri/u.test(t)) return { ...base, conscious: 'no', change: 'described' };
      return yes || /teadvusel|vastab|reageerib/u.test(t) ? { ...base, conscious: 'yes' } : null;
    case 'recheck:breathing':
      if (/ei hinga/u.test(t) || no) return { ...base, breathing: 'no' };
      return yes || /hingab/u.test(t) ? { ...base, breathing: 'yes' } : null;
    case 'age':
    case 'onset':
    case 'arms':
    case 'check':
    case 'howis':
    case 'guide':
    case 'side':
    case 'watch':
      // Vastust ei salvestata, piisab sellest, et helistaja vastas: mudelit pole vaja. Seisundi halvenemine läheb mudelile.
      return /silmad|teadvuse|ei vasta|ei reageeri|ei hinga|ei liigu/u.test(t) ? null : base;
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


const UNITS: Record<string, number> = { üks: 1, kaks: 2, kolm: 3, neli: 4, viis: 5, kuus: 6, seitse: 7, kaheksa: 8, üheksa: 9, kümme: 10 };
/** „neliteist“ -> 14, „kakskümmend kolm“ -> 23. Tagastab null, kui see ei ole arv 1–99. */
function numberWord(a: string, b?: string): { value: number; used: number } | null {
  if (UNITS[a]) return { value: UNITS[a], used: 1 };
  const teen = a.match(/^(.+)teist(kümmend)?$/u);
  if (teen && UNITS[teen[1]]) return { value: 10 + UNITS[teen[1]], used: 1 };
  const tens = a.match(/^(.+)kümmend$/u);
  if (tens && UNITS[tens[1]]) return b && UNITS[b] && UNITS[b] < 10 ? { value: UNITS[tens[1]] * 10 + UNITS[b], used: 2 } : { value: UNITS[tens[1]] * 10, used: 1 };
  return null;
}

const STREET_TYPE = /^(tee|tänav|tänaval|tn|maantee|mnt|puiestee|pst|põik)$/u;

/** Aadress kujul „Männikäbi tee 14, Haabneeme“ (number ka sõnadega). Leiab ainult selle, mis on selgelt öeldud. */
export function parseAddress(text: string): { street: string | null; house: string | null; settlement: string | null; addressLike: boolean } {
  const tokens = text.replace(/[^\p{L}\p{N}\s-]/gu, ' ').split(/\s+/).filter(Boolean);
  const low = tokens.map((w) => w.toLowerCase());
  let street: string | null = null;
  let house: string | null = null;
  const i = low.findIndex((w) => STREET_TYPE.test(w));
  if (i > 0) {
    const name = tokens[i - 1];
    street = `${name[0].toUpperCase()}${name.slice(1)} ${low[i] === 'tänaval' ? 'tänav' : low[i]}`;
    const next = low[i + 1];
    if (next && /^\d{1,3}[a-z]?$/u.test(next)) house = next;
    else if (next) house = numberWord(next, low[i + 2])?.value.toString() ?? null;
  }
  // Kui lauses on mitu kohanime („Haabneemes, Viimsi Artiumis“), kehtib see, mis öeldi esimesena.
  const hit = (w: string, k: number) => (k !== i - 1 ? PLACES.find((p) => w.startsWith(p.toLowerCase()) && w.length <= p.length + 3) : undefined);
  const place = low.map(hit).find(Boolean);
  return { street, house, settlement: place ?? null, addressLike: i >= 0 || /\d/u.test(text) || Boolean(place) || low.some((w) => /^(teel|tänava\p{L}*|maantee\p{L}+|puiestee\p{L}+|põigu\p{L}*|korter\p{L}*|maja\p{L}*)$/u.test(w)) };
}

/**
 * Lühikese demo kiirtee: esimene lause (mis juhtus) ja selgelt öeldud aadress mõistetakse ilma mudelita, nii et
 * päästekorraldaja vastab kohe. Kui lause on mitmeti mõistetav (aadressi moodi, aga ei tule täielikult välja), otsustab mudel.
 */
export function demoQuick(state: CallState, callerText: string): Understanding | null {
  const text = callerText.replace(/\[kõnetuvastuse teine variant:[^\]]*\]/giu, '').trim();
  const words = text.split(/\s+/).filter(Boolean);
  if (!words.length || /\?/u.test(text)) return null;
  const a = parseAddress(text);
  const base = { ...NO_UNDERSTANDING, intent: 'info' as const };
  const topic = state.lastTopic;
  if (!state.what && (topic === null || topic === 'what')) {
    // Esimene lause: juhtunu helistaja sõnadega. Ainult „appi“ või „saatke kiirabi“ ei ole kirjeldus.
    if (words.length < 3 || /^(appi|palun|halloo?|tere)[\s,.!]*$/iu.test(text) || /^(saatke|kutsuge|tulge)\b/iu.test(text)) return null;
    if (a.addressLike && !(a.street && a.house)) return null;
    return { ...base, what: text.slice(0, 120), street: a.street, house: a.house, settlement: a.settlement };
  }
  if (topic?.startsWith('location') && words.length <= 12) {
    // Vasta ilma mudelita, kui tänav ja majanumber tulid selgelt välja (asula lisandub, kui see öeldi).
    if (a.street && a.house) return { ...base, street: a.street, house: a.house, settlement: a.settlement };
  }
  return null;
}
