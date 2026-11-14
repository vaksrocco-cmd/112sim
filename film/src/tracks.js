// Tracks: functions of time (seconds within the segment) that drive rig and
// camera parameters. Three building blocks:
//   keys(...)      keyframes with easing
//   periodic(...)  idle motion that repeats a whole number of times per segment
//   blinks(...)    eyelid closures from a fixed list of times
// Combine them with sum(...). A track may also be a plain number (constant).

const { sin, cos, PI } = Math;

export const ease = {
  linear: (u) => u,
  hold: (u) => (u < 1 ? 0 : 1), // stay on the previous value, jump at the key
  easeInSine: (u) => 1 - cos((u * PI) / 2),
  easeOutSine: (u) => sin((u * PI) / 2),
  easeInOutSine: (u) => -(cos(PI * u) - 1) / 2,
  easeInCubic: (u) => u * u * u,
  easeOutCubic: (u) => 1 - (1 - u) ** 3,
  easeInOutCubic: (u) => (u < 0.5 ? 4 * u * u * u : 1 - (-2 * u + 2) ** 3 / 2),
};

function resolveEase(e) {
  if (typeof e === 'function') return e;
  if (e === undefined) return ease.easeInOutSine;
  if (!ease[e]) throw new Error(`Unknown easing "${e}"`);
  return ease[e];
}

/**
 * Keyframe track. Each key is [timeS, value, easing?]; the easing shapes the
 * move INTO that key from the one before it (default easeInOutSine).
 * Before the first key the track holds the first value; after the last, the last.
 *
 *   keys([[0, 0], [1.5, 1, 'easeOutCubic'], [4, 0]])
 */
export function keys(list) {
  if (!Array.isArray(list) || list.length === 0) throw new Error('keys() needs at least one key');
  const ks = list.map(([t, v, e], i) => {
    if (typeof t !== 'number' || typeof v !== 'number' || Number.isNaN(t) || Number.isNaN(v)) {
      throw new Error(`keys(): key ${i} must be [time, value, easing?]`);
    }
    return { t, v, e: resolveEase(e) };
  });
  for (let i = 1; i < ks.length; i++) {
    if (ks[i].t <= ks[i - 1].t) throw new Error(`keys(): times must increase (key ${i}, t=${ks[i].t})`);
  }
  const fn = (t) => {
    if (t <= ks[0].t) return ks[0].v;
    const last = ks[ks.length - 1];
    if (t >= last.t) return last.v;
    // Few keys per track, so a linear scan is fine.
    let i = 1;
    while (ks[i].t < t) i++;
    const a = ks[i - 1];
    const b = ks[i];
    const u = (t - a.t) / (b.t - a.t);
    return a.v + (b.v - a.v) * b.e(u);
  };
  fn.kind = 'keys';
  fn.keys = ks;
  return fn;
}

/**
 * Idle motion that fits a segment exactly: `cycles` whole periods in `lengthS`.
 * Value = offset + amp * wave(2π · cycles · t / lengthS + phase).
 * `shape: 'sin'` starts at 0; `shape: 'breath'` is (1 − cos)/2, which starts at 0,
 * peaks at 1 mid-cycle and has zero velocity at both ends.
 */
export function periodic({ lengthS, cycles, amp = 1, phase = 0, offset = 0, shape = 'sin' }) {
  if (!(lengthS > 0)) throw new Error('periodic(): lengthS must be > 0');
  if (!Number.isInteger(cycles) || cycles < 1) {
    throw new Error(`periodic(): cycles must be a whole number >= 1 (got ${cycles}); the period must divide the segment length`);
  }
  const w = (2 * PI * cycles) / lengthS;
  const wave = shape === 'breath' ? (x) => (1 - cos(x)) / 2 : sin;
  if (shape !== 'sin' && shape !== 'breath') throw new Error(`periodic(): unknown shape "${shape}"`);
  const fn = (t) => offset + amp * wave(w * t + phase);
  fn.kind = 'periodic';
  fn.periodS = lengthS / cycles;
  return fn;
}

/** Whole number of cycles in `lengthS` whose period is closest to `targetPeriodS`. */
export function cyclesNear(lengthS, targetPeriodS) {
  return Math.max(1, Math.round(lengthS / targetPeriodS));
}

/**
 * Eyelid closure (0 open – 1 closed) from a fixed list of blink times (seconds).
 * Irregular-looking but deterministic. Each blink closes fast and opens slower.
 */
export function blinks(times, { closeS = 0.07, holdS = 0.04, openS = 0.13 } = {}) {
  const ts = [...times].sort((a, b) => a - b);
  const total = closeS + holdS + openS;
  for (let i = 1; i < ts.length; i++) {
    if (ts[i] - ts[i - 1] < total) throw new Error(`blinks(): blinks at ${ts[i - 1]} s and ${ts[i]} s overlap`);
  }
  const fn = (t) => {
    for (const t0 of ts) {
      const d = t - t0;
      if (d < 0) break;
      if (d < closeS) return ease.easeInOutSine(d / closeS);
      if (d < closeS + holdS) return 1;
      if (d < total) return 1 - ease.easeInOutSine((d - closeS - holdS) / openS);
    }
    return 0;
  };
  fn.kind = 'blinks';
  fn.times = ts;
  fn.endS = ts.length ? ts[ts.length - 1] + total : 0;
  return fn;
}

/** Add tracks together (numbers allowed). */
export function sum(...parts) {
  const fns = parts.map(asTrack);
  const fn = (t) => {
    let v = 0;
    for (const f of fns) v += f(t);
    return v;
  };
  fn.kind = 'sum';
  fn.parts = fns;
  return fn;
}

export function constant(v) {
  const fn = () => v;
  fn.kind = 'constant';
  return fn;
}

export function asTrack(x) {
  if (typeof x === 'function') return x;
  if (typeof x === 'number') return constant(x);
  throw new Error(`Track must be a function or a number, got ${typeof x}`);
}

/** Evaluate a { name: track } object at time t into { name: number }. */
export function evalTracks(tracks, t) {
  const out = {};
  for (const name in tracks) {
    const v = asTrack(tracks[name])(t);
    // sin(2π·k) is not exactly 0 in floating point; without this, the frame
    // after a loop's last would differ from frame 0 by a rounding error
    out[name] = Math.abs(v) < 1e-9 ? 0 : v;
  }
  return out;
}

/**
 * Loop check on values: every track must give the same value at t = 0 and
 * t = lengthS. Returns a list of problems (empty when the loop closes).
 */
export function loopProblems(tracks, lengthS, tolerance = 1e-6) {
  const problems = [];
  for (const name in tracks) {
    const f = asTrack(tracks[name]);
    const a = f(0);
    const b = f(lengthS);
    if (Math.abs(a - b) > tolerance) {
      problems.push(`track "${name}" does not loop: ${a.toFixed(4)} at 0 s vs ${b.toFixed(4)} at ${lengthS} s`);
    }
  }
  return problems;
}
