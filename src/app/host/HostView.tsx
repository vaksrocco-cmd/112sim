'use client';
// Integraatori fail. Suur ekraan (projektor): QR-kood -> video, mis käib telefonikõnega sünkroonis -> tulemus.
// Suur ekraan ainult näitab; kogu kõne toimub telefonis, mis saadab oma seisu Supabase Realtime kanali kaudu.
import QRCode from 'qrcode';
import { useEffect, useMemo, useRef, useState } from 'react';
import { formatMs } from '@/components/sim/format';
import { Highlighted } from '@/components/sim/Highlighted';
import { CountUp } from '@/components/report/CountUp';
import { FeedbackSteps, Tips } from '@/components/report/FeedbackSteps';
import { Logo } from '@/components/ui';
import { cx } from '@/components/ui/cx';
import { joinRoom, newRoomCode, roomsConfigured, type RoomState } from '@/lib/room/realtime';
import type { CallSession, PublicScenario } from '@/lib/types';

const outcomeText = { good: 'text-ok', delayed: 'text-warn', bad: 'text-danger' } as const;
const outcomeLabel = { good: 'Abi jõudis õigel ajal', delayed: 'Abi jõudis hilinemisega', bad: 'Abi ei jõudnud õigel ajal' } as const;

export function HostView({ scenario }: { scenario: PublicScenario }) {
  const [code, setCode] = useState('');
  const [qr, setQr] = useState('');
  const [demo, setDemo] = useState(false);
  const [joinUrl, setJoinUrl] = useState('');
  const [state, setState] = useState<RoomState | null>(null);
  const [introDone, setIntroDone] = useState(false);
  const [session, setSession] = useState<CallSession | null>(null);
  const lastSeen = useRef(0);
  /** Video heli (toaheli, kell, Helgi häälitsused) on vaikimisi sees. Kui brauser heli veel ei luba, mängib video vaikselt
   *  ja heli tuleb sisse esimese klõpsu või klahvivajutusega sellel lehel (vt HostClip). */
  const sound = true;
  /** Seisund, mille üleminekuklipp parajasti mängib (üks kord, enne kordust). */
  const [onsetFor, setOnsetFor] = useState<string | null>(null);
  const prevStateId = useRef<string | null>(null);

  // Uus tuba: kood, QR ja kanal.
  useEffect(() => {
    const c = newRoomCode();
    // Demorežiim (/host?demo=1) läheb QR-koodiga telefoni kaasa.
    const isDemo = new URLSearchParams(window.location.search).has('demo');
    setDemo(isDemo);
    const url = `${window.location.origin}/sim/${scenario.id}?room=${c}${isDemo ? '&demo=1' : ''}`;
    setCode(c);
    setJoinUrl(url);
    setState(null);
    setSession(null);
    setIntroDone(false);
    void QRCode.toString(url, { type: 'svg', margin: 1, errorCorrectionLevel: 'M' }).then(setQr);
    const room = joinRoom(c, (s) => {
      lastSeen.current = Date.now();
      setState(s);
    });
    return () => room.close();
  }, [scenario.id]);

  const phase = state?.phase;
  const playing = phase === 'scene' || phase === 'in_call' || phase === 'ended';

  // Kui telefon alustab uuesti (tagasi algusesse), mängi sissejuhatus uuesti.
  useEffect(() => {
    if (phase === 'joined') setIntroDone(false);
  }, [phase]);

  // Tulemus: oota, kuni analüüs on salvestatud.
  const reportId = state?.reportId;
  useEffect(() => {
    if (!reportId) return;
    let stop = false;
    const load = async () => {
      for (let i = 0; i < 30 && !stop; i++) {
        const res = await fetch(`/api/sessions/${reportId}`, { cache: 'no-store' }).catch(() => null);
        const s = res?.ok ? ((await res.json()) as CallSession) : null;
        // Esmalt tuleb koodi raport; küsi edasi, kuni AI tekstid on ka kohal.
        if (s?.analysis) {
          setSession(s);
          if (!s.analysis.aiPending) return;
        }
        await new Promise((r) => setTimeout(r, 1500));
      }
    };
    void load();
    return () => {
      stop = true;
    };
  }, [reportId]);

  const intro = scenario.states.find((s) => s.kind === 'intro');
  const ending = scenario.states.find((s) => s.kind === 'ending');
  const loops = useMemo(() => scenario.states.filter((s) => s.kind === 'loop'), [scenario.states]);
  const showIntro = phase === 'scene' && !introDone && Boolean(intro?.clipUrl);
  const goodEnd = phase === 'ended' && state?.outcome === 'good' && Boolean(ending?.clipUrl);
  const activeId = showIntro ? intro!.id : goodEnd ? ending!.id : (state?.stateId ?? loops[0]?.id);
  const blackout = phase === 'ended' && !goodEnd;

  // Kui seisund vahetub kõne ajal ja uuel seisundil on üleminekuklipp, mängi see enne kordust.
  const liveStateId = phase === 'in_call' ? state?.stateId : undefined;
  useEffect(() => {
    if (!liveStateId) {
      prevStateId.current = null;
      return;
    }
    const prev = prevStateId.current;
    prevStateId.current = liveStateId;
    if (prev && prev !== liveStateId && scenario.states.find((s) => s.id === liveStateId)?.onsetClipUrl) setOnsetFor(liveStateId);
  }, [liveStateId, scenario.states]);
  // Üleminek mängib ka enne kõnet: kohe pärast sissejuhatust tekivad insuldi tunnused.
  const onsetActive = onsetFor !== null && onsetFor === state?.stateId && (phase === 'scene' || phase === 'in_call');

  const report = session?.analysis;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-bg text-fg">
      <header className="flex flex-none items-center justify-between px-8 py-5">
        <Logo size={36} />
        <p className="text-base text-subtle">Treeningsimulatsioon. Päris hädaolukorras helista 112.</p>
      </header>

      {/* ── Tulemus ── */}
      {report ? (
        <main className="grid min-h-0 flex-1 grid-cols-1 gap-10 px-8 pb-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:px-16">
          <div className="gr-stagger flex flex-col justify-center gap-4">
            <p className="flex items-baseline gap-[0.08em] type-display text-[clamp(96px,16vw,240px)]">
              <CountUp value={report.score} />
              <span className="text-[0.22em] font-medium tracking-normal text-subtle">/100</span>
            </p>
            <p className={cx('type-title text-[clamp(22px,2.4vw,40px)]', outcomeText[report.outcome])}>{outcomeLabel[report.outcome]}</p>
            <p className="text-[clamp(16px,1.5vw,24px)] leading-snug text-muted">{report.summary ?? report.whatWouldHaveHappened}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="gr-press type-label mt-4 flex h-14 w-fit items-center rounded-inner bg-primary px-8 text-primary-fg hover:opacity-[0.88]"
            >
              Uus kõne
            </button>
          </div>
          <div className="flex min-h-0 flex-col justify-center gap-[2.4vh] overflow-y-auto">
            {report.steps?.length ? (
              <FeedbackSteps steps={report.steps} big />
            ) : (
              report.rubric.map((r) => (
                <div key={r.id} className="flex items-baseline gap-5 border-b border-border pb-3">
                  <span className="w-24 flex-none text-[clamp(20px,2vw,32px)] font-semibold tabular-nums">
                    {r.notApplicable ? '–' : r.points}
                    <span className="text-subtle">/{r.maxPoints}</span>
                  </span>
                  <div className="min-w-0">
                    <p className="text-[clamp(17px,1.5vw,24px)] font-medium leading-snug">{r.label}</p>
                    <p className="text-[clamp(14px,1.1vw,18px)] leading-snug text-muted">{r.evidence ? `„${r.evidence}“` : r.why}</p>
                  </div>
                </div>
              ))
            )}
            <div className="border-t border-border pt-[2vh]">
              <p className="type-label pb-[1vh] text-subtle">Järgmine kord</p>
              <Tips tips={report.tips} from={report.steps?.length ?? 0} big />
            </div>
          </div>
        </main>
      ) : playing ? (
        /* ── Video, sünkroonis kõnega ── */
        <main className="relative mx-8 mb-8 min-h-0 flex-1 overflow-hidden rounded-shell bg-black">
          {[...(intro ? [intro] : []), ...loops, ...(ending ? [ending] : [])].map((s) =>
            s.clipUrl ? (
              <HostClip
                key={s.id}
                src={s.clipUrl}
                loop={s.kind === 'loop'}
                active={!blackout && activeId === s.id && !(onsetActive && onsetFor === s.id)}
                volume={sound ? (phase === 'in_call' ? 0.35 : 1) : 0}
                onEnded={
                  s.kind === 'intro'
                    ? () => {
                        setIntroDone(true);
                        const next = scenario.states.find((x) => x.id === state?.stateId);
                        if (next?.onsetClipUrl) setOnsetFor(next.id);
                      }
                    : undefined
                }
              />
            ) : null,
          )}
          {loops.map((s) =>
            s.onsetClipUrl ? (
              <HostClip key={`onset-${s.id}`} src={s.onsetClipUrl} loop={false} active={!blackout && onsetActive && onsetFor === s.id} volume={sound ? 0.35 : 0} onEnded={() => setOnsetFor(null)} />
            ) : null,
          )}

          {phase === 'in_call' ? (
            <div className="absolute inset-x-0 top-0 flex items-start justify-between bg-gradient-to-b from-bg/80 to-transparent px-8 pb-16 pt-6">
              <div>
                <p className="type-title text-[clamp(24px,2.6vw,44px)]">Häirekeskus</p>
                <p className="text-[clamp(18px,1.6vw,28px)] text-muted">kõne käib</p>
              </div>
              <p className="type-display text-[clamp(40px,5vw,88px)] tabular-nums">{formatMs(state?.callMs ?? 0)}</p>
            </div>
          ) : null}

          {phase === 'scene' && state?.dialed ? (
            <p className="absolute right-8 top-6 text-[clamp(40px,5vw,88px)] font-light leading-none tracking-[0.08em]">{state.dialed}</p>
          ) : null}

          {blackout ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 bg-bg px-[8vw] text-center">
              <p className="gr-enter type-title text-[clamp(28px,3.6vw,64px)]">{state?.endingText || 'Kõne lõppes.'}</p>
              <p className="gr-pulse text-[clamp(16px,1.4vw,24px)] text-muted">Analüüsin kõnet…</p>
            </div>
          ) : (
            <div className="absolute inset-x-0 bottom-0 flex flex-col gap-2 bg-gradient-to-t from-bg/95 via-bg/70 to-transparent px-8 pb-8 pt-24">
              {phase === 'in_call' && state?.dispatcherLine ? (
                <p key={state.dispatcherLine} className="gr-enter text-[clamp(26px,3.2vw,56px)] font-bold leading-tight tracking-[-0.02em]">
                  {state.dispatcherLine}
                </p>
              ) : null}
              {phase === 'in_call' && state?.callerLine ? (
                <p className="text-[clamp(16px,1.6vw,28px)] leading-snug text-muted">
                  <Highlighted text={state.callerLine} scenario={scenario} />
                </p>
              ) : null}
              {phase === 'ended' ? <p className="gr-pulse text-[clamp(16px,1.4vw,24px)] text-muted">Analüüsin kõnet…</p> : null}
            </div>
          )}
        </main>
      ) : (
        /* ── Ooteruum: QR ── */
        <main className="mx-auto grid min-h-0 w-full max-w-[1600px] flex-1 grid-cols-1 items-center gap-12 px-8 pb-12 lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-24 lg:px-16">
          <div className="gr-stagger flex max-w-3xl flex-col gap-6">
            <h1 className="type-display text-[clamp(44px,6vw,112px)]">
              {phase === 'joined' ? 'Telefon on ühendatud.' : 'Skaneeri ja helista.'}
            </h1>
            <p className="text-[clamp(18px,1.8vw,30px)] leading-snug text-muted">
              {phase === 'joined'
                ? 'Vajuta telefonis „Alusta“. Video algab siin ekraanil.'
                : 'Ava telefoni kaamera ja skaneeri kood. Vaata siit ekraanilt, mis juhtub, ja kutsu telefoniga abi.'}
            </p>
            {/* Režiimi valik: tavaline harjutus (kuni 3 min, olukord muutub, lõpus raport) või lühike demo esitluseks. */}
            <p className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[clamp(15px,1.2vw,20px)]">
              <span className="type-label text-subtle">Režiim</span>
              <a href="/host" className={cx('gr-motion underline-offset-4', demo ? 'text-subtle hover:text-fg' : 'font-semibold text-fg underline')}>
                Tavaline · 3 min
              </a>
              <a href="/host?demo=1" className={cx('gr-motion underline-offset-4', demo ? 'font-semibold text-fg underline' : 'text-subtle hover:text-fg')}>
                Demo · 30 s
              </a>
            </p>
            {!roomsConfigured() ? <p className="text-lg text-danger">Sünkroon ei ole seadistatud (NEXT_PUBLIC_SUPABASE_URL ja NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY).</p> : null}
          </div>
          {/* QR-kood ja toa kood ühe ploki ja ühe laiusega, et kõik jooneks ühte. */}
          <div className="gr-enter mx-auto flex w-[min(56vh,480px)] flex-col gap-5 lg:mx-0">
            <div
              className={cx('gr-motion aspect-square w-full rounded-shell bg-white p-[6%] [&>svg]:size-full', phase === 'joined' && 'opacity-30')}
              aria-label="QR-kood telefoniga liitumiseks"
              dangerouslySetInnerHTML={{ __html: qr }}
            />
            <div className="flex items-baseline justify-between gap-4">
              <p className="type-label text-subtle">Kood</p>
              <p className="-mr-[0.2em] text-[clamp(28px,3vw,48px)] font-extrabold leading-none tracking-[0.2em]">{code}</p>
            </div>
            <p className="truncate text-sm text-subtle" title={joinUrl}>
              {joinUrl.replace(/^https?:\/\//, '')}
            </p>
          </div>
        </main>
      )}
    </div>
  );
}

