'use client';
import type { PublicScenario } from '@/lib/types';
import { Panel, Text } from '@/components/ui';

export function KnownCard({ scenario }: { scenario: PublicScenario }) {
  return (
    <Panel title="Mida sa tead">
      {scenario.brief.known.map((k) => (
        <Text key={k} size="sm">
          {k}
        </Text>
      ))}
      {scenario.brief.envelope ? (
        <div className="mt-2">
          {scenario.brief.envelope.map((l) => (
            <Text key={l} size="sm" mono tone="muted">
              {l}
            </Text>
          ))}
        </div>
      ) : null}
    </Panel>
  );
}
