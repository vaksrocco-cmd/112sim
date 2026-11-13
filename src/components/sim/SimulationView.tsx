'use client';
// Integraatori fail. Simulatsioon on üles ehitatud nagu telefonikõne: üks kitsas veerg, töötab ka 320 px laiusel.
import { useState } from 'react';
import { useSimulation } from '@/lib/sim/useSimulation';
import type { PublicScenario } from '@/lib/types';
import { Text } from '@/components/ui';
import { AiBrainPanel } from './AiBrainPanel';
import { DialButton, HangUpButton, RoundButton } from './CallButton';
import { CallHud, type CallActivity } from './CallHud';
import { KnownCard } from './KnownCard';
import { LiveTranscript } from './LiveTranscript';
import { ScenarioIntro } from './ScenarioIntro';
import { TextFallback } from './TextFallback';
import { VideoStage } from './VideoStage';

export function SimulationView({ scenario }: { scenario: PublicScenario }) {
  const sim = useSimulation(scenario);
  const [showBrain, setShowBrain] = useState(false);
  const [showKeyboard, setShowKeyboard] = useState(false);

  if (sim.phase === 'idle' || sim.phase === 'intro') {
    return <ScenarioIntro scenario={scenario} onDone={sim.markReady} />;
  }

  const live = sim.phase === 'in_call' || sim.phase === 'wrapping_up';
  const over = sim.phase === 'ended' || sim.phase === 'analyzing';

  // Enne kõnet: olukord, mida sa tead, ja helistamise nupp.
  if (!live && !over) {
    return (
      <div className="gr-enter flex flex-1 flex-col gap-4">
        <VideoStage state={sim.currentState} />
        <KnownCard scenario={scenario} compact />
        <div className="flex flex-1 items-center justify-center py-4">
          <DialButton onCall={sim.startCall} disabled={sim.phase !== 'ready'} busy={sim.phase === 'connecting'} />
        </div>
        {sim.error ? (
          <Text size="sm" tone="danger" className="text-center">
            {sim.error}
          </Text>
        ) : null}
      </div>
    );
  }

  const activity: CallActivity = over
    ? 'ended'
    : sim.transcript.length === 0
      ? 'connecting'
      : sim.levels.dispatcher > 0
        ? 'speaking'
        : sim.partial?.speaker === 'caller'
          ? 'transcribing'
          : sim.levels.caller > 0.25
            ? 'hearing'
            : 'listening';

  return (
    <div className="gr-enter flex h-[calc(100dvh-6.5rem)] min-h-[460px] flex-col gap-3">
      <CallHud callMs={sim.callMs} activity={activity} level={Math.max(sim.levels.caller, sim.levels.dispatcher)} />
      <VideoStage state={sim.currentState} />

      {over ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
          {sim.endingText ? <Text className="text-lg font-medium">{sim.endingText}</Text> : null}
          {sim.error ? (
            <Text size="sm" tone="danger">
              {sim.error}
            </Text>
          ) : (
            <Text tone="muted" className="gr-pulse">
              Analüüsin kõnet…
            </Text>
          )}
        </div>
      ) : (
        <>
          {showBrain ? (
            <div className="min-h-0 flex-1 overflow-y-auto">
              <AiBrainPanel facts={sim.facts} scenario={scenario} events={sim.events} stateId={sim.stateId} callMs={sim.callMs} />
            </div>
          ) : (
            <LiveTranscript segments={sim.transcript} partial={sim.partial} />
          )}
          {sim.error ? (
            <Text size="sm" tone="danger" className="text-center">
              {sim.error}
            </Text>
          ) : null}
          <KnownCard scenario={scenario} compact />
          {showKeyboard ? <TextFallback onSend={sim.sendText} /> : null}
          <div className="flex flex-none items-start justify-between px-2 pb-1">
            <RoundButton label="klaviatuur" active={showKeyboard} onClick={() => setShowKeyboard((v) => !v)}>
              <svg viewBox="0 0 24 24" className="size-6" fill="currentColor" aria-hidden>
                {[5, 12, 19].flatMap((x) => [5, 12, 19].map((y) => <circle key={`${x}-${y}`} cx={x} cy={y} r="1.9" />))}
              </svg>
            </RoundButton>
            <HangUpButton onHangUp={sim.hangUp} />
            <RoundButton label="AI aju" active={showBrain} onClick={() => setShowBrain((v) => !v)}>
              <span className="text-sm font-semibold">AI</span>
            </RoundButton>
          </div>
        </>
      )}
    </div>
  );
}
