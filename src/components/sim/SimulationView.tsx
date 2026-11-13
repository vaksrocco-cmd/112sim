'use client';
// Integraatori fail. Telefoni vaade: alusta -> numbriklahvistik -> vali 112 -> kõne -> analüüs.
// Kui lehel on ?room=KOOD, mängib video suurel ekraanil (/host) ja telefon saadab sinna oma seisu;
// ilma toata mängib video siinsamas telefonis.
import { useEffect, useRef, useState } from 'react';
import { joinRoom, type Room, type RoomState } from '@/lib/room/realtime';
import { useSimulation } from '@/lib/sim/useSimulation';
import type { PublicScenario } from '@/lib/types';
import { AiBrainPanel } from './AiBrainPanel';
import { HangUpButton, RoundButton } from './CallButton';
import { CallHud, type CallActivity } from './CallHud';
import { DialPad } from './DialPad';
import { KnownCard } from './KnownCard';
import { LiveTranscript } from './LiveTranscript';
import { TextFallback } from './TextFallback';
import { VideoStage } from './VideoStage';

export function SimulationView({ scenario, room: roomCode }: { scenario: PublicScenario; room?: string }) {
  const roomRef = useRef<Room | null>(null);
  const reportIdRef = useRef<string | undefined>(undefined);
  const sim = useSimulation(scenario, {
    onReport: (id) => {
      reportIdRef.current = id;
      roomRef.current?.send({ ...snapshot.current, phase: 'report', reportId: id });
    },
  });
  const [started, setStarted] = useState(false);
  const [dialed, setDialed] = useState('');
  const [showBrain, setShowBrain] = useState(false);
  const [showKeyboard, setShowKeyboard] = useState(false);

  const live = sim.phase === 'in_call' || sim.phase === 'wrapping_up';
  const over = sim.phase === 'ended' || sim.phase === 'analyzing';
  const first = scenario.states.find((s) => s.kind === 'loop') ?? sim.currentState;
  const lastLine = (speaker: 'caller' | 'dispatcher') =>
    sim.partial?.speaker === speaker && sim.partial.text ? sim.partial.text : [...sim.transcript].reverse().find((s) => s.speaker === speaker)?.text;

  // Hetkeseis suurele ekraanile.
  const state: RoomState = {
    phase: over ? 'ended' : live ? 'in_call' : started ? 'scene' : 'joined',
    scenarioId: scenario.id,
    stateId: live || over ? sim.stateId : (first?.id ?? ''),
    callMs: sim.callMs,
    dispatcherLine: lastLine('dispatcher'),
    callerLine: lastLine('caller'),
    dialed,
    outcome: sim.outcome,
    endingText: sim.endingText,
    reportId: reportIdRef.current,
  };
  const snapshot = useRef(state);
  snapshot.current = state;

  useEffect(() => {
    if (!roomCode) return;
    const room = joinRoom(roomCode);
    roomRef.current = room;
    // Saada seis kord sekundis: kui suur ekraan jäi mõnest sõnumist ilma, parandab järgmine selle ära.
    const timer = setInterval(() => room.send(snapshot.current), 1000);
    return () => {
      clearInterval(timer);
      room.close();
      roomRef.current = null;
    };
  }, [roomCode]);

  // Olulised muutused lähevad teele kohe, mitte järgmise sekundi täitumisel.
  useEffect(() => {
    roomRef.current?.send(snapshot.current);
  }, [state.phase, state.stateId, state.dispatcherLine, state.callerLine, state.dialed]);

  const error = sim.error ? <p className="flex-none text-center text-sm leading-5 text-danger">{sim.error}</p> : null;

  // 1) Algus: üks nupp.
  if (!started) {
    return (
      <div className="gr-enter flex flex-1 flex-col justify-between gap-6 pt-6">
        <div className="flex flex-col gap-3">
          <p className="text-sm font-medium text-muted">{scenario.title}</p>
          <h1 className="text-[34px] font-semibold leading-[1.06] tracking-[-0.04em] text-fg">{scenario.brief.headline}</h1>
          <p className="text-[17px] leading-6 text-muted">
            {roomCode ? 'Vaata suurt ekraani. Kui midagi juhtub, kutsu abi.' : 'Vaata, mis toimub. Kui midagi juhtub, kutsu abi.'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setStarted(true)}
          className="gr-motion flex h-14 w-full items-center justify-center rounded-full bg-primary text-[17px] font-semibold text-primary-fg hover:opacity-[0.88]"
        >
          Alusta
        </button>
      </div>
    );
  }

  // 2) Klahvistik: video mängib (suurel ekraanil või siin), helistaja peab ise valima 112.
  if (!live && !over) {
    return (
      <div className="gr-enter flex h-[calc(100dvh-4.5rem)] min-h-[500px] flex-col gap-3">
        {roomCode ? (
          <p className="flex-none pt-2 text-center text-sm text-subtle">Vaata suurt ekraani</p>
        ) : (
          <VideoStage state={first} compact />
        )}
        <DialPad onCall={sim.startCall} busy={sim.phase === 'connecting'} onDigits={setDialed} />
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
  const hud = <CallHud callMs={sim.callMs} activity={activity} level={Math.max(sim.levels.caller, sim.levels.dispatcher)} />;

  // 3) Kõne ja 4) lõpp.
  return (
    <div className="gr-enter flex h-[calc(100dvh-4.5rem)] min-h-[460px] flex-col gap-3">
      {roomCode ? (
        <div className="flex-none rounded-shell bg-surface px-4 py-4">{hud}</div>
      ) : (
        <VideoStage state={sim.currentState} compact>
          {hud}
        </VideoStage>
      )}

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
          {roomCode ? null : <KnownCard scenario={scenario} />}
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
