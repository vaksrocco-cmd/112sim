// HÄÄL (Sander, feat/voice). KNOWLEDGE.md 9.1. Kaskaadhääl:
//   mikrofon -> (vaikuse tuvastus) -> /api/voice/stt (Groq Whisper, et)
//            -> /api/voice/turn (OpenAI, voog + tööriistad) -> /api/voice/tts (TartuNLP) -> kõlar.
// Kui mikrofoni ei lubata, töötab sama voog tekstirežiimis (sendCallerText).
// Heli ei salvestata: iga lause läheb tuvastusse ja visatakse ära.
import type { CallMs, TranscriptSegment } from '../types';
import type { DispatcherToolCall, VoiceEvents, VoiceProvider, VoiceStartOptions } from './VoiceProvider';

const GREETING = 'Häirekeskus kuuleb, mis juhtus?';
const TICK_MS = 50;
const SPEECH_MIN_MS = 250; // nii kaua peab heli kestma, et see loeks kõneks
const SILENCE_END_MS = 750; // nii pikk paus lõpetab lause
const MAX_UTTERANCE_MS = 25000;
const IDLE_RESTART_MS = 6000; // vaikuses alusta salvestust uuesti, et lause ette ei jääks pikka tühja juppi

type Msg = { role: 'user' | 'assistant'; content: string };
type TurnLine =
  | { type: 'text'; delta: string }
  | { type: 'tool'; name: string; input: unknown }
  | { type: 'done' }
  | { type: 'error'; message: string };

