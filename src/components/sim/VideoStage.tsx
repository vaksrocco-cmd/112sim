'use client';
// LAVA (Aaron, feat/stage). KNOWLEDGE.md 9.4.
// Suur pilt nagu videokõnes: klipp täidab kaardi, all on üks rida selle kohta, mida sa näed.
// Klipp ilmub alles siis, kui see on laetud; kuni klippi pole, jääb alles tekst.
import type { ReactNode } from 'react';
import { useState } from 'react';
import type { ScenarioState } from '@/lib/types';
import { cx } from '@/components/ui/cx';

export function VideoStage({ state, compact, children }: { state?: ScenarioState; compact?: boolean; children?: ReactNode }) {
  const [failed, setFailed] = useState<Record<string, boolean>>({});
  const [loaded, setLoaded] = useState<Record<string, boolean>>({});
  const id = state?.id ?? '';
  const wantVideo = Boolean(state?.clipUrl) && !failed[id];
  return (
    <div className={cx('relative w-full flex-none overflow-hidden rounded-shell bg-surface', compact ? 'h-[34dvh] min-h-[170px]' : 'h-[52dvh] min-h-[240px]')}>
      {wantVideo && state ? (
        <video
          key={`clip-${id}`}
          className={cx('gr-motion absolute inset-0 size-full object-cover', loaded[id] ? 'opacity-100' : 'opacity-0')}
          src={state.clipUrl}
          autoPlay
          muted
          playsInline
          loop={state.kind === 'loop'}
          onLoadedData={() => setLoaded((l) => ({ ...l, [id]: true }))}
          onError={() => setFailed((f) => ({ ...f, [id]: true }))}
        />
      ) : null}
      {children ? <div className="absolute inset-x-0 top-0 bg-gradient-to-b from-bg/80 to-transparent px-4 pb-8 pt-4">{children}</div> : null}
      <p key={`caption-${id}`} className="gr-enter absolute inset-x-0 bottom-0 bg-gradient-to-t from-bg/90 to-transparent px-4 pb-4 pt-10 text-[15px] font-medium leading-5 text-fg">
        {state?.caption ?? ''}
      </p>
    </div>
  );
}
