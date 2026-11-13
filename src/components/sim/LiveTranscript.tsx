'use client';
import { useEffect, useRef } from 'react';
import type { Speaker, TranscriptSegment } from '@/lib/types';
import { Text } from '@/components/ui';
import { cx } from '@/components/ui/cx';

const who: Record<Speaker, string> = { caller: 'Sina', dispatcher: 'Päästekorraldaja' };

function Bubble({ speaker, text, faint }: { speaker: Speaker; text: string; faint?: boolean }) {
  const mine = speaker === 'caller';
  return (
    <div className={cx('gr-enter flex flex-col gap-1', mine ? 'items-end' : 'items-start')}>
      <span className="px-1 text-[11px] font-medium leading-none text-subtle">{who[speaker]}</span>
      <div
        className={cx(
          'max-w-[88%] break-words rounded-card px-3.5 py-2 text-[15px] leading-5',
          mine ? 'rounded-br-md bg-primary text-primary-fg' : 'rounded-bl-md bg-surface-2 text-fg',
          faint && 'opacity-60',
        )}
      >
        {text}
      </div>
    </div>
  );
}

export function LiveTranscript({
  segments,
  partial,
}: {
  segments: TranscriptSegment[];
  partial: { speaker: Speaker; text: string } | null;
}) {
  const box = useRef<HTMLDivElement>(null);
  // Keri ainult vestluse kasti (mitte tervet lehte), et kõne nupud jääksid paigale.
  useEffect(() => {
    const el = box.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [segments.length, partial?.text]);

  const sorted = [...segments].sort((a, b) => a.startMs - b.startMs);
  return (
    <div ref={box} aria-live="polite" className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto py-2">
      {sorted.length === 0 && !partial ? (
        <Text size="sm" className="m-auto text-center text-subtle">
          Ühendan päästekorraldajaga…
        </Text>
      ) : null}
      {sorted.map((s) => (
        <Bubble key={s.id} speaker={s.speaker} text={s.text} />
      ))}
      {partial && partial.text ? <Bubble speaker={partial.speaker} text={partial.text} faint /> : null}
    </div>
  );
}