export function createCascadeVoice(): VoiceProvider {
  let ev: VoiceEvents | null = null;
  let now: () => CallMs = () => 0;
  let scenarioId = '';
  let stopped = true;
  let dispatched = false;
  let seq = 0;
  const messages: Msg[] = [];

  // ── kõlar ──
  let speakGen = 0;
  let speakChain: Promise<void> = Promise.resolve();
  let speaking = 0;
  let currentAudio: HTMLAudioElement | null = null;

  // ── mikrofon ──
  let stream: MediaStream | null = null;
  let audioCtx: AudioContext | null = null;
  let vadTimer: ReturnType<typeof setInterval> | null = null;
  let recorder: MediaRecorder | null = null;
  let turnAbort: AbortController | null = null;

  const id = () => `c-${++seq}`;
  const emit = (seg: Omit<TranscriptSegment, 'id'>) => ev?.onSegment({ ...seg, id: id() });

  // ───────── Kõnesüntees ─────────
  async function fetchTts(text: string): Promise<string | null> {
    try {
      const res = await fetch('/api/voice/tts', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      return res.ok ? URL.createObjectURL(await res.blob()) : null;
    } catch {
      return null;
    }
  }

  function playUrl(url: string): Promise<void> {
    return new Promise((resolve) => {
      const a = new Audio(url);
      currentAudio = a;
      const done = () => {
        URL.revokeObjectURL(url);
        if (currentAudio === a) currentAudio = null;
        resolve();
      };
      a.onended = done;
      a.onerror = done;
      a.onpause = done;
      a.play().catch(done);
    });
  }

  function playBrowser(text: string): Promise<void> {
    return new Promise((resolve) => {
      if (typeof speechSynthesis === 'undefined') return resolve();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'et-EE';
      u.onend = () => resolve();
      u.onerror = () => resolve();
      speechSynthesis.speak(u);
    });
  }

  /** Lause läheb järjekorda; heli küsitakse kohe, et järgmine lause oleks valmis, kui eelmine lõpeb. */
  function say(text: string) {
    const gen = speakGen;
    const urlP = fetchTts(text);
    speaking++;
    speakChain = speakChain.then(async () => {
      try {
        const url = await urlP;
        if (gen !== speakGen || stopped) {
          if (url) URL.revokeObjectURL(url);
          return;
        }
        ev?.onLevel?.('dispatcher', 0.6);
        await (url ? playUrl(url) : playBrowser(text));
      } finally {
        speaking--;
        if (!speaking) {
          ev?.onLevel?.('dispatcher', 0);
          restartRecorder(); // ära saada tuvastusse päästekorraldaja häält, mis kostis kõlarist
        }
      }
    });
  }

  function cancelSpeech() {
    speakGen++;
    currentAudio?.pause();
    if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
  }

  // ───────── Päästekorraldaja vastus ─────────
  async function runTurn() {
    turnAbort?.abort();
    const ctrl = new AbortController();
    turnAbort = ctrl;
    const gen = speakGen;
    let full = '';
    let pending = '';
    let startMs: CallMs | null = null;
    let endCall = false;

    const flush = (final: boolean) => {
      // Lõika valmis laused välja ja saada kõlarisse.
      // Voo ajal loeb lause lõppenuks alles siis, kui pärast lõpumärki tuli tühik (muidu lõikaks "14." pooleks).
      for (;;) {
        const m = pending.match(/^([\s\S]*?[.!?…]+)\s+/);
        if (!m) break;
        pending = pending.slice(m[0].length);
        if (m[1].trim() && gen === speakGen) say(m[1].trim());
      }
      if (final && pending.trim() && gen === speakGen) {
        say(pending.trim());
        pending = '';
      }
    };

    const onLine = (line: TurnLine) => {
      if (line.type === 'text') {
        startMs ??= now();
        full += line.delta;
        pending += line.delta;
        ev?.onPartial?.('dispatcher', full);
        flush(false);
      } else if (line.type === 'tool') {
        if (line.name === 'dispatch_ambulance' && !dispatched) {
          dispatched = true;
          const a = (line.input ?? {}) as Partial<Extract<DispatcherToolCall, { name: 'dispatch_ambulance' }>['args']>;
          ev?.onToolCall({
            name: 'dispatch_ambulance',
            args: {
              priority: a.priority === 'B' || a.priority === 'C' ? a.priority : 'A',
              address: String(a.address ?? ''),
              summary: String(a.summary ?? ''),
            },
          });
        } else if (line.name === 'end_call') {
          endCall = true;
        }
      } else if (line.type === 'error') {
        throw new Error(line.message);
      }
    };

    try {
      const res = await fetch('/api/voice/turn', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ scenarioId, messages, dispatched }),
        signal: ctrl.signal,
      });
      if (!res.ok || !res.body) throw new Error(`Päästekorraldaja ei vasta (${res.status})`);
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = '';
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let i: number;
        while ((i = buf.indexOf('\n')) >= 0) {
          const raw = buf.slice(0, i).trim();
          buf = buf.slice(i + 1);
          if (raw) onLine(JSON.parse(raw) as TurnLine);
        }
      }
      flush(true);
    } catch (e) {
      if (!ctrl.signal.aborted && !stopped) ev?.onError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      // Ka katkestatud vastus läheb ajalukku nii palju, kui jõuti öelda.
      const text = full.trim();
      if (text && !stopped) {
        messages.push({ role: 'assistant', content: text });
        emit({ speaker: 'dispatcher', text, startMs: startMs ?? now(), endMs: now() });
      }
      if (endCall && !stopped) {
        // Lase lõpulause ära rääkida, siis lõpeta.
        void speakChain.then(() => !stopped && ev?.onToolCall({ name: 'end_call' }));
      }
    }
  }

  function callerSaid(text: string, startMs: CallMs, endMs: CallMs) {
    if (stopped || !text.trim()) return;
    messages.push({ role: 'user', content: text.trim() });
    emit({ speaker: 'caller', text: text.trim(), startMs, endMs });
    void runTurn();
  }

  // ───────── Mikrofon ja kõnetuvastus ─────────
  async function transcribe(blob: Blob, startMs: CallMs, endMs: CallMs) {
    ev?.onPartial?.('caller', '…');
    try {
      const form = new FormData();
      form.append('audio', blob, blob.type.includes('mp4') ? 'speech.mp4' : 'speech.webm');
      const res = await fetch('/api/voice/stt', { method: 'POST', body: form });
      if (res.status === 501) throw new Error('Kõnetuvastus pole seadistatud (GROQ_API_KEY). Kasuta tekstikasti.');
      if (!res.ok) throw new Error(`Kõnetuvastus ebaõnnestus (${res.status})`);
      const { text } = (await res.json()) as { text: string };
      if (text) callerSaid(text, startMs, endMs);
      else ev?.onPartial?.('caller', '');
    } catch (e) {
      if (!stopped) ev?.onError(e instanceof Error ? e : new Error(String(e)));
    }
  }

  let pendingUtterance: { startMs: CallMs; endMs: CallMs } | null = null;

  function startRecorder() {
    if (!stream || stopped) return;
    const mime = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'].find((m) => MediaRecorder.isTypeSupported(m));
    const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    const chunks: Blob[] = [];
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    rec.onstop = () => {
      const u = pendingUtterance;
      pendingUtterance = null;
      if (u && chunks.length && !stopped) void transcribe(new Blob(chunks, { type: rec.mimeType }), u.startMs, u.endMs);
    };
    rec.start();
    recorder = rec;
    recorderStartedAt = performance.now();
  }
  let recorderStartedAt = 0;

  /** Lõpeta käimasolev salvestus (kui `utterance` on antud, saada see tuvastusse) ja alusta uut. */
  function restartRecorder(utterance?: { startMs: CallMs; endMs: CallMs }) {
    if (!stream || stopped) return;
    pendingUtterance = utterance ?? null;
    if (recorder && recorder.state !== 'inactive') recorder.stop();
    startRecorder();
  }

  function startVad() {
    if (!stream) return;
    audioCtx = new AudioContext();
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 1024;
    audioCtx.createMediaStreamSource(stream).connect(analyser);
    const data = new Float32Array(analyser.fftSize);
    let noise = 0.008;
    let loudMs = 0;
    let quietMs = 0;
    let inSpeech = false;
    let speechStart: CallMs = 0;

    vadTimer = setInterval(() => {
      analyser.getFloatTimeDomainData(data);
      let sum = 0;
      for (const v of data) sum += v * v;
      const rms = Math.sqrt(sum / data.length);
      // Kui päästekorraldaja räägib, tõsta lävi, et kõlarist kostev hääl ei loeks vahelerääkimiseks.
      const threshold = Math.max(0.02, noise * 3) * (speaking ? 2 : 1);
      const loud = rms > threshold;
      if (!loud && !inSpeech) noise = noise * 0.95 + rms * 0.05;
      ev?.onLevel?.('caller', Math.min(1, rms * 8));

      if (loud) {
        loudMs += TICK_MS;
        quietMs = 0;
        if (!inSpeech && loudMs >= SPEECH_MIN_MS) {
          inSpeech = true;
          speechStart = Math.max(0, now() - loudMs);
          if (speaking) {
            // Vahelerääkimine: päästekorraldaja jääb vait ja pooleliolev vastus katkestatakse.
            cancelSpeech();
            turnAbort?.abort();
          }
        }
      } else {
        quietMs += TICK_MS;
        if (!inSpeech) loudMs = 0;
      }

      if (inSpeech && (quietMs >= SILENCE_END_MS || now() - speechStart >= MAX_UTTERANCE_MS)) {
        inSpeech = false;
        loudMs = 0;
        restartRecorder({ startMs: speechStart, endMs: Math.max(speechStart, now() - quietMs) });
      } else if (!inSpeech && !loudMs && performance.now() - recorderStartedAt > IDLE_RESTART_MS) {
        restartRecorder();
      }
    }, TICK_MS);
  }

  return {
    async start(opts: VoiceStartOptions, events: VoiceEvents) {
      ev = events;
      now = opts.now;
      scenarioId = opts.scenarioId;
      stopped = false;
      dispatched = false;
      messages.length = 0;

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        });
        startRecorder();
        startVad();
      } catch {
        // Kõne jätkub tekstirežiimis: demo ei tohi mikrofoni taha jääda.
        stream = null;
        events.onError(new Error('Mikrofon ei ole lubatud. Luba mikrofon brauseri aadressiribalt või trüki oma laused tekstikasti.'));
      }

      // Avalause on fikseeritud (KNOWLEDGE.md 3.4): ei oota mudelit, kõne algab kohe.
      const startMs = now();
      messages.push({ role: 'assistant', content: GREETING });
      say(GREETING);
      emit({ speaker: 'dispatcher', text: GREETING, startMs, endMs: startMs + 1800 });
    },

    sendCue(text: string) {
      if (stopped) return;
      messages.push({ role: 'user', content: text.startsWith('[SÜSTEEM]') ? text : `[SÜSTEEM] ${text}` });
      void runTurn();
    },

    sendCallerText(text: string) {
      const t = now();
      cancelSpeech();
      callerSaid(text, t, t);
    },

    async stop() {
      stopped = true;
      turnAbort?.abort();
      cancelSpeech();
      if (vadTimer) clearInterval(vadTimer);
      vadTimer = null;
      pendingUtterance = null;
      if (recorder && recorder.state !== 'inactive') recorder.stop();
      recorder = null;
      stream?.getTracks().forEach((t) => t.stop());
      stream = null;
      await audioCtx?.close().catch(() => undefined);
      audioCtx = null;
    },
  };
}