/** Üks eellaetud klipp virnas; nähtav on ainult aktiivne (500 ms sulandus, src-i ei vahetata). */
function HostClip({ src, loop, active, volume, onEnded }: { src: string; loop: boolean; active: boolean; volume: number; onEnded?: () => void }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (active) {
      v.currentTime = 0; // kordus algab samast poosist, kus eelmine klipp lõppes
      // Kui brauser ei luba heliga mängida, mängi ilma helita: pilt ei tohi heli taha seisma jääda.
      void v.play().catch(() => {
        v.muted = true;
        void v.play().catch(() => undefined);
      });
      return;
    }
    const t = setTimeout(() => v.pause(), 600); // peata alles pärast sulandust
    return () => clearTimeout(t);
  }, [active]);
  // Kõne ajal on video heli vaiksem, et see ei segaks päästekorraldajat ega läheks telefoni mikrofoni.
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    v.muted = volume === 0 || !active;
    v.volume = Math.max(0, Math.min(1, volume));
    if (volume === 0 || !active) return;
    // Kui brauser ei lubanud heliga alustada (video mängib vaikselt), tule heli sisse esimese klõpsu või klahviga.
    const unmute = () => {
      v.muted = false;
      void v.play().catch(() => undefined);
    };
    window.addEventListener('pointerdown', unmute, { once: true });
    window.addEventListener('keydown', unmute, { once: true });
    return () => {
      window.removeEventListener('pointerdown', unmute);
      window.removeEventListener('keydown', unmute);
    };
  }, [volume, active]);
  return (
    <video
      ref={ref}
      src={src}
      muted
      playsInline
      loop={loop}
      preload="auto"
      onEnded={onEnded}
      onError={onEnded}
      className={cx('absolute inset-0 size-full bg-black object-contain transition-opacity duration-500 ease-out', active ? 'opacity-100' : 'opacity-0')}
    />
  );
}
