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

