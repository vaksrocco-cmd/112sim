'use client';
// Elavad subtiitrid nagu telefonis: ekraanil on ainult see, mida päästekorraldaja praegu ütleb, ja sinu viimane lause.
import type { Speaker, TranscriptSegment } from '@/lib/types';
import { Swap } from '@/components/ui';

export function LiveTranscript({
  segments,
  partial,
}: {
  segments: TranscriptSegment[];
  partial: { speaker: Speaker; text: string } | null;
}) {
  const sorted = [...segments].sort((a, b) => a.startMs - b.startMs);
  // Lause tekst ja järjekorranumber. Number püsib sama, kuni lause alles kasvab (osaline tekst -> valmis lause),
  // nii et liikumine käivitub ainult uue lause alguses, mitte iga sõna peale.
  const line = (sp: Speaker) => {
    const done = sorted.filter((s) => s.speaker === sp);
    const live = partial?.speaker === sp && partial.text ? partial.text : undefined;
    return { text: live ?? done.at(-1)?.text, turn: live ? done.length : done.length - 1 };
  };
  const dispatcher = line('dispatcher');
  const caller = line('caller');
  return (
    <div aria-live="polite" className="flex min-h-0 flex-1 flex-col justify-center gap-4 overflow-y-auto px-1">
      <div className="relative flex flex-col gap-1.5">
        <p className="type-label text-subtle">Häirekeskus</p>
        <Swap id={dispatcher.turn} className="text-[24px] font-bold leading-[30px] tracking-[-0.02em] text-fg">
          {dispatcher.text ?? '…'}
        </Swap>
      </div>
      {caller.text ? (
        <div className="relative flex flex-col gap-1">
          <p className="type-label text-subtle">Sina</p>
          <Swap id={caller.turn} className="text-[15px] leading-[22px] text-muted">
            {caller.text}
          </Swap>
        </div>
      ) : null}
    </div>
  );
}
