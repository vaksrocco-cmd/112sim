'use client';
import type { PublicScenario } from '@/lib/types';

/** Ümbrik aadressiga: ainus asi, mida kõne ajal on vaja uuesti vaadata. */
export function KnownCard({ scenario }: { scenario: PublicScenario; compact?: boolean }) {
  const envelope = scenario.brief.envelope;
  if (!envelope) return null;
  return (
    <details className="group flex-none rounded-inner bg-surface px-4 py-3">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 type-label text-muted [&::-webkit-details-marker]:hidden">
        Ümbrik laual
        <svg viewBox="0 0 24 24" className="size-4 flex-none transition-transform duration-300 ease-out group-open:rotate-180" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="m6 9 6 6 6-6" />
        </svg>
      </summary>
      <div className="pt-2">
        {envelope.map((l, i) => (
          <p key={l} className={i === 0 ? 'break-words text-[15px] font-semibold leading-5 text-fg' : 'break-words text-[15px] leading-5 text-fg'}>
            {l}
          </p>
        ))}
      </div>
    </details>
  );
}
