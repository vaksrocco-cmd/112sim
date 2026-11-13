'use client';
// Integraatori fail. Simulatsioonilehe paigutus.
import { useSimulation } from '@/lib/sim/useSimulation';
import type { PublicScenario } from '@/lib/types';
import { Button, Card, Stack, Text } from '@/components/ui';
import { AiBrainPanel } from './AiBrainPanel';
import { CallButton } from './CallButton';
import { CallHud } from './CallHud';
import { KnownCard } from './KnownCard';
import { LiveTranscript } from './LiveTranscript';
import { ScenarioIntro } from './ScenarioIntro';
import { TextFallback } from './TextFallback';
import { VideoStage } from './VideoStage';

export function SimulationView({ scenario }: { scenario: PublicScenario }) {
  const sim = useSimulation(scenario);

  if (sim.phase === 'idle') {
    return (
      <Card>
        <Stack gap={4}>
          <Text size="lg">{scenario.title}</Text>
          <Button size="lg" onClick={sim.beginIntro}>
            Alusta
          </Button>
        </Stack>
      </Card>
    );
  }

  if (sim.phase === 'intro') {
    return <ScenarioIntro scenario={scenario} onDone={sim.markReady} />;
  }

  const live = sim.phase === 'in_call' || sim.phase === 'wrapping_up';

  return (
    <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
      <Stack gap={4}>
        <VideoStage state={sim.currentState} />
        <CallHud phase={sim.phase} callMs={sim.callMs} stateId={sim.stateId} />
        <CallButton phase={sim.phase} onCall={sim.startCall} onHangUp={sim.hangUp} />
        {live ? <TextFallback onSend={sim.sendText} /> : null}
        {sim.endingText ? <Text>{sim.endingText}</Text> : null}
        {sim.error ? <Text tone="danger">{sim.error}</Text> : null}
      </Stack>
      <Stack gap={4}>
        <KnownCard scenario={scenario} />
        <LiveTranscript segments={sim.transcript} partial={sim.partial} />
        <AiBrainPanel facts={sim.facts} />
      </Stack>
    </div>
  );
}
