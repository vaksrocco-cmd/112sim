'use client';
// Kõne päis nagu telefonis: nimi keskel, all kestus ja mis parajasti toimub.
import { cx } from '@/components/ui/cx';
import { formatMs } from './format';

export type CallActivity = 'connecting' | 'listening' | 'hearing' | 'transcribing' | 'speaking' | 'ended';

const activityLabel: Record<CallActivity, string> = {
  connecting: 'helistan…',
  listening: 'kuulab sind',
  hearing: 'sa räägid',
  transcribing: 'saab aru…',
  speaking: 'räägib',
  ended: 'kõne lõppes',
};

export function CallHud({ callMs, activity, level }: { callMs: number; activity: CallActivity; level: number }) {
  const connecting = activity === 'connecting';
  return (
    <div className="flex flex-none flex-col items-center gap-0.5 text-center">
      <p className="text-[28px] font-semibold leading-8 tracking-[-0.02em] text-fg">Häirekeskus</p>
      <p className={cx('text-[15px] leading-5 text-muted', connecting && 'gr-pulse')}>
        {connecting ? activityLabel.connecting : <span className="font-mono tabular-nums">{formatMs(callMs)}</span>}
        {connecting ? null : <span> · {activityLabel[activity]}</span>}
      </p>
      {/* Helinivoo: viis tulpa, mille läbipaistvus järgib häält (Graphite: liigub ainult värv ja läbipaistvus). */}
      <div className="mt-1 flex h-3 items-end gap-1" aria-hidden>
        {[0.15, 0.35, 0.55, 0.75, 0.95].map((t) => (
          <span key={t} className="gr-motion h-3 w-1 rounded-full bg-fg" style={{ opacity: activity === 'ended' ? 0.1 : level >= t ? 0.9 : 0.18 }} />
        ))}
      </div>
    </div>
  );
}
