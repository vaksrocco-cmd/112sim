'use client';
// Integraatori fail. Telefoni vaade: alusta -> numbriklahvistik -> vali 112 -> kõne -> analüüs.
// Kui lehel on ?room=KOOD, mängib video suurel ekraanil (/host) ja telefon saadab sinna oma seisu;
// ilma toata mängib video siinsamas telefonis.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Page, Switch, buttonClass, cx } from '@/components/ui';
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
  /** Sissejuhatav klipp (midagi hakkab juhtuma) mängib üks kord pärast „Alusta“ vajutust; siis jääb olukord kordusena käima. */
  const [introDone, setIntroDone] = useState(false);
  const intro = scenario.states.find((st) => st.kind === 'intro');

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

  const error = sim.error ? <p className="flex-none text-center text-[15px] leading-5 text-danger">{sim.error}</p> : null;

  // 1) Algus: üks nupp.
  if (!started) {
    return (
      <Page fill>
        <div className="flex min-h-0 flex-1 flex-col justify-between gap-6 pt-6 md:my-auto md:max-h-[720px]">
          <div className="gr-stagger flex flex-col gap-3">
            <p className="type-label text-subtle">{scenario.title}</p>
            <h1 className="type-display text-[44px] text-fg">{scenario.brief.headline}</h1>
            <p className="text-[17px] leading-[26px] text-muted">
              {roomCode ? 'Vaata suurt ekraani. Kui midagi juhtub, kutsu abi.' : 'Vaata, mis toimub. Kui midagi juhtub, kutsu abi.'}
            </p>
          </div>
          <div className="gr-enter flex flex-col gap-4">
            <p className="text-[15px] leading-[22px] text-subtle">
              Kõne käib häälega. Luba mikrofon, kui telefon seda küsib.
              {roomCode ? ` Suure ekraani kood on ${roomCode}.` : ''}
            </p>
            <button type="button" onClick={() => setStarted(true)} className={buttonClass({ size: 'xl', block: true })}>
              Alusta
            </button>
          </div>
        </div>
      </Page>
    );
  }

  // Kõnevaate raam. Telefonis: pilt üleval, telefon all. Laual ilma suure ekraanita: pilt suurelt vasakul, telefon paremal.
  // NB! Mõlemad vaated (klahvistik ja kõne) kasutavad sama raami, et VideoStage jääks vaadete vahetumisel samaks eksemplariks.
  const solo = !roomCode;
  const shell = (stage: ReactNode, body: ReactNode) => (
    <Page fill className={cx(solo && 'lg:max-w-[1240px]')}>
      <div className={cx('gr-enter flex min-h-0 flex-1 flex-col gap-3 md:my-auto md:max-h-[820px]', solo && 'lg:grid lg:grid-cols-[minmax(0,1fr)_380px] lg:items-center lg:gap-12')}>
        {stage}
        <div className={cx('flex min-h-0 flex-1 flex-col gap-3', solo && 'lg:h-full lg:max-h-[720px]')}>{body}</div>
      </div>
    </Page>
  );

  // 2) Klahvistik: video mängib (suurel ekraanil või siin), helistaja peab ise valima 112.
  if (!live && !over) {
    return shell(
      roomCode ? (
        <p className="type-label flex-none pt-2 text-center text-subtle">Vaata suurt ekraani</p>
      ) : (
        <VideoStage state={intro && !introDone ? intro : first} preload={scenario.states} onEnded={() => setIntroDone(true)} sound={sim.phase !== 'connecting'} />
      ),
      <>
        <DialPad onCall={sim.startCall} busy={sim.phase === 'connecting'} onDigits={setDialed} />
        {error}
      </>,
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
  return shell(
    roomCode ? (
      <div className="flex-none rounded-card bg-surface px-4 py-4">{hud}</div>
    ) : (
      <VideoStage state={sim.currentState} preload={scenario.states}>
        {hud}
      </VideoStage>
    ),
    over ? (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-2 text-center">
        {sim.endingText ? <p className="gr-enter type-title text-[24px] text-fg">{sim.endingText}</p> : null}
        {error ?? (
          <p className="gr-pulse type-label text-muted">Analüüsin kõnet…</p>
        )}
      </div>
    ) : (
      <>
        <Switch id={showBrain ? 'brain' : 'transcript'} className={showBrain ? 'min-h-0 flex-1 overflow-y-auto' : 'flex min-h-0 flex-1 flex-col'}>
          {showBrain ? (
            <AiBrainPanel facts={sim.facts} scenario={scenario} events={sim.events} stateId={sim.stateId} callMs={sim.callMs} />
          ) : (
            <LiveTranscript segments={sim.transcript} partial={sim.partial} />
          )}
        </Switch>
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
            <span className="text-[15px] font-extrabold">AI</span>
          </RoundButton>
        </div>
      </>
    ),
  );
}
