// AJU. Tsitaatide ja aegade järelkontroll: LLM leiab, kood kontrollib (KNOWLEDGE.md 9.2, 9.6).
import type { CallMs, TranscriptSegment } from '../types';

export const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');

/** Tagastab tsitaadi ainult siis, kui see on (tühikuid, kirjavahemärke ja suurtähti arvestamata) transkriptis olemas. */
export function verifiedQuote(quote: string | null | undefined, segments: TranscriptSegment[]): string | undefined {
  const q = quote ? norm(quote) : '';
  if (q.length < 2) return undefined;
  return segments.some((s) => norm(s.text).includes(q)) ? quote!.trim() : undefined;
}

/** Lähima helistaja lause algusaeg. */
export function snapToCaller(atMs: number | null | undefined, segments: TranscriptSegment[]): CallMs | undefined {
  const callers = segments.filter((s) => s.speaker === 'caller');
  if (atMs == null || !callers.length) return undefined;
  return callers.reduce((best, s) => (Math.abs(s.startMs - atMs) < Math.abs(best.startMs - atMs) ? s : best)).startMs;
}
