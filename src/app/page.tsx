import Link from 'next/link';
import { getPublicScenario, listScenarioIds } from '@/lib/scenarios';
import { Card, Heading, Stack, Text } from '@/components/ui';

export default function Home() {
  const scenarios = listScenarioIds()
    .map((id) => getPublicScenario(id))
    .filter((s) => s !== undefined);

  return (
    <Stack gap={6}>
      <Stack gap={2}>
        <Heading level={1}>112Sim</Heading>
        <Text tone="muted">Harjuta hädaabikõnet enne, kui seda päriselt vaja läheb.</Text>
      </Stack>
      <Stack gap={3}>
        {scenarios.map((s) => (
          <Link key={s.id} href={`/sim/${s.id}`}>
            <Card className="hover:bg-surface-2">
              <Heading level={3}>{s.title}</Heading>
              <Text tone="muted">{s.brief.headline}</Text>
            </Card>
          </Link>
        ))}
      </Stack>
      {process.env.NODE_ENV !== 'production' ? (
        <Stack direction="row" gap={4}>
          <Link className="text-muted underline" href="/dev/voice">
            /dev/voice
          </Link>
          <Link className="text-muted underline" href="/dev/stage">
            /dev/stage
          </Link>
          <Link className="text-muted underline" href="/dev/report">
            /dev/report
          </Link>
        </Stack>
      ) : null}
    </Stack>
  );
}
