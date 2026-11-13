import { pickScenario, OPENING_LINE } from './scenarios.js';
import { localDispatcher } from './dispatcher-local.js';

const $ = (s) => document.querySelector(s);
const landing = $('#landing');
const sim = $('#sim');
const scene = $('#scene');
const panel = $('#panel');
const video = $('#clip');

const CPR_SECONDS = 30; // compressed for the demo; the caption says the ambulance is minutes away
const CALL_TARGET = 30; // seconds from collapse to dialling

let S = null; // run state
let ticker = null;
let voiceOn = true;

document.querySelectorAll('[data-start]').forEach((b) => b.addEventListener('click', start));
$('#exit').addEventListener('click', exit);
$('#voice-toggle').addEventListener('click', (e) => {
  voiceOn = !voiceOn;
  e.currentTarget.textContent = voiceOn ? 'Voice on' : 'Voice off';
  e.currentTarget.setAttribute('aria-pressed', String(voiceOn));
  if (!voiceOn) window.speechSynthesis?.cancel();
});
video.addEventListener('error', () => { video.hidden = true; $('#scene-ph').hidden = false; });
video.addEventListener('canplay', () => { video.hidden = false; $('#scene-ph').hidden = true; video.play().catch(() => {}); });
document.addEventListener('keydown', (e) => {
  if (S?.phase === 'cpr' && e.code === 'Space' && !e.repeat) { e.preventDefault(); tap(); }
});

/* ---------- run lifecycle ---------- */

function start() {
  const { scenario, variant } = pickScenario();
  S = {
    scenario, variant, phase: 'scene',
    t0: performance.now(), penalty: 0, callAt: null,
    done: { response: false, breathing: false, aed: false },
    harm: [],
    messages: [], lastAsked: 'what', remote: null, busy: false,
    facts: { what: false, location: false, conscious: 'unknown', breathing: 'unknown' },
    misreadBreathing: false,
    taps: [], cprStart: null, cprTimer: null,
  };
  landing.hidden = true;
  sim.hidden = false;
  window.scrollTo(0, 0);
  $('#sim-loc').textContent = scenario.location.short;
  setClip('collapse', scenario.intro);
  renderScene();
  clearInterval(ticker);
  ticker = setInterval(tick, 250);
  tick();
}

function exit() {
  clearInterval(ticker);
  clearInterval(S?.cprTimer);
  window.speechSynthesis?.cancel();
  S = null;
  sim.hidden = true;
  landing.hidden = false;
}

const elapsed = () => (performance.now() - S.t0) / 1000 + S.penalty;
const clock = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
function tick() { if (S && S.phase !== 'debrief') $('#timer').textContent = clock(elapsed()); }

// Plays videos/<name>.mp4 when it exists, otherwise the drawn placeholder.
function setClip(name, caption) {
  scene.dataset.clip = name;
  $('#clip-tag').textContent = `placeholder · videos/${name}.mp4`;
  video.src = `videos/${name}.mp4`;
  if (caption) $('#caption').textContent = caption;
}

/* ---------- phase 1: the scene ---------- */

const ACTIONS = {
  response: { label: 'Check if he responds', run: () => { S.done.response = true; setClip('unresponsive', S.variant.responseCheck); } },
  breathing: { label: 'Check his breathing', run: () => { S.done.breathing = true; setClip('gasping', S.variant.breathingCheck); } },
  aed: { label: 'Send someone for a defibrillator', run: () => { S.done.aed = true; note('You point at a woman nearby: "You, find a defibrillator and bring it here!" She runs to the shopping centre.'); } },
  water: { label: 'Give him some water', bad: 8, run: () => note('He cannot swallow. Never give food or drink to someone who is unconscious. You lost time.', true) },
  wait: { label: 'Wait and see if he comes round', bad: 15, run: () => note('Fifteen seconds pass. Nothing changes, and every minute without help lowers his chances.', true) },
  recovery: { label: 'Roll him into the recovery position', bad: 10, run: () => note('The recovery position is only for someone who is breathing normally. Have you checked?', true) },
};

function act(id) {
  const a = ACTIONS[id];
  if (a.bad) { S.penalty += a.bad; S.harm.push(a.label); }
  a.run();
  if (S.phase === 'scene') renderScene();
  else if (S.phase === 'call') renderHands();
}

function note(text, bad = false) {
  S.note = { text, bad };
  $('#caption').textContent = text;
}

function renderScene() {
  panel.innerHTML = `
    <span class="mono">What do you do?</span>
    <h2>He is on the ground and not moving.</h2>
    <div class="acts">
      ${['response', 'breathing', 'water', 'recovery', 'wait'].map(actButton).join('')}
      <button class="act act-call" data-call>Call 112</button>
    </div>
    ${S.note?.bad ? `<p class="feedback bad"></p>` : ''}`;
  if (S.note?.bad) panel.querySelector('.feedback').textContent = S.note.text;
  panel.querySelectorAll('[data-act]').forEach((b) => b.addEventListener('click', () => act(b.dataset.act)));
  panel.querySelector('[data-call]').addEventListener('click', startCall);
}

