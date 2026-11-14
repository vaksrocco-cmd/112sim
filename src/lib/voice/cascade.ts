// HÄÄL (Sander, feat/voice). KNOWLEDGE.md 9.1. Kaskaadhääl:
//   mikrofon -> (vaikuse tuvastus) -> /api/voice/stt (Groq Whisper, et)
//            -> /api/voice/turn (OpenAI, voog + tööriistad) -> /api/voice/tts (TartuNLP) -> kõlar.
// Kui mikrofoni ei lubata, töötab sama voog tekstirežiimis (sendCallerText).
// Heli ei salvestata: iga lause läheb tuvastusse ja visatakse ära.
import { GREETING, type CallState } from '../dispatcher/policy';
import type { CallMs, TranscriptSegment } from '../types';
import staticLines from './lines.json';
import type { DispatcherToolCall, VoiceEvents, VoiceProvider, VoiceStartOptions } from './VoiceProvider';

/** Ette valmis tehtud heli kindlatele lausetele (lause -> fail). Vt scripts/make-dispatcher-audio.mjs. */
const STATIC_AUDIO: Record<string, string> = staticLines;
const TICK_MS = 50;
const SPEECH_MIN_MS = 250; // nii kaua peab heli kestma, et see loeks kõneks
const SILENCE_END_MS = 550; // nii pikk paus lõpetab lause
const MAX_UTTERANCE_MS = 25000;
const IDLE_RESTART_MS = 6000; // vaikuses alusta salvestust uuesti, et lause ette ei jääks pikka tühja juppi

/** Päästekorraldaja toon: mida ebamäärasem helistaja, seda kindlam ja valjem hääl. */
type Emotion = 'calm' | 'firm' | 'urgent';
const TAGS: Record<string, Emotion> = { rahulik: 'calm', kindel: 'firm', tungiv: 'urgent' };
const VOLUME: Record<Emotion, number> = { calm: 1, firm: 1.35, urgent: 1.8 };

/** Üldised Eesti kohanimed voogtuvastusele (MITTE stsenaariumi tõde: väljamõeldud tänavanime siin ei ole). */
const LIVE_KEYTERMS = [
  'Tallinn', 'Tartu', 'Narva', 'Pärnu', 'Viljandi', 'Rakvere', 'Maardu', 'Kuressaare', 'Haapsalu', 'Keila', 'Saue', 'Saku', 'Jüri', 'Tabasalu',
  'Viimsi', 'Viimsi vald', 'Haabneeme', 'Pringi', 'Püünsi', 'Rohuneeme', 'Leppneeme', 'Tammneeme', 'Randvere', 'Miiduranna', 'Pärnamäe', 'Lubja',
  'Muuga', 'Pirita', 'Merivälja', 'Lasnamäe', 'Mustamäe', 'Kristiine', 'Nõmme', 'Harjumaa', 'teadvusel', 'hingab', 'suunurk', 'kiirabi',
];

type Msg = { role: 'user' | 'assistant'; content: string };
type TurnLine =
  | { type: 'text'; delta: string }
  | { type: 'tool'; name: string; input: unknown }
  | { type: 'done' }
  | { type: 'error'; message: string }
  | { type: 'state'; state: CallState };

