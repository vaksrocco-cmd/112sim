'use client';
// Integraatori fail. Simulatsioon on üles ehitatud nagu telefonikõne: suur pilt, vähe teksti, üks kitsas veerg (töötab 320 px laiusel).
import { useState } from 'react';
import { useSimulation } from '@/lib/sim/useSimulation';
import type { PublicScenario } from '@/lib/types';
import { AiBrainPanel } from './AiBrainPanel';
import { DialButton, HangUpButton, RoundButton } from './CallButton';
import { CallHud, type CallActivity } from './CallHud';
import { KnownCard } from './KnownCard';
import { LiveTranscript } from './LiveTranscript';
import { TextFallback } from './TextFallback';
import { VideoStage } from './VideoStage';

export function SimulationView({ scenario }: { scenario: PublicScenario }) {
  const sim = useSimulation(scenario);
  const [showBrain, setShowBrain] = useState(false);
  const [showKeyboard, setShowKeyboard] = useState(false);

  const live = sim.phase === 'in_call' || sim.phase === 'wrapping_up';
  const over = sim.phase === 'ended' || sim.phase === 'analyzing';
  const error = sim.error ? <p className="flex-none text-center text-sm leading-5 text-danger">{sim.error}</p> : null;

  // Enne kõnet: olukord ja helistamise nupp.
  if (!live && !over) {
    const first = scenario.states.find((s) => s.kind === 'loop') ?? sim.currentState;
    return (
      <div className="gr-enter flex flex-1 flex-col gap-3">
        <VideoStage state={first}>
          <p className="text-xl font-semibold leading-6 tracking-[-0.02em] text-fg">{scenario.brief.headline}</p>
        </VideoStage>
        <KnownCard scenario={scenario} />
        <div className="flex flex-1 items-center justify-center py-3">
          <DialButton onCall={sim.startCall} disabled={sim.phase === 'connecting'} busy={sim.phase === 'connecting'} />
        </div>
        {error}
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
    <div className="gr-enter flex h-[calc(100dvh-4.5rem)] min-h-[460px] flex-col gap-3">
      <VideoStage state={sim.currentState} compact>
        <CallHud callMs={sim.callMs} activity={activity} level={Math.max(sim.levels.caller, sim.levels.dispatcher)} />
      </VideoStage>

      {over ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-2 text-center">
          {sim.endingText ? <p className="text-[22px] font-semibold leading-7 tracking-[-0.02em] text-fg">{sim.endingText}</p> : null}
          {error ?? <p className="gr-pulse text-sm text-muted">Analüüsin kõnet…</p>}
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
          {error}
          <KnownCard scenario={scenario} />
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
