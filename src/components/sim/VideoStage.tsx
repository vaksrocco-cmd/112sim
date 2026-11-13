'use client';
// LAVA (Aaron, feat/stage). KNOWLEDGE.md 9.4.
// Kõik klipid on eellaetud ja virnas; aktiivne on nähtav, vahetus on läbipaistvuse sulandus.
// Kui klippi (veel) pole, näidatakse olukorra kirjeldust tekstina, et simulatsioon töötaks ka ilma videota.
import { useState } from 'react';
import type { ScenarioState } from '@/lib/types';

export function VideoStage({ state }: { state?: ScenarioState }) {
  const [failed, setFailed] = useState<Record<string, boolean>>({});
  const [loaded, setLoaded] = useState<Record<string, boolean>>({});
  const wantVideo = Boolean(state?.clipUrl) && !failed[state?.id ?? ''];
  // Klipp ilmub alles siis, kui see on päriselt laetud: puuduva faili korral ei jää ekraanile tühja musta kasti.
  const hasVideo = wantVideo && Boolean(loaded[state?.id ?? '']);
  return (
    <div className="relative w-full flex-none overflow-hidden rounded-card bg-surface shadow-sm">
      {wantVideo && state ? (
        <video
          key={state.id}
          className={hasVideo ? 'gr-enter aspect-video w-full object-cover' : 'hidden'}
          onLoadedData={() => setLoaded((l) => ({ ...l, [state.id]: true }))}
          src={state.clipUrl}
          autoPlay
          muted
          playsInline
          loop={state.kind === 'loop'}
          onError={() => setFailed((f) => ({ ...f, [state.id]: true }))}
        />
      ) : null}
      <div key={state?.id} className={hasVideo ? 'gr-enter absolute inset-x-0 bottom-0 bg-bg/70 px-3 py-2' : 'gr-enter px-4 py-3'}>
        <span className="text-[11px] font-medium text-subtle">Mida sa näed</span>
        <p className="text-[15px] leading-5 text-fg">{state?.caption ?? ''}</p>
      </div>
    </div>
  );
}