const actButton = (id) =>
  `<button class="act ${S.done[id] ? 'done' : ''}" data-act="${id}">${ACTIONS[id].label}</button>`;

/* ---------- phase 2: the 112 call ---------- */

function startCall() {
  S.phase = 'call';
  S.callAt = elapsed();
  S.note = null;
  panel.innerHTML = `
    <div class="call-head"><span class="call-dot"></span><strong>112</strong><span class="mono" id="mode">connecting</span></div>
    <div class="thread" id="thread" aria-live="polite"></div>
    <form class="say" id="say">
      <input id="say-input" autocomplete="off" placeholder="Say something to the dispatcher" aria-label="Your reply">
      <button type="button" class="btn btn-ghost mic" id="mic" title="Speak" hidden>Mic</button>
      <button class="btn btn-primary">Send</button>
    </form>
    <span class="mono">While you talk</span>
    <div class="acts-row" id="hands"></div>`;
  renderHands();
  $('#say').addEventListener('submit', (e) => {
    e.preventDefault();
    const input = $('#say-input');
    const text = input.value.trim();
    if (!text || S.busy) return;
    input.value = '';
    callerSays(text);
  });
  setupMic();
  addMsg('dispatcher', OPENING_LINE);
  $('#say-input').focus();
}

function renderHands() {
  const hands = $('#hands');
  if (!hands) return;
  hands.innerHTML = ['response', 'breathing', 'aed'].map(actButton).join('');
  hands.querySelectorAll('[data-act]').forEach((b) => b.addEventListener('click', () => act(b.dataset.act)));
}

function addMsg(role, text) {
  S.messages.push({ role, text });
  const el = document.createElement('div');
  el.className = `msg ${role}`;
  el.textContent = text;
  const thread = $('#thread');
  thread.append(el);
  thread.scrollTop = thread.scrollHeight;
  if (role === 'dispatcher') speak(text);
}

async function callerSays(text) {
  addMsg('caller', text);
  S.busy = true;
  const typing = document.createElement('div');
  typing.className = 'msg dispatcher typing';
  typing.textContent = '…';
  $('#thread').append(typing);

  const run = S;
  const reply = await dispatch();
  if (S !== run || S.phase !== 'call') return; // run was exited meanwhile
  typing.remove();
  S.busy = false;

  S.facts = reply.facts;
  S.lastAsked = reply.asked;
  if (reply.facts.breathing === 'normal') S.misreadBreathing = true;
  $('#mode').textContent = S.remote ? 'AI dispatcher' : 'scripted dispatcher';
  addMsg('dispatcher', reply.say);
  if (reply.action === 'start_cpr') {
    $('#say').querySelectorAll('input,button').forEach((n) => (n.disabled = true));
    setTimeout(() => { if (S === run) startCpr(); }, 2500);
  }
}

// Grok via /api/dispatcher; falls back to the scripted dispatcher for the rest of the run on any failure.
async function dispatch() {
  const payload = {
    scenarioId: S.scenario.id, variantId: S.variant.id,
    messages: S.messages, facts: S.facts, lastAsked: S.lastAsked,
  };
  if (S.remote !== false) {
    try {
      const ctl = new AbortController();
      const timer = setTimeout(() => ctl.abort(), 12000);
      const r = await fetch('api/dispatcher', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload), signal: ctl.signal,
      });
      clearTimeout(timer);
      if (!r.ok) throw new Error(`dispatcher ${r.status}`);
      const out = await r.json();
      S.remote = true;
      return out;
    } catch (err) {
      console.warn('Using scripted dispatcher:', err.message);
      S.remote = false;
    }
  }
  return localDispatcher({ ...payload, scenario: S.scenario });
}

function speak(text) {
  if (!voiceOn || !window.speechSynthesis) return;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'en-GB';
  u.rate = 1.05;
  window.speechSynthesis.speak(u);
}

function setupMic() {
  const Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
  const mic = $('#mic');
  if (!Rec) return;
  mic.hidden = false;
  const rec = new Rec();
  rec.lang = 'en-GB';
  rec.interimResults = false;
  rec.onresult = (e) => {
    const text = e.results[0][0].transcript.trim();
    if (text && S?.phase === 'call' && !S.busy) callerSays(text);
  };
  rec.onend = () => mic.classList.remove('on');
  rec.onerror = () => mic.classList.remove('on');
  mic.addEventListener('click', () => {
    if (mic.classList.contains('on')) return rec.stop();
    window.speechSynthesis?.cancel();
    mic.classList.add('on');
    try { rec.start(); } catch { mic.classList.remove('on'); }
  });
}

/* ---------- phase 3: chest compressions ---------- */

