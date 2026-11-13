'use client';
// LAVA (Aaron, feat/stage). KNOWLEDGE.md 9.4: sissejuhatus enne kõnet.
import type { PublicScenario } from '@/lib/types';
import { Text } from '@/components/ui';
import { KnownCard } from './KnownCard';

export function ScenarioIntro({ scenario, onDone }: { scenario: PublicScenario; onDone: () => void }) {
  return (
    <div className="gr-enter flex flex-1 flex-col gap-4 pt-4">
      <Text size="sm" tone="muted" className="font-medium">
        {scenario.title}
      </Text>
      <h1 className="text-[30px] font-semibold leading-[1.1] tracking-[-0.03em] text-fg">{scenario.brief.headline}</h1>
      <KnownCard scenario={scenario} />
      <Text size="sm" tone="muted">
        Kohe helistad 112-le. Räägi nii, nagu räägiksid päriselt. Olukord võib kõne ajal muutuda: kui midagi muutub, ütle seda.
      </Text>
      <button
        type="button"
        onClick={onDone}
        className="gr-motion mt-auto flex h-12 w-full items-center justify-center rounded-full bg-primary text-base font-medium text-primary-fg hover:opacity-[0.88]"
      >
        Olen valmis
      </button>
    </div>
  );
}
