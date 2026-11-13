'use client';
import { useEffect, useRef } from 'react';
import type { Speaker, TranscriptSegment } from '@/lib/types';
import { Panel, Text } from '@/components/ui';
import { formatMs } from './format';

const who: Record<Speaker, string> = { caller: 'Sina', dispatcher: 'Päästekorraldaja' };

export function LiveTranscript({
  segments,
  partial,
}: {
  segments: TranscriptSegment[];
  partial: { speaker: Speaker; text: string } | null;
}) {
  const end = useRef<HTMLDivElement>(null);
  // NB: uuemates brauserites tagastab scrollIntoView Promise'i; efekt ei tohi seda tagastada (muidu leht jookseb kokku).
  useEffect(() => {
    void end.current?.scrollIntoView({ block: 'nearest' });
  }, [segments.length, partial?.text]);

  return (
    <Panel title="Kõne">
      <div className="flex max-h-80 flex-col gap-2 overflow-y-auto">
        {segments.length === 0 && !partial ? <Text tone="muted">Kõne tekst ilmub siia.</Text> : null}
        {segments.map((s) => (
          <div key={s.id}>
            <Text size="sm" tone="muted">
              {who[s.speaker]} · {formatMs(s.startMs)}
            </Text>
            <Text>{s.text}</Text>
          </div>
        ))}
        {partial ? (
          <div>
            <Text size="sm" tone="muted">
              {who[partial.speaker]}
            </Text>
            <Text tone="muted">{partial.text}…</Text>
          </div>
        ) : null}
        <div ref={end} />
      </div>
    </Panel>
  );
}
