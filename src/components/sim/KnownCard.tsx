'use client';
import type { PublicScenario } from '@/lib/types';
import { Text } from '@/components/ui';

/** Mida helistaja teab + ümbrik aadressiga. `compact` = kõne ajal kokku pandav riba. */
export function KnownCard({ scenario, compact }: { scenario: PublicScenario; compact?: boolean }) {
  const envelope = scenario.brief.envelope;
  const body = (
    <div className="flex flex-col gap-2">
      {scenario.brief.known.map((k) => (
        <Text key={k} size="sm" tone="muted">
          {k}
        </Text>
      ))}
      {envelope ? (
        <div className="rounded-inner bg-surface-2 px-3 py-2">
          <span className="text-[11px] font-medium text-subtle">Ümbrik laual</span>
          {envelope.map((l) => (
            <Text key={l} size="sm" mono className="break-words">
              {l}
            </Text>
          ))}
        </div>
      ) : null}
    </div>
  );
  if (!compact) {
    return (
      <section className="rounded-card bg-surface p-4 shadow-sm">
        <Text size="sm" className="mb-2 font-semibold">
          Mida sa tead
        </Text>
        {body}
      </section>
    );
  }
  return (
    <details className="rounded-inner bg-surface px-3 py-2 shadow-sm">
      <summary className="cursor-pointer list-none text-sm font-medium text-muted">Mida sa tead · ümbrik</summary>
      <div className="pt-2">{body}</div>
    </details>
  );
}
