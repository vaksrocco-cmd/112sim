import Link from 'next/link';
import { getPublicScenario, listScenarioIds } from '@/lib/scenarios';
import { Badge, Logo, Stack, Text } from '@/components/ui';

export default function Home() {
  const scenarios = listScenarioIds()
    .map((id) => getPublicScenario(id))
    .filter((s) => s !== undefined);

  return (
    <Stack gap={8} className="flex-1 pt-6">
      <Stack gap={4}>
        <Logo />
        <h1 className="text-[34px] font-semibold leading-[1.08] tracking-[-0.035em] text-fg">Harjuta hädaabikõnet enne, kui seda päriselt vaja läheb.</h1>
        <Text tone="muted">Vaata olukorda, helista ja räägi päästekorraldajaga. Lõpus näed, mis läks hästi ja mis jäi ütlemata.</Text>
      </Stack>

      <Stack gap={3}>
        {scenarios.map((s) => (
          <div key={s.id} className="gr-enter rounded-card bg-surface p-4 shadow-sm">
            <Stack gap={3}>
              <Stack direction="row" align="between" className="flex-wrap">
                <Text className="font-semibold">{s.title}</Text>
                <Badge>umbes 2 min</Badge>
              </Stack>
              <Text tone="muted" size="sm">
                {s.brief.headline}
              </Text>
              <Link
                href={`/sim/${s.id}`}
                className="gr-motion flex h-12 w-full items-center justify-center rounded-full bg-primary text-base font-medium text-primary-fg hover:opacity-[0.88]"
              >
                Alusta
              </Link>
            </Stack>
          </div>
        ))}
      </Stack>

      <Stack gap={2} className="mt-auto">
        <Text size="sm" className="text-subtle">
          Vajad mikrofoni. Kõige parem on kasutada kõrvaklappe. Heli ei salvestata.
        </Text>
        {process.env.NODE_ENV !== 'production' ? (
          <Stack direction="row" gap={4} className="flex-wrap">
            {['/dev/voice', '/dev/stage', '/dev/report'].map((h) => (
              <Link key={h} className="text-sm text-muted underline" href={h}>
                {h}
              </Link>
            ))}
          </Stack>
        ) : null}
      </Stack>
    </Stack>
  );
}