function startCpr() {
  S.phase = 'cpr';
  setClip('cpr', 'You kneel beside him with the phone on speaker. Push on the centre of his chest and keep going.');
  panel.innerHTML = `
    <div class="call-head"><span class="call-dot"></span><strong>112 on speaker</strong></div>
    <div class="cpr">
      <button class="pad" id="pad">PUSH</button>
      <div class="rate"><span id="rate">0</span><small>per minute</small></div>
      <p class="coach" id="coach" aria-live="polite">Tap the button or press Space for every compression.</p>
      <div class="bar" aria-hidden="true"><i id="bar"></i></div>
      <span class="mono" id="eta">Ambulance on its way</span>
      <div class="acts-row" id="hands"></div>
    </div>`;
  $('#pad').addEventListener('pointerdown', tap);
  renderHandsCpr();
}

function renderHandsCpr() {
  const hands = $('#hands');
  hands.innerHTML = S.done.aed ? '' : actButton('aed');
  hands.querySelector('[data-act]')?.addEventListener('click', () => { act('aed'); renderHandsCpr(); });
}

function tap() {
  const now = performance.now();
  if (!S.cprStart) {
    S.cprStart = now;
    S.cprTimer = setInterval(cprTick, 250);
  }
  S.taps.push(now);
  scene.classList.add('push');
  $('#pad').classList.add('hit');
  setTimeout(() => { scene.classList.remove('push'); $('#pad')?.classList.remove('hit'); }, 110);
  $('#rate').textContent = Math.round(liveRate());
}

// Pace over the last few compressions.
function liveRate() {
  const t = S.taps.slice(-6);
  return t.length < 2 ? 0 : ((t.length - 1) / (t.at(-1) - t[0])) * 60000;
}

function cprTick() {
  const now = performance.now();
  const secs = (now - S.cprStart) / 1000;
  const rate = liveRate();
  const idle = now - S.taps.at(-1) > 2500;
  const pace = idle ? 'off' : rate >= 100 && rate <= 120 ? 'good' : S.taps.length > 3 ? 'off' : '';
  $('#pad').dataset.pace = pace;
  if (idle) $('#rate').textContent = '0';

  const line = idle ? 'Do not stop. Keep pushing.'
    : S.taps.length <= 3 ? 'Push hard and fast.'
    : rate < 100 ? 'Faster. Push faster.'
    : rate > 120 ? 'A little slower, and let the chest come back up.'
    : 'Good. Keep exactly that pace.';
  const coach = $('#coach');
  if (coach.textContent !== line) {
    coach.textContent = line;
    if (!window.speechSynthesis?.speaking) speak(line);
  }

  $('#bar').style.width = `${Math.min(100, (secs / CPR_SECONDS) * 100)}%`;
  if (secs >= CPR_SECONDS) {
    clearInterval(S.cprTimer);
    S.phase = 'arrival';
    setClip('ambulance', 'Blue lights. The paramedics take over with a defibrillator. You kept blood moving to his brain until they got here.');
    setTimeout(debrief, 2600);
  }
}

/* ---------- phase 4: debrief ---------- */

function averageRate() {
  const t = S.taps;
  return t.length < 2 ? 0 : Math.round(((t.length - 1) / (t.at(-1) - t[0])) * 60000);
}

function debrief() {
  if (!S) return;
  S.phase = 'debrief';
  clearInterval(ticker);
  window.speechSynthesis?.cancel();
  const rate = averageRate();
  const f = S.facts;
  const checks = [
    [S.done.response, 'Checked whether he responds', 'Shake the shoulders and shout before anything else.'],
    [S.callAt <= CALL_TARGET, `Called 112 after ${Math.round(S.callAt)} s`, `Aim to be dialling within ${CALL_TARGET} seconds of the collapse.`],
    [f.location, 'Told the dispatcher where you are', 'The address is what gets the ambulance moving.'],
    [f.conscious === 'no', 'Reported that he is unresponsive', 'Say clearly that he does not react.'],
    [f.breathing === 'abnormal' && !S.misreadBreathing, 'Recognised that he is not breathing normally', 'Gasping or snoring is not breathing.'],
    [rate >= 100 && rate <= 120, `Compressions at ${rate} per minute`, 'The target is 100 to 120 per minute.'],
    [S.done.aed, 'Sent someone for a defibrillator', 'A defibrillator in the first minutes is his best chance.'],
    [S.harm.length === 0, S.harm.length ? `Lost time: ${S.harm.join(', ').toLowerCase()}` : 'Did nothing that cost time', 'Leave out anything that is not checking, calling or compressing.'],
  ];
  const score = checks.filter((c) => c[0]).length;

  panel.innerHTML = `
    <span class="mono">Debrief · ${S.variant.name}</span>
    <div class="score">${score}<small> / ${checks.length}</small></div>
    <ul class="checks">
      ${checks.map(([ok, title, hint]) => `<li class="${ok ? 'ok' : 'miss'}"><span>${ok ? '✓' : '✕'}</span><span>${title}${ok ? '' : `<em>${hint}</em>`}</span></li>`).join('')}
    </ul>
    <p class="lesson"><b>Remember</b>${S.variant.lesson}</p>
    <div class="debrief-actions">
      <button class="btn btn-primary" id="again">Run it again</button>
      <button class="btn btn-ghost" id="home">Back to start</button>
    </div>`;
  $('#again').addEventListener('click', start);
  $('#home').addEventListener('click', exit);
}
