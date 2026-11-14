'use client';
// Kõne päis nagu telefonis: nimi, kestus ja helinivoo. Asub pildi peal.
import { cx } from '@/components/ui/cx';
import { formatMs } from './format';

export type CallActivity = 'connecting' | 'listening' | 'hearing' | 'transcribing' | 'speaking' | 'ended';

export function CallHud({ callMs, activity, level }: { callMs: number; activity: CallActivity; level: number }) {
  const connecting = activity === 'connecting';
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="type-title truncate text-[17px] leading-6 text-fg">Häirekeskus</p>
        <p className={cx('text-[15px] leading-5 text-muted tabular-nums', connecting && 'gr-pulse')}>{connecting ? 'helistan…' : formatMs(callMs)}</p>
      </div>
      {/* Helinivoo: tulpade läbipaistvus järgib häält (Graphite: liigub ainult värv ja läbipaistvus). */}
      <div className="mt-1.5 flex h-4 flex-none items-end gap-1" aria-hidden>
        {[0.15, 0.35, 0.55, 0.75, 0.95].map((t) => (
          <span key={t} className="gr-motion h-4 w-1 rounded-full bg-fg" style={{ opacity: activity === 'ended' ? 0.1 : level >= t ? 0.95 : 0.2 }} />
        ))}
      </div>
    </div>
  );
}
