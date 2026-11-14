'use client';
// Integraatori fail. KNOWLEDGE.md 9.5: simulatsiooni olekumasin brauseris.
// Hääl -> transkript -> /api/extract (faktid) -> režissöör (iga 500 ms) -> video seisund.

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import goodCall from '@fixtures/transcripts/good_call.json';
import { directorStep } from '../director/director';
import { buildEndingText } from '../director/endings';
import { computeOutcome } from '../director/outcome';
import { emptyFacts, mergeFacts } from '../facts';
import type {
  CallEndReason,
  CallEvent,
  CallFacts,
  CallMs,
  Outcome,
  PublicScenario,
  Speaker,
  StateVisit,
  TranscriptFixture,
  TranscriptSegment,
} from '../types';
import { createVoiceProvider, resolveVoiceKind, type VoiceProvider } from '../voice';

export type SimPhase = 'idle' | 'intro' | 'ready' | 'connecting' | 'in_call' | 'wrapping_up' | 'ended' | 'analyzing';

const TICK_MS = 500;
const EXTRACT_DEBOUNCE_MS = 300;
/** Kui režissöör ei lõpeta, lõpetame ise maxCallMs + see varu järel. */
const HARD_STOP_GRACE_MS = 5000;

export function useSimulation(scenario: PublicScenario, opts: { onReport?: (id: string) => void } = {}) {
  const onReportRef = useRef(opts.onReport);
  onReportRef.current = opts.onReport;
  const router = useRouter();

  const firstLoop = scenario.states.find((s) => s.kind === 'loop') ?? scenario.states[0];
  const introState = scenario.states.find((s) => s.kind === 'intro');

  const [phase, setPhase] = useState<SimPhase>('idle');
  const [stateId, setStateId] = useState<string>(introState?.id ?? firstLoop.id);
  const [transcript, setTranscript] = useState<TranscriptSegment[]>([]);
  const [partial, setPartial] = useState<{ speaker: Speaker; text: string } | null>(null);
  const [facts, setFacts] = useState<CallFacts>(emptyFacts);
  const [events, setEvents] = useState<CallEvent[]>([]);
  const [callMs, setCallMs] = useState<CallMs>(0);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [endingText, setEndingText] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [levels, setLevels] = useState<{ caller: number; dispatcher: number }>({ caller: 0, dispatcher: 0 });
  const levelsRef = useRef({ caller: 0, dispatcher: 0 });

  // Refid: tick ja voice callback'id loevad alati värsket seisu.
  const voiceRef = useRef<VoiceProvider | null>(null);
  const startAtRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const finishedRef = useRef(false);
  const transcriptRef = useRef<TranscriptSegment[]>([]);
  const factsRef = useRef<CallFacts>(emptyFacts());
  const eventsRef = useRef<CallEvent[]>([]);
  const stateRef = useRef<{ id: string; enteredAtMs: CallMs }>({ id: firstLoop.id, enteredAtMs: 0 });
  const historyRef = useRef<StateVisit[]>([]);
  const extract = useRef<{ timer: ReturnType<typeof setTimeout> | null; inFlight: boolean; dirty: boolean }>({
    timer: null,
    inFlight: false,
    dirty: false,
  });

  const now = useCallback((): CallMs => Math.round(performance.now() - startAtRef.current), []);

  const pushEvent = useCallback((e: CallEvent) => {
    eventsRef.current = [...eventsRef.current, e];
    setEvents(eventsRef.current);
  }, []);

  // ───── Kohtunik (/api/extract): debounce + üks päring korraga ─────
  const runExtract = useCallback(async () => {
    const x = extract.current;
    if (x.inFlight) {
      x.dirty = true;
      return;
    }
    x.inFlight = true;
    x.dirty = false;
    try {
      const res = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          scenarioId: scenario.id,
          transcript: transcriptRef.current,
          prevFacts: factsRef.current,
          stateHistory: historyRef.current,
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as { facts: CallFacts };
        factsRef.current = mergeFacts(factsRef.current, data.facts);
        setFacts(factsRef.current);
      }
    } catch (e) {
      console.warn('[sim] extract failed', e);
    } finally {
      x.inFlight = false;
      if (x.dirty && !finishedRef.current) void runExtract();
    }
  }, [scenario.id]);

  const scheduleExtract = useCallback(() => {
    const x = extract.current;
    if (x.timer) clearTimeout(x.timer);
    x.timer = setTimeout(() => void runExtract(), EXTRACT_DEBOUNCE_MS);
  }, [runExtract]);

  // ───── Lõpetamine, salvestus ja analüüs ─────
  const endCall = useCallback(
    async (reason: CallEndReason) => {
      if (finishedRef.current) return;
      finishedRef.current = true;
      if (timerRef.current) clearInterval(timerRef.current);
      if (extract.current.timer) clearTimeout(extract.current.timer);
      const durationMs = now();
      pushEvent({ type: 'call_ended', atMs: durationMs, reason });
      setPartial(null);
      setPhase('ended');
      try {
        await voiceRef.current?.stop();
      } catch {
        /* ignore */
      }

      try {
        // Viimane kohtuniku läbijooks, et lõppfaktid oleksid täielikud.
        await runExtract();
        // Tulemus ja lõputekst arvutatakse LÕPLIKEST faktidest (kohtunik võib kõne lõpus paar sekundit maas olla):
        // muidu võib lõpuekraan öelda midagi muud kui raport.
        const result = computeOutcome(factsRef.current, eventsRef.current, scenario, durationMs);
        setOutcome(result.outcome);
        setEndingText(buildEndingText(result));
        const ending = scenario.states.find((s) => s.kind === 'ending');
        if (result.outcome === 'good' && ending) setStateId(ending.id);
        setPhase('analyzing');
        const saved = await fetch('/api/sessions', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            scenarioId: scenario.id,
            scenarioVersion: scenario.version,
            durationMs,
            transcript: transcriptRef.current,
            events: eventsRef.current,
            stateHistory: historyRef.current,
            finalFacts: factsRef.current,
          }),
        });
        if (!saved.ok) throw new Error(`Salvestamine ebaõnnestus (${saved.status})`);
        const { id } = (await saved.json()) as { id: string };
        const analyzed = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ sessionId: id }),
        });
        if (!analyzed.ok) console.warn('[sim] analyze failed', analyzed.status);
        onReportRef.current?.(id);
        router.push(`/report/${id}`);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    },
    [now, pushEvent, runExtract, router, scenario.id, scenario.version],
  );

  // ───── Režissööri tikk ─────
  const tick = useCallback(() => {
    if (finishedRef.current) return;
    const nowMs = now();
    setCallMs(nowMs);
    const actions = directorStep({
      nowMs,
      scenario,
      stateId: stateRef.current.id,
      stateEnteredAtMs: stateRef.current.enteredAtMs,
      facts: factsRef.current,
      events: eventsRef.current,
    });
    for (const a of actions) {
      if (a.type === 'transition') {
        const from = stateRef.current.id;
        stateRef.current = { id: a.to, enteredAtMs: nowMs };
        historyRef.current = [...historyRef.current, { stateId: a.to, enteredAtMs: nowMs }];
        setStateId(a.to);
        pushEvent({ type: 'state_changed', atMs: nowMs, from, to: a.to, reason: a.reason });
      } else if (a.type === 'wrap_up') {
        if (!eventsRef.current.some((e) => e.type === 'wrap_up_requested')) {
          pushEvent({ type: 'wrap_up_requested', atMs: nowMs });
          voiceRef.current?.sendCue(a.cue);
          setPhase('wrapping_up');
        }
      } else if (a.type === 'finish') {
        const dispatcherEnded = eventsRef.current.some((e) => e.type === 'wrap_up_requested');
        void endCall(dispatcherEnded ? 'dispatcher_ended' : 'timeout');
        return;
      }
    }
    if (nowMs > scenario.rules.maxCallMs + HARD_STOP_GRACE_MS) void endCall('timeout');
  }, [endCall, now, pushEvent, scenario]);

  // ───── Avalikud tegevused ─────
  const beginIntro = useCallback(() => setPhase('intro'), []);
  const markReady = useCallback(() => setPhase('ready'), []);

  const startCall = useCallback(async () => {
    if (phase !== 'ready' && phase !== 'idle') return;
    setError(null);
    setPhase('connecting');
    finishedRef.current = false;
    transcriptRef.current = [];
    factsRef.current = emptyFacts();
    eventsRef.current = [];
    stateRef.current = { id: firstLoop.id, enteredAtMs: 0 };
    historyRef.current = [{ stateId: firstLoop.id, enteredAtMs: 0 }];
    setTranscript([]);
    setFacts(factsRef.current);
    setStateId(firstLoop.id);

    const kind = resolveVoiceKind(window.location.search);
    const voice = createVoiceProvider(kind, { fixture: goodCall as unknown as TranscriptFixture, speed: 1 });
    voiceRef.current = voice;
    startAtRef.current = performance.now();
    pushEvent({ type: 'call_started', atMs: 0 });

    try {
      await voice.start(
        { scenarioId: scenario.id, now },
        {
          onSegment(seg) {
            transcriptRef.current = [...transcriptRef.current, seg];
            setTranscript(transcriptRef.current);
            setPartial(null);
            // Kohtunik (LLM) vastab mitme sekundi pärast. Et režissöör ei karistaks helistajat selle viivituse eest,
            // märgitakse muutusest teatamine kohe ära, kui helistaja lause sisaldab praeguse seisundi mõne sümptomi vihjet
            // (stsenaariumi `symptoms[].hints`). Kohtunik kinnitab või täpsustab seda hiljem; varaseim aeg jääb alles.
            if (seg.speaker === 'caller') {
              const cur = scenario.states.find((st) => st.id === stateRef.current.id);
              const already = factsRef.current.changeReports.some((r) => r.stateId === cur?.id);
              if (cur?.requiresReport && !already && seg.endMs > stateRef.current.enteredAtMs) {
                const words = (t: string) => t.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(Boolean);
                const said = new Set(words(seg.text));
                // Loeb ainult sümptom, mida varasemates seisundites näha ei olnud (muidu loeks "räägib segaselt" muutuseks).
                const seenBefore = new Set(
                  historyRef.current
                    .filter((v) => v.stateId !== cur.id)
                    .flatMap((v) => scenario.states.find((st) => st.id === v.stateId)?.observable ?? []),
                );
                const hit = scenario.symptoms
                  .filter((sym) => cur.observable.includes(sym.id) && !seenBefore.has(sym.id))
                  .some((sym) => sym.hints.some((h) => words(h).every((w) => said.has(w))));
                if (hit) {
                  factsRef.current = mergeFacts(factsRef.current, {
                    ...factsRef.current,
                    changeReports: [
                      ...factsRef.current.changeReports,
                      { stateId: cur.id, atMs: Math.max(seg.startMs, stateRef.current.enteredAtMs), quote: seg.text.split(/\s+/).slice(0, 12).join(' ') },
                    ],
                  });
                  setFacts(factsRef.current);
                }
              }
            }
            scheduleExtract();
          },
          onPartial(speaker, text) {
            setPartial({ speaker, text });
          },
          onToolCall(call) {
            if (call.name === 'dispatch_ambulance') {
              pushEvent({ type: 'ambulance_dispatched', atMs: now(), ...call.args });
            } else if (call.name === 'end_call') {
              void endCall('dispatcher_ended');
            }
          },
          onLevel(speaker, level) {
            // Uuenda olekut ainult märgatava muutuse korral (muidu renderdaks 20 korda sekundis).
            if (Math.abs(levelsRef.current[speaker] - level) < 0.12 && level !== 0) return;
            levelsRef.current = { ...levelsRef.current, [speaker]: level };
            setLevels(levelsRef.current);
          },
          onError(err) {
            setError(err.message);
          },
        },
      );
      setPhase('in_call');
      timerRef.current = setInterval(tick, TICK_MS);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      finishedRef.current = true;
      setPhase('ready');
    }
  }, [endCall, firstLoop.id, now, phase, pushEvent, scenario.id, scheduleExtract, tick]);

  const hangUp = useCallback(() => void endCall('caller_hangup'), [endCall]);

  const sendText = useCallback((text: string) => {
    voiceRef.current?.sendCallerText?.(text);
  }, []);

  // Lehelt lahkudes: peata hääl ja taimerid.
  useEffect(() => {
    const x = extract.current;
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (x.timer) clearTimeout(x.timer);
      void voiceRef.current?.stop();
    };
  }, []);

  const currentState = scenario.states.find((s) => s.id === stateId);

  return {
    phase,
    stateId,
    currentState,
    transcript,
    partial,
    facts,
    events,
    callMs,
    outcome,
    endingText,
    error,
    levels,
    beginIntro,
    markReady,
    startCall,
    hangUp,
    sendText,
  };
}

export type Simulation = ReturnType<typeof useSimulation>;