export function createCascadeVoice(): VoiceProvider {
  let ev: VoiceEvents | null = null;
  let now: () => CallMs = () => 0;
  let scenarioId = '';
  let stopped = true;
  let dispatched = false;
  /** Mida päästekorraldaja kõnest seni teab (vt lib/dispatcher/policy.ts). Server tagastab selle iga vooruga. */
  let callState: CallState | null = null;
  /** Kindlate lausete heli, kui see on juba alla laaditud. */
  const audioCache = new Map<string, Promise<ArrayBuffer | null>>();
  /** Ette alustatud vooru päring: algab kohe, kui lause tundub lõppenud, et vastus oleks valmis, kui tekst on kinnitatud. */
  let speculative: { text: string; res: Promise<Response | null>; ctrl: AbortController } | null = null;
  const sameText = (a: string, b: string) => a.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '') === b.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');
  const lastDispatcherLine = () => [...messages].reverse().find((m) => m.role === 'assistant')?.content ?? '';
  function speculate(text: string) {
    speculative?.ctrl.abort();
    speculative = null;
    // Ainult siis, kui eelmine sõnum ei ole vastamata helistaja lause (muidu liidetakse laused ja tekst muutub).
    const prev = messages[messages.length - 1];
    if (stopped || !text.trim() || (prev?.role === 'user' && !prev.content.startsWith('[SÜSTEEM]'))) return;
    const ctrl = new AbortController();
    const res = fetch('/api/voice/turn2', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ scenarioId, state: callState ?? undefined, lastDispatcherLine: lastDispatcherLine(), callerText: text.trim() }),
      signal: ctrl.signal,
    }).catch(() => null);
    speculative = { text: text.trim(), res, ctrl };
  }
  let seq = 0;
  const messages: Msg[] = [];

  // ── kõlar ──
  let speakGen = 0;
  let speakChain: Promise<void> = Promise.resolve();
  let speaking = 0;
  let currentSource: AudioBufferSourceNode | null = null;
  let keepAlive: HTMLAudioElement | null = null;
  /** Kompressor väljundi ees: lubab valjemat häält ilma moonutuseta. */
  let output: AudioNode | null = null;

  // ── mikrofon ──
  let stream: MediaStream | null = null;
  let audioCtx: AudioContext | null = null;
  let vadTimer: ReturnType<typeof setInterval> | null = null;
  let recorder: MediaRecorder | null = null;
  /** Voogtuvastus (ElevenLabs Scribe Realtime). Kui see töötab, MediaRecorderit ja tükkidena saatmist ei kasutata. */
  let live: WebSocket | null = null;
  let liveNode: ScriptProcessorNode | null = null;
  /** Eraldi 16 kHz AudioContext mikrofoni jaoks (brauser teeb ümberdiskreetimise). */
  let captureCtx: AudioContext | null = null;
  /** Kas helistaja räägib praegu üle päästekorraldaja (siis lastakse mikrofoni heli tuvastusse ka kõne ajal). */
  let bargeIn = false;
  let turnAbort: AbortController | null = null;

  const id = () => `c-${++seq}`;
  const emit = (seg: Omit<TranscriptSegment, 'id'>) => ev?.onSegment({ ...seg, id: id() });

  // ───────── Kõnesüntees ─────────
  function staticAudio(text: string): Promise<ArrayBuffer | null> | null {
    const url = STATIC_AUDIO[text];
    if (!url) return null;
    let p = audioCache.get(text);
    if (!p) {
      p = fetch(url)
        .then((r) => (r.ok ? r.arrayBuffer() : null))
        .catch(() => null);
      audioCache.set(text, p);
    }
    return p;
  }

  async function fetchTts(text: string, emotion: Emotion): Promise<ArrayBuffer | null> {
    // Kindel lause on ette valmis tehtud: mängib kohe, ilma kõnesünteesi ootamata.
    const ready = await staticAudio(text);
    if (ready) return ready;
    try {
      const res = await fetch('/api/voice/tts', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text, emotion }),
      });
      return res.ok ? await res.arrayBuffer() : null;
    } catch {
      return null;
    }
  }

  /**
   * Mängib heli Web Audio kaudu. Telefonis EI tohi iga lause jaoks luua uut <audio> elementi:
   * brauser lubab heli ainult kasutaja puudutuse ajal, hilisem play() blokeeritakse vaikselt.
   * AudioContext avatakse helistamisnupu vajutusel (vt start) ja jääb kogu kõneks lahti.
   * Tagastab false, kui heli ei õnnestunud mängida (siis proovitakse brauseri häält).
   */
  async function playBuffer(data: ArrayBuffer, volume: number): Promise<boolean> {
    const ctx = audioCtx;
    if (!ctx) return false;
    try {
      if (ctx.state !== 'running') await ctx.resume();
      const buffer = await ctx.decodeAudioData(data.slice(0));
      await new Promise<void>((resolve) => {
        const src = ctx.createBufferSource();
        const gain = ctx.createGain();
        gain.gain.value = volume;
        src.buffer = buffer;
        src.connect(gain).connect(output ?? ctx.destination);
        currentSource = src;
        src.onended = () => {
          if (currentSource === src) currentSource = null;
          resolve();
        };
        src.start();
      });
      return true;
    } catch (e) {
      console.warn('[voice] heli mängimine ebaõnnestus', e);
      return false;
    }
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
  function say(text: string, emotion: Emotion = 'calm') {
    const gen = speakGen;
    const urlP = fetchTts(text, emotion);
    speaking++;
    speakChain = speakChain.then(async () => {
      try {
        const data = await urlP;
        if (gen !== speakGen || stopped) return;
        ev?.onLevel?.('dispatcher', 0.6);
        if (!(data && (await playBuffer(data, VOLUME[emotion])))) await playBrowser(text);
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
    try {
      currentSource?.stop();
    } catch {
      /* juba lõppenud */
    }
    if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
  }

  // ───────── Päästekorraldaja vastus ─────────
  async function runTurn() {
    turnAbort?.abort();
    const ctrl = new AbortController();
    turnAbort = ctrl;
    const gen = speakGen;
    let raw = '';
    let emotion: Emotion = 'calm';
    let full = '';
    let pending = '';
    let startMs: CallMs | null = null;
    let endCall = false;
    let nextState: CallState | null = null;

    const flush = (final: boolean) => {
      // Lõika valmis laused välja ja saada kõlarisse.
      // Voo ajal loeb lause lõppenuks alles siis, kui pärast lõpumärki tuli tühik (muidu lõikaks "14." pooleks).
      for (;;) {
        const m = pending.match(/^([\s\S]*?[.!?…]+)\s+/);
        if (!m) break;
        pending = pending.slice(m[0].length);
        if (m[1].trim() && gen === speakGen) say(m[1].trim(), emotion);
      }
      if (final && pending.trim() && gen === speakGen) {
        say(pending.trim(), emotion);
        pending = '';
      }
    };

    const onLine = (line: TurnLine) => {
      if (line.type === 'text') {
        startMs ??= now();
        raw += line.delta;
        // Vastus algab toonimärgendiga, nt "[kindel] ...". Märgendit ei näidata ega loeta ette.
        const lead = raw.trimStart();
        if (lead.startsWith('[') && !lead.includes(']')) return; // märgend on veel pooleli
        const tag = lead.match(/^\[([^\]]*)\]\s*/);
        if (tag) emotion = TAGS[tag[1].trim().toLowerCase()] ?? emotion;
        const clean = (tag ? lead.slice(tag[0].length) : lead).replace(/\[(rahulik|kindel|tungiv)\]\s*/gi, '');
        pending += clean.slice(full.length);
        full = clean;
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
      } else if (line.type === 'state') {
        nextState = line.state;
      } else if (line.type === 'error') {
        throw new Error(line.message);
      }
    };

    try {
      // Versioon 2: mudel mõistab lauset, kood otsustab vastuse. Kui see ei vasta, kasutame vana marsruuti.
      const lastUser = messages[messages.length - 1];
      const cue = lastUser?.role === 'user' && lastUser.content.startsWith('[SÜSTEEM]');
      const post = (url: string, body: unknown) =>
        fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), signal: ctrl.signal });
      // Kui sama teksti kohta on päring juba ette tehtud, kasuta selle vastust (säästab kuni sekundi).
      const ready = !cue && speculative && lastUser && sameText(speculative.text, lastUser.content) ? speculative : null;
      if (speculative && !ready) speculative.ctrl.abort();
      speculative = null;
      let res =
        (ready ? await ready.res : null) ??
        (await post('/api/voice/turn2', {
          scenarioId,
          state: callState ?? undefined,
          lastDispatcherLine: lastDispatcherLine(),
          callerText: cue ? undefined : lastUser?.content,
          cue,
        }).catch((e) => {
          if (ctrl.signal.aborted) throw e;
          return null;
        }));
      if (!res?.ok || !res.body) res = await post('/api/voice/turn', { scenarioId, messages, dispatched });
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
      // Katkestatud vastust (helistaja rääkis edasi) ajalukku ei panda: muidu küsiks päästekorraldaja sama asja uuesti.
      const text = full.trim();
      if (text && !stopped && !ctrl.signal.aborted) {
        if (nextState) callState = nextState; // seis uueneb ainult siis, kui vastus päriselt öeldi
        messages.push({ role: 'assistant', content: text });
        emit({ speaker: 'dispatcher', text, startMs: startMs ?? now(), endMs: now() });
      }
      if (endCall && !stopped) {
        // Lase lõpulause ära rääkida, siis lõpeta.
        void speakChain.then(() => !stopped && ev?.onToolCall({ name: 'end_call' }));
      }
    }
  }

  /** `alt` on teise tuvastaja variant samast lausest: päästekorraldaja näeb mõlemat ja valib mõistlikuma tõlgenduse. */
  function callerSaid(text: string, startMs: CallMs, endMs: CallMs, alt?: string) {
    if (stopped || !text.trim()) return;
    const same = (a: string, b: string) => a.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '') === b.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');
    const note = alt && alt.trim() && !same(alt, text) ? `\n[kõnetuvastuse teine variant: ${alt.trim()}]` : '';
    // Kui eelmisele lausele ei jõutud veel vastata (vastus katkestati), liida laused üheks sõnumiks:
    // päästekorraldaja vastab siis ühe korra kogu jutule, mitte kaks korda samale küsimusele.
    const prev = messages[messages.length - 1];
    if (prev?.role === 'user' && !prev.content.startsWith('[SÜSTEEM]')) prev.content = `${prev.content} ${text.trim()}${note}`;
    else messages.push({ role: 'user', content: text.trim() + note });
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
    if (!stream || stopped || live) return;
    pendingUtterance = utterance ?? null;
    if (recorder && recorder.state !== 'inactive') recorder.stop();
    startRecorder();
  }

  // ───────── Voogtuvastus ─────────
  // Mikrofoni heli läheb pidevalt (16 kHz PCM) ElevenLabsi; tekst tekib rääkimise ajal ja lause lõpu otsustab server.
  // See on töökindlam kui heli ise tükkideks lõikamine: lause algus ega lõpp ei lähe kaduma ja mudel näeb eelnevat konteksti.
  async function startLive(): Promise<boolean> {
    if (!stream || !audioCtx) return false;
    try {
      const res = await fetch('/api/voice/stt-token', { method: 'POST' });
      if (!res.ok) return false;
      const { token, model } = (await res.json()) as { token: string; model: string };
      const q = new URLSearchParams({
        model_id: model,
        token,
        audio_format: 'pcm_16000',
        language_code: 'et',
        commit_strategy: 'vad',
        vad_silence_threshold_secs: '0.5',
      });
      for (const k of LIVE_KEYTERMS) q.append('keyterms', k);
      const ws = new WebSocket(`wss://api.elevenlabs.io/v1/speech-to-text/realtime?${q}`);

      const ready = await new Promise<boolean>((resolve) => {
        const t = setTimeout(() => resolve(false), 4000);
        ws.onopen = () => {
          clearTimeout(t);
          resolve(true);
        };
        ws.onerror = () => {
          clearTimeout(t);
          resolve(false);
        };
      });
      if (!ready || stopped) {
        ws.close();
        return false;
      }

      // Viimase ~45 s heli (16 kHz PCM16), et lõpetatud lause saaks täpsema mudeliga üle kirjutada.
      const ring: Int16Array[] = [];
      let ringStart = 0; // esimese alles oleva tüki alguse järjekorranumber (sämplites)
      let total = 0;
      const RATE = 16000;
      const slice = (from: number): Int16Array => {
        const out = new Int16Array(Math.max(0, total - Math.max(from, ringStart)));
        let pos = ringStart;
        let o = 0;
        for (const c of ring) {
          const skip = Math.max(0, Math.max(from, ringStart) - pos);
          if (skip < c.length) {
            out.set(c.subarray(skip), o);
            o += c.length - skip;
          }
          pos += c.length;
        }
        return out;
      };
      const wav = (pcm: Int16Array): Blob => {
        const h = new DataView(new ArrayBuffer(44));
        const put = (o: number, t: string) => [...t].forEach((ch, i) => h.setUint8(o + i, ch.charCodeAt(0)));
        put(0, 'RIFF');
        h.setUint32(4, 36 + pcm.byteLength, true);
        put(8, 'WAVEfmt ');
        h.setUint32(16, 16, true);
        h.setUint16(20, 1, true);
        h.setUint16(22, 1, true);
        h.setUint32(24, RATE, true);
        h.setUint32(28, RATE * 2, true);
        h.setUint16(32, 2, true);
        h.setUint16(34, 16, true);
        put(36, 'data');
        h.setUint32(40, pcm.byteLength, true);
        return new Blob([h.buffer, pcm.buffer as ArrayBuffer], { type: 'audio/wav' });
      };

      let pending = ''; // voomudeli lõpetatud laused, mis ootavad, kas helistaja jätkab
      let startMs: CallMs | null = null;
      let startSample = 0;
      /** Koht helis, kus eelmine lause lõppes: uue lause täpne tuvastus ei tohi sellest varasemat heli sisaldada
       *  (muidu kirjutatakse eelmise lause lõpp teist korda ja päästekorraldaja vastab samale jutule kaks korda). */
      let lastEndSample = 0;
      let commitSample = 0;
      let speechStartedAt = 0;
      let timer: ReturnType<typeof setTimeout> | null = null;
      let precise: Promise<string | null> | null = null;
      let preciseAbort: AbortController | null = null;

      /** Täpne tuvastus sama heli pealt (ElevenLabs Scribe, mitte voomudel). Alustatakse kohe lause lõppedes. */
      const startPrecise = () => {
        preciseAbort?.abort();
        const ctrl = new AbortController();
        preciseAbort = ctrl;
        const form = new FormData();
        form.append('audio', wav(slice(startSample)), 'speech.wav');
        precise = fetch('/api/voice/stt', { method: 'POST', body: form, signal: ctrl.signal })
          .then(async (r) => (r.ok ? ((await r.json()) as { text?: string }).text?.trim() || null : null))
          .catch(() => null);
      };

      const finish = async () => {
        timer = null;
        const rough = pending.trim();
        const s = startMs ?? now();
        const p = precise;
        pending = '';
        startMs = null;
        precise = null;
        lastEndSample = commitSample;
        // Täpset teksti on vaja seal, kus iga täht loeb (juhtunu ja aadress). Kui päästekorraldaja küsis just lihtsat asja
        // (kinnitus, teadvus, hingamine), vastatakse kohe voomudeli teksti põhjal: see säästab ligi sekundi.
        const topic = callState?.lastTopic ?? null;
        const needsPrecise = topic === null || topic === 'what' || topic.startsWith('location');
        const better = p && needsPrecise ? await Promise.race([p, new Promise<null>((r) => setTimeout(() => r(null), 600))]) : null;
        const text = better && /[\p{L}\p{N}]/u.test(better) ? better : rough;
        if (stopped) return;
        if (/[\p{L}\p{N}]/u.test(text)) callerSaid(text, s, now(), text === rough ? undefined : rough);
        else ev?.onPartial?.('caller', '');
      };

      ws.onmessage = (e) => {
        let m: { message_type?: string; text?: string; error?: string };
        try {
          m = JSON.parse(String(e.data));
        } catch {
          return;
        }
        const text = (m.text ?? '').trim();
        const begin = () => {
          if (startMs !== null) return;
          startMs = Math.max(0, now() - 800);
          startSample = Math.max(ringStart, lastEndSample, total - Math.round(RATE * 3)); // kuni 3 s varu, aga mitte üle eelmise lause
          speechStartedAt = performance.now();
        };
        if (m.message_type === 'partial_transcript') {
          if (!text) return;
          begin();
          if (timer) {
            clearTimeout(timer); // helistaja jätkas: ära veel vasta
            timer = null;
          }
          ev?.onPartial?.('caller', `${pending} ${text}`.trim());
        } else if (m.message_type === 'committed_transcript' || m.message_type === 'committed_transcript_with_timestamps') {
          if (!text) return;
          begin();
          pending = `${pending} ${text}`.trim();
          commitSample = total;
          ev?.onPartial?.('caller', pending);
          startPrecise();
          speculate(pending);
          if (timer) clearTimeout(timer);
          // Vasta kohe, kui lause tundub lõpetatud. Kui see lõpeb poolikult (koma, sidesõna, "ee"), oota veidi kauem,
          // et helistajat ei katkestataks mõttepausi ajal. Kui ta jätkab, liidetakse laused üheks.
          const unfinished = /(,|\b(ja|et|aga|siis|või|ning|kuna|sest|nagu|noh|ee+|öö+|aa+|mm+|a))\s*[.…]*$/iu.test(pending);
          timer = setTimeout(() => void finish(), unfinished ? 1300 : 250);
        } else if (m.message_type && m.message_type !== 'session_started' && m.message_type !== 'warning') {
          // quota_exceeded, auth_error, rate_limited, ...: mine üle varuvariandile (tükkidena saatmine).
          console.warn('[voice] voogtuvastuse viga', m.message_type, m.error);
          ws.close();
        }
      };
      ws.onclose = () => {
        if (live !== ws) return;
        live = null;
        liveNode?.disconnect();
        liveNode = null;
        if (!stopped) startRecorder(); // varu: MediaRecorder + /api/voice/stt
      };

      // Mikrofon -> 16 kHz PCM16 -> base64 tükid. Eelistame eraldi 16 kHz AudioContexti: siis teeb ümberdiskreetimise
      // brauser (korraliku filtriga). Kui seda ei saa, keskmistame ise.
      const ctx = captureCtx && captureCtx.state !== 'closed' ? captureCtx : audioCtx;
      if (ctx.state !== 'running') await ctx.resume().catch(() => undefined);
      const src = ctx.createMediaStreamSource(stream);
      const node = ctx.createScriptProcessor(4096, 1, 1);
      const mute = ctx.createGain();
      mute.gain.value = 0;
      const ratio = ctx.sampleRate / RATE;
      const sendChunk = (pcm: Int16Array, commit = false) => {
        ring.push(pcm);
        total += pcm.length;
        while (ring.length && total - ringStart > RATE * 45) ringStart += ring.shift()!.length;
        if (ws.readyState !== WebSocket.OPEN) return;
        const bytes = new Uint8Array(pcm.buffer);
        let bin = '';
        for (let i = 0; i < bytes.length; i += 0x2000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x2000));
        ws.send(JSON.stringify({ message_type: 'input_audio_chunk', audio_base_64: btoa(bin), commit, sample_rate: RATE }));
      };
      /** Viimased ~0,8 s päris heli ajast, mil tuvastusse läks vaikus: vahelerääkimisel saadetakse need järele, et lause algus ei kaoks. */
      let held: Int16Array[] = [];
      node.onaudioprocess = (e) => {
        const input = e.inputBuffer.getChannelData(0);
        const out = new Int16Array(Math.floor(input.length / ratio));
        for (let i = 0; i < out.length; i++) {
          const a = Math.floor(i * ratio);
          const b = Math.min(input.length, Math.max(a + 1, Math.floor((i + 1) * ratio)));
          let sum = 0;
          for (let j = a; j < b; j++) sum += input[j];
          const v = Math.max(-1, Math.min(1, sum / (b - a)));
          out[i] = v < 0 ? v * 0x8000 : v * 0x7fff;
        }
        // Kui päästekorraldaja räägib, saadetakse vaikust (muidu tuvastataks kõlarist kostev hääl helistaja jutuna),
        // välja arvatud siis, kui helistaja räägib selgelt vahele.
        if (speaking && !bargeIn) {
          held.push(out);
          if (held.length > 12) held.shift(); // ~3 s
          sendChunk(new Int16Array(out.length));
          return;
        }
        if (held.length) {
          // Värav avanes. Kui helistaja rääkis vahele, saada kogu hoitud heli järele. Kui päästekorraldaja lihtsalt lõpetas,
          // saada järele ainult see osa, kus helistaja juba rääkis (vähemalt kolm kõnetugevusega tükki), et lause algus ei kaoks.
          const loud = (c: Int16Array) => {
            let sum = 0;
            for (let i = 0; i < c.length; i += 4) sum += c[i] * c[i];
            return Math.sqrt(sum / (c.length / 4)) > 900;
          };
          const first = bargeIn ? 0 : held.findIndex(loud);
          if (first >= 0 && (bargeIn || held.slice(first).filter(loud).length >= 3)) for (const h of held.slice(first)) sendChunk(h);
          held = [];
        }
        // Kui üks lause on kestnud üle 12 s, lõpeta see ise ära, et päästekorraldaja saaks vastata.
        const force = startMs !== null && !timer && performance.now() - speechStartedAt > 12000;
        if (force) speechStartedAt = performance.now();
        sendChunk(out, force);
      };
      src.connect(node);
      node.connect(mute).connect(ctx.destination); // ScriptProcessor töötab ainult siis, kui see on väljundiga ühendatud
      live = ws;
      liveNode = node;
      return true;
    } catch (e) {
      console.warn('[voice] voogtuvastus ei käivitunud', e);
      return false;
    }
  }

  function startVad() {
    if (!stream) return;
    if (!audioCtx) return;
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
            bargeIn = true;
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
        bargeIn = false;
        restartRecorder({ startMs: speechStart, endMs: Math.max(speechStart, now() - quietMs) });
      } else if (!live && !inSpeech && !loudMs && performance.now() - recorderStartedAt > IDLE_RESTART_MS) {
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
      callState = null;
      // Lae tõenäolisemad kindlad laused ette, et esimene küsimus tuleks viivituseta.
      for (const t of Object.keys(STATIC_AUDIO).slice(0, 24)) void staticAudio(t);
      messages.length = 0;

      // Heli tuleb avada KOHE, veel helistamisnupu vajutuse sees (enne ühtegi await'i): muidu on telefonis vaikus.
      try {
        const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        audioCtx = new Ctx();
        void audioCtx.resume();
        try {
          captureCtx = new Ctx({ sampleRate: 16000 });
          void captureCtx.resume();
        } catch {
          captureCtx = null;
        }
        const comp = audioCtx.createDynamicsCompressor();
        comp.connect(audioCtx.destination);
        output = comp;
        const silent = audioCtx.createBufferSource();
        silent.buffer = audioCtx.createBuffer(1, 1, 22050);
        silent.connect(audioCtx.destination);
        silent.start();
      } catch {
        audioCtx = null;
      }
      // iPhone'i hääletu režiim summutab Web Audio. Vaikne korduv <audio> element, mis käivitatakse samas puudutuses,
      // lülitab heliseansi "taasesituse" peale, nii et päästekorraldajat on kuulda ka siis, kui telefon on hääletu.
      try {
        const n = 2205;
        const wav = new DataView(new ArrayBuffer(44 + n * 2));
        const put = (o: number, t: string) => [...t].forEach((c, i) => wav.setUint8(o + i, c.charCodeAt(0)));
        put(0, 'RIFF');
        wav.setUint32(4, 36 + n * 2, true);
        put(8, 'WAVEfmt ');
        wav.setUint32(16, 16, true);
        wav.setUint16(20, 1, true);
        wav.setUint16(22, 1, true);
        wav.setUint32(24, 22050, true);
        wav.setUint32(28, 44100, true);
        wav.setUint16(32, 2, true);
        wav.setUint16(34, 16, true);
        put(36, 'data');
        wav.setUint32(40, n * 2, true);
        keepAlive = new Audio(URL.createObjectURL(new Blob([wav.buffer], { type: 'audio/wav' })));
        keepAlive.loop = true;
        keepAlive.setAttribute('playsinline', '');
        void keepAlive.play().catch(() => undefined);
      } catch {
        keepAlive = null;
      }

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        });
        startVad();
        // Esimene valik on voogtuvastus; kui see ei käivitu, lõigatakse heli tükkideks ja saadetakse /api/voice/stt-le.
        void startLive().then((ok) => {
          if (!ok && !stopped && !live) startRecorder();
        });
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
      const ws = live;
      live = null;
      ws?.close();
      liveNode?.disconnect();
      liveNode = null;
      stream?.getTracks().forEach((t) => t.stop());
      stream = null;
      keepAlive?.pause();
      keepAlive = null;
      await captureCtx?.close().catch(() => undefined);
      captureCtx = null;
      await audioCtx?.close().catch(() => undefined);
      audioCtx = null;
      output = null;
    },
  };
}
