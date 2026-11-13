'use client';
// Telefoni numbriklahvistik. Helistaja peab ise valima 112: see on osa harjutusest.
// Ükski nupp EI ole tel: link; päris kõnet ei tehta kunagi.
import { useState } from 'react';
import { cx } from '@/components/ui/cx';

const KEYS: [string, string][] = [
  ['1', ''], ['2', 'ABC'], ['3', 'DEF'],
  ['4', 'GHI'], ['5', 'JKL'], ['6', 'MNO'],
  ['7', 'PQRS'], ['8', 'TUV'], ['9', 'WXYZ'],
  ['*', ''], ['0', '+'], ['#', ''],
];

export function DialPad({ onCall, busy, onDigits }: { onCall: () => void; busy?: boolean; onDigits?: (digits: string) => void }) {
  const [digits, setDigits] = useState('');
  const [wrong, setWrong] = useState(false);

  const set = (next: string) => {
    setDigits(next);
    setWrong(false);
    onDigits?.(next);
  };
  const call = () => {
    if (digits === '112') return onCall();
    setWrong(true);
    setDigits('');
    onDigits?.('');
  };

  return (
    <div className="flex flex-1 flex-col items-center justify-end gap-4 pb-2">
      <div className="flex min-h-[72px] flex-col items-center justify-end gap-1">
        <p className="text-[40px] font-light leading-none tracking-[0.08em] text-fg tabular-nums" aria-live="polite">
          {busy ? '112' : digits || ' '}
        </p>
        <p className={cx('gr-motion text-sm', wrong ? 'text-danger' : 'text-subtle')}>
          {busy ? 'helistan…' : wrong ? 'Vale number. Hädaabinumber on 112.' : digits ? ' ' : 'Vali number'}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-x-5 gap-y-3">
        {KEYS.map(([d, letters]) => (
          <button
            key={d}
            type="button"
            disabled={busy}
            onClick={() => digits.length < 12 && set(digits + d)}
            aria-label={d}
            className="gr-motion flex size-[68px] flex-col items-center justify-center rounded-full bg-surface-2 text-fg hover:bg-border active:bg-border-strong disabled:opacity-45"
          >
            <span className="text-[28px] font-normal leading-none">{d}</span>
            <span className="mt-0.5 h-2.5 text-[9px] font-semibold leading-none tracking-[0.14em] text-muted">{letters}</span>
          </button>
        ))}
        <span />
        <button
          type="button"
          onClick={call}
          disabled={busy}
          aria-label="Helista (simulatsioon)"
          className={cx('gr-motion flex size-[68px] items-center justify-center rounded-full bg-call text-white hover:opacity-[0.88] disabled:pointer-events-none', busy && 'gr-pulse')}
        >
          <svg viewBox="0 0 24 24" className="size-8" fill="currentColor" aria-hidden>
            <path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25c1.1.37 2.3.57 3.6.57a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1z" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => set(digits.slice(0, -1))}
          disabled={busy || !digits}
          aria-label="Kustuta"
          className="gr-motion flex size-[68px] items-center justify-center rounded-full text-muted hover:text-fg disabled:opacity-0"
        >
          <svg viewBox="0 0 24 24" className="size-7" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M9 5h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9l-6-7zM12.5 9.5l5 5M17.5 9.5l-5 5" />
          </svg>
        </button>
      </div>
    </div>
  );
}
