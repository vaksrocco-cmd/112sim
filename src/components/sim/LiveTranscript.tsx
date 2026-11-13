'use client';
// Elavad subtiitrid nagu telefonis: ekraanil on ainult see, mida päästekorraldaja praegu ütleb, ja sinu viimane lause.
import type { Speaker, TranscriptSegment } from '@/lib/types';

export function LiveTranscript({
  segments,
  partial,
}: {
  segments: TranscriptSegment[];
  partial: { speaker: Speaker; text: string } | null;
}) {
  const sorted = [...segments].sort((a, b) => a.startMs - b.startMs);
  const last = (sp: Speaker) => (partial?.speaker === sp && partial.text ? partial.text : [...sorted].reverse().find((s) => s.speaker === sp)?.text);
  const dispatcher = last('dispatcher');
  const caller = last('caller');
  return (
    <div aria-live="polite" className="flex min-h-0 flex-1 flex-col justify-center gap-3 overflow-y-auto px-1">
      <p key={dispatcher} className="gr-enter text-[22px] font-semibold leading-7 tracking-[-0.02em] text-fg">
        {dispatcher ?? '…'}
      </p>
      {caller ? (
        <p key={caller} className="gr-enter text-[15px] leading-5 text-subtle">
          {caller}
        </p>
      ) : null}
    </div>
  );
}
