'use client';
// Ümmargused kõnenupud nagu telefonis. Ükski neist EI ole tel: link: päris kõnet ei tehta kunagi.
import type { ReactNode } from 'react';
import { cx } from '@/components/ui/cx';

const Phone = ({ down }: { down?: boolean }) => (
  <svg viewBox="0 0 24 24" className={cx('size-8', down && 'rotate-[135deg]')} fill="currentColor" aria-hidden>
    <path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25c1.1.37 2.3.57 3.6.57a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1z" />
  </svg>
);

/** Valimisekraan: number, silt ja roheline helistamisnupp. */
export function DialButton({ onCall, disabled, busy }: { onCall: () => void; disabled?: boolean; busy?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={onCall}
        disabled={disabled}
        aria-label="Helista 112 (simulatsioon)"
        className={cx('gr-motion flex size-[72px] items-center justify-center rounded-full bg-call text-white hover:opacity-[0.88] disabled:pointer-events-none disabled:opacity-45', busy && 'gr-pulse')}
      >
        <Phone />
      </button>
      <span className="text-sm font-medium text-fg">{busy ? 'Ühendan…' : 'Helista 112'}</span>
    </div>
  );
}

export function HangUpButton({ onHangUp }: { onHangUp: () => void }) {
  return (
    <button
      type="button"
      onClick={onHangUp}
      aria-label="Lõpeta kõne"
      className="gr-motion flex size-[72px] flex-none items-center justify-center rounded-full bg-end text-white hover:opacity-[0.88]"
    >
      <Phone down />
    </button>
  );
}

/** Väike ümmargune kõnenupp koos sildiga (nagu „klaviatuur“ või „kõlar“ telefonis). */
export function RoundButton({ label, active, onClick, children }: { label: string; active?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active} className="flex w-16 flex-none flex-col items-center gap-1.5">
      <span className={cx('gr-motion flex size-14 items-center justify-center rounded-full', active ? 'bg-fg text-bg' : 'bg-surface-2 text-fg')}>{children}</span>
      <span className="text-[11px] leading-none text-muted">{label}</span>
    </button>
  );
}
