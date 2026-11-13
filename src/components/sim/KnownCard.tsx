'use client';
import type { PublicScenario } from '@/lib/types';

/** Ümbrik aadressiga: ainus asi, mida kõne ajal on vaja uuesti vaadata. */
export function KnownCard({ scenario }: { scenario: PublicScenario; compact?: boolean }) {
  const envelope = scenario.brief.envelope;
  if (!envelope) return null;
  return (
    <details className="flex-none rounded-inner bg-surface px-4 py-3">
      <summary className="cursor-pointer list-none text-sm font-medium text-muted">Ümbrik laual</summary>
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
