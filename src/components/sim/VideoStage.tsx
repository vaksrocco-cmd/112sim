'use client';
// LAVA (Aaron, feat/stage). KNOWLEDGE.md 9.4.
// Näitab seisundi klippi täiskaadris (16:9, midagi ei lõigata ära). Kui seisundil on üleminekuklipp (`onsetClipUrl`),
// mängib see üks kord ja alles siis algab kordus. Teiste seisundite klipid laetakse ette, et vahetus ei katkeks.
// Kirjeldus („caption“) ilmub ainult siis, kui klippi ei õnnestu näidata: päris videoga peab muutust ise märkama.
import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import type { ScenarioState } from '@/lib/types';
import { cx } from '@/components/ui/cx';

export function VideoStage({
  state,
  children,
  preload = [],
  onEnded,
}: {
  state?: ScenarioState;
  compact?: boolean;
  children?: ReactNode;
  /** Kõik stsenaariumi seisundid: nende klipid laetakse taustal ette. */
  preload?: ScenarioState[];
  /** Kutsutakse, kui ühekordne klipp (sissejuhatus või lõpp) on läbi või ei lae. */
  onEnded?: () => void;
}) {
  const id = state?.id ?? '';
  const [failed, setFailed] = useState<Record<string, boolean>>({});
  const [loaded, setLoaded] = useState<Record<string, boolean>>({});
  // Üleminekuklipp mängib ainult siis, kui seisund vahetus kõne ajal (mitte esimesel kuvamisel).
  const firstId = useRef(id);
  const prevKind = useRef(state?.kind);
  const cameFromIntro = prevKind.current === 'intro' && state?.kind === 'loop';
  useEffect(() => {
    prevKind.current = state?.kind;
  }, [state?.kind]);
  const [onsetDone, setOnsetDone] = useState<Record<string, boolean>>({});
  const loopRef = useRef<HTMLVideoElement>(null);

  const showOnset = Boolean(state?.onsetClipUrl) && id !== firstId.current && !cameFromIntro && !onsetDone[id];
  const wantVideo = Boolean(state?.clipUrl) && !failed[id];
  const visible = wantVideo && (loaded[id] || showOnset);

  // Kordus algab nullist kohe, kui üleminek lõpeb (üleminek lõpeb samas poosis, kus kordus algab).
  useEffect(() => {
    const v = loopRef.current;
    if (!v) return;
    if (showOnset) {
      v.pause();
    } else {
      v.currentTime = 0;
      void v.play().catch(() => undefined);
    }
  }, [showOnset, id]);

  const others = preload.flatMap((s) => [s.clipUrl, s.onsetClipUrl]).filter((u): u is string => Boolean(u) && u !== state?.clipUrl && u !== state?.onsetClipUrl);

  return (
    <div className="relative aspect-video w-full flex-none overflow-hidden rounded-card bg-surface">
      {wantVideo && state ? (
        <video
          key={`clip-${id}`}
          ref={loopRef}
          className={cx('gr-motion absolute inset-0 size-full object-cover', visible ? 'opacity-100' : 'opacity-0')}
          src={state.clipUrl}
          poster={state.posterUrl}
          muted
          playsInline
          preload="auto"
          loop={state.kind === 'loop'}
          onLoadedData={() => setLoaded((l) => ({ ...l, [id]: true }))}
          onEnded={state.kind === 'loop' ? undefined : onEnded}
          onError={() => {
            setFailed((f) => ({ ...f, [id]: true }));
            if (state.kind !== 'loop') onEnded?.();
          }}
        />
      ) : null}
      {showOnset && state ? (
        <video
          key={`onset-${id}`}
          className="absolute inset-0 size-full object-cover"
          src={state.onsetClipUrl}
          autoPlay
          muted
          playsInline
          onEnded={() => setOnsetDone((d) => ({ ...d, [id]: true }))}
          onError={() => setOnsetDone((d) => ({ ...d, [id]: true }))}
        />
      ) : null}
      {others.map((u) => (
        <video key={u} src={u} preload="auto" muted playsInline className="hidden" aria-hidden />
      ))}
      {children ? <div className="absolute inset-x-0 top-0 bg-gradient-to-b from-bg/85 to-transparent px-4 pb-8 pt-3">{children}</div> : null}
      {!visible ? (
        <p key={`caption-${id}`} className="gr-enter absolute inset-x-0 bottom-0 px-4 pb-4 text-[15px] font-medium leading-5 text-fg">
          {state?.caption ?? ''}
        </p>
      ) : null}
    </div>
  );
}
