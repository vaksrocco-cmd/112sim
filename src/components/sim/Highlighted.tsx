// Tõstab helistaja jutus esile selle, mis päästekorraldajale päriselt loeb: KUS (aadress, asula), KES (abivajaja, vanus)
// ja MIS JUHTUS (sümptomid, teadvus, hingamine). Täitesõnad („ee“, „noh“) jäävad tavaliseks tekstiks.
// Reeglid on kood, mitte LLM: esiletõst ilmub kohe, kohtunikku ootamata. Sümptomite sõnastus tuleb stsenaariumist.
import type { PublicScenario } from '@/lib/types';

const ADDRESS = /[\p{Lu}][\p{L}-]+(?:\s[\p{L}-]+)?\s(?:tee|tänav|tänaval|tn|mnt|maantee|puiestee|pst|põik|väljak)\s*\d+[a-zA-Z]?/gu;
const PLACE = /[\p{Lu}][\p{L}-]+(?:\s(?:vald|vallas|linn|linnas|küla|külas|alevik|alevikus))|\b(?:Haabneeme\p{L}*|Viimsi\p{L}*|Tallinn\p{L}*|Tartu\p{L}*|Pärnu\p{L}*|Narva\p{L}*|Pringi\p{L}*|Randvere\p{L}*|Pirita\p{L}*)/gu;
const WHO = /\b(?:vanaema\p{L}*|vanaisa\p{L}*|ema\p{L}{0,3}|isa\p{L}{0,3}|mees|naine|laps\p{L}*|poeg|tütar|õde|vend|sõber|naaber)\b/giu;
const AGE = /\b\d{1,3}(?:[- ]?(?:aastane|aastat vana|aastat))?\b|\b(?:seitsekümmend|kaheksakümmend|kuuskümmend|üheksakümmend)(?:\s\p{L}+)?(?:\saastat(?:\svana)?)?/giu;
const WHAT = /\b(?:insul\p{L}*|teadvusel|teadvuseta|ei hinga|hingab|kukkus|minestas|vajus\p{L}*|segaselt|krambid|veritseb|valu\p{L}*)\b/giu;

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function Highlighted({ text, scenario }: { text: string; scenario?: PublicScenario }) {
  const hints = (scenario?.symptoms ?? []).flatMap((s) => s.hints).filter((h) => h.length > 3);
  const patterns = [ADDRESS, PLACE, WHO, AGE, WHAT, ...(hints.length ? [new RegExp(hints.map(escape).join('|'), 'giu')] : [])];

  // Leia kõik vasted ja liida kattuvad vahemikud.
  const ranges: [number, number][] = [];
  for (const re of patterns) for (const m of text.matchAll(re)) if (m.index !== undefined && m[0].trim()) ranges.push([m.index, m.index + m[0].length]);
  ranges.sort((a, b) => a[0] - b[0]);
  const merged: [number, number][] = [];
  for (const r of ranges) {
    const last = merged[merged.length - 1];
    if (last && r[0] <= last[1] + 1) last[1] = Math.max(last[1], r[1]);
    else merged.push([...r]);
  }

  const out: React.ReactNode[] = [];
  let pos = 0;
  merged.forEach(([a, b], i) => {
    if (a > pos) out.push(text.slice(pos, a));
    out.push(
      <strong key={i} className="font-semibold text-fg">
        {text.slice(a, b)}
      </strong>,
    );
    pos = b;
  });
  if (pos < text.length) out.push(text.slice(pos));
  return <>{out}</>;
}
