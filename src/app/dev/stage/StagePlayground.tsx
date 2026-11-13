'use client';
import { useState } from 'react';
import { ScenarioIntro } from '@/components/sim/ScenarioIntro';
import { VideoStage } from '@/components/sim/VideoStage';
import { Button, Stack } from '@/components/ui';
import type { PublicScenario } from '@/lib/types';

export function StagePlayground({ scenario }: { scenario: PublicScenario }) {
  const [id, setId] = useState(scenario.states[0].id);
  const [intro, setIntro] = useState(false);
  return (
    <Stack gap={4}>
      <Stack direction="row" gap={2}>
        {scenario.states.map((s) => (
          <Button key={s.id} variant={s.id === id ? 'primary' : 'secondary'} size="sm" onClick={() => setId(s.id)}>
            {s.id}
          </Button>
        ))}
        <Button variant="ghost" size="sm" onClick={() => setIntro((v) => !v)}>
          Intro
        </Button>
      </Stack>
      {intro ? <ScenarioIntro scenario={scenario} onDone={() => setIntro(false)} /> : null}
      <VideoStage state={scenario.states.find((s) => s.id === id)} />
    </Stack>
  );
}
