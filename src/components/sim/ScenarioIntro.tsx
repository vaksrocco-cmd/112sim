'use client';
// LAVA (Aaron, feat/stage). KNOWLEDGE.md 9.4: sissejuhatus enne kõnet.
import type { PublicScenario } from '@/lib/types';
import { Button, Card, Heading, Stack, Text } from '@/components/ui';

export function ScenarioIntro({ scenario, onDone }: { scenario: PublicScenario; onDone: () => void }) {
  // TODO(Aaron): intro-klipp (INTRO seisund), ümbriku kaart, animatsioon.
  return (
    <Card>
      <Stack gap={4}>
        <Heading level={2}>{scenario.brief.headline}</Heading>
        <ul className="list-disc pl-5 text-fg">
          {scenario.brief.known.map((k) => (
            <li key={k}>{k}</li>
          ))}
        </ul>
        {scenario.brief.envelope ? (
          <Card className="bg-surface-2">
            <Text size="sm" tone="muted">
              Ümbrik laual
            </Text>
            {scenario.brief.envelope.map((l) => (
              <Text key={l} mono>
                {l}
              </Text>
            ))}
          </Card>
        ) : null}
        <Button size="lg" onClick={onDone}>
          Olen valmis
        </Button>
      </Stack>
    </Card>
  );
}
