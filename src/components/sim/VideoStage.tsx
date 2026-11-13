'use client';
// LAVA (Aaron, feat/stage). KNOWLEDGE.md 9.4.
// Seisundi vahetusel vaheta klippi sujuvalt (kaks <video> elementi, ristsulandus). Puuduva klipi korral näita pealdist.
import type { ScenarioState } from '@/lib/types';
import { Text } from '@/components/ui';

export function VideoStage({ state }: { state?: ScenarioState }) {
  // TODO(Aaron): ristsulandus, eellaadimine (preload järgmised klipid), poster, vea korral varupilt.
  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-card border border-border bg-surface-2">
      {state?.clipUrl ? (
        <video
          key={state.id}
          className="h-full w-full object-cover"
          src={state.clipUrl}
          poster={state.posterUrl}
          autoPlay
          muted
          playsInline
          loop={state.kind === 'loop'}
        />
      ) : null}
      <div className="absolute inset-x-0 bottom-0 p-3">
        <Text size="sm" tone="muted">
          {state?.caption ?? ''}
        </Text>
      </div>
    </div>
  );
}
