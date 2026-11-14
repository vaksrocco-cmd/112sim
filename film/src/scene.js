// The scene: one deterministic drawing function.
//
//   const scene = createScene(canvas);
//   scene.renderFrame('s1', 120);
//
// A frame depends only on (segmentId, frameIndex, options). There is no
// Math.random, no Date.now and no requestAnimationFrame anywhere under src/.

import { FRAME_W, FRAME_H, FPS, frameCount } from './config.js';
import { SEGMENTS } from './segments/index.js';
import { POSES, poseMismatches, poseParams } from './poses.js';
import { resolveParams, RIG_HAS_ARTWORK } from './rig/index.js';
import { unknownParams } from './rig/params.js';
import { evalTracks, loopProblems } from './tracks.js';
import { restCamera, cameraDelta } from './camera.js';
import { applyPost } from './post.js';
import { frameRng, helpers } from './rng.js';
import { drawKitchen } from './layers/stack.js';
import { warmLayers } from './layers/index.js';

function getSegment(segmentId) {
  const seg = SEGMENTS[segmentId];
  if (!seg) {
    throw new Error(`Unknown segment "${segmentId}". Known: ${Object.keys(SEGMENTS).join(', ')}`);
  }
  return seg;
}

/** id → durationS, as the spec asks for window.segments. */
export function segmentDurations() {
  const out = {};
  for (const id in SEGMENTS) out[id] = SEGMENTS[id].durationS;
  return out;
}

/** id → { durationS, frames, loop, from, to } for tools. */
export function segmentInfo() {
  const out = {};
  for (const id in SEGMENTS) {
    const s = SEGMENTS[id];
    out[id] = { durationS: s.durationS, frames: frameCount(s.durationS), loop: !!s.loop, from: s.from || null, to: s.to || null };
  }
  return out;
}

/**
 * Check a segment's contract without drawing anything:
 * known parameters and poses, the `from` pose at t = 0, the `to` pose at
 * t = durationS, and for loops that every track and the camera return to
 * where they started. Returns { ok, errors, warnings }.
 */
export function validateSegment(segmentId) {
  const errors = [];
  const warnings = [];
  let seg;
  try {
    seg = getSegment(segmentId);
  } catch (e) {
    return { ok: false, errors: [e.message], warnings };
  }

  let frames = 0;
  try {
    frames = frameCount(seg.durationS);
    if (frames < 1) errors.push('durationS must be positive');
  } catch (e) {
    errors.push(e.message);
  }

  const bad = unknownParams(seg.tracks);
  if (bad.length) errors.push(`tracks use unknown rig parameter(s): ${bad.join(', ')}`);

  for (const end of ['from', 'to']) {
    const name = seg[end];
    if (!name) continue;
    if (!POSES[name]) errors.push(`${end}: unknown pose "${name}"`);
    else if (POSES[name].placeholder) warnings.push(`${end}: ${name} is still a placeholder pose`);
  }
  if (seg.loop && (seg.from || null) !== (seg.to || null)) {
    errors.push(`loop segments must start and end on the same pose (from ${seg.from}, to ${seg.to})`);
  }

  if (errors.length === 0) {
    const D = seg.durationS;
    if (seg.from) {
      for (const m of poseMismatches(resolveParams(seg, 0), seg.from)) {
        errors.push(`first frame is not ${seg.from}: ${m.name} = ${m.value.toFixed(4)}, expected ${m.expected.toFixed(4)}`);
      }
    }
    if (seg.to) {
      for (const m of poseMismatches(resolveParams(seg, D), seg.to)) {
        errors.push(`frame after the last is not ${seg.to}: ${m.name} = ${m.value.toFixed(4)}, expected ${m.expected.toFixed(4)}`);
      }
    }
    if (seg.loop) {
      errors.push(...loopProblems(seg.tracks || {}, D));
      errors.push(...loopProblems(seg.sceneTracks || {}, D).map((p) => `scene ${p}`));
    }
    if (seg.camera && (seg.loop || seg.to)) {
      // A segment that is followed by another (a loop, or one with a `to`
      // pose) must end with the camera where it started, in the same phase.
      const d = cameraDelta(seg.camera(0), seg.camera(D));
      if (d > 1e-6) errors.push(`camera does not return to its start (difference ${d.toFixed(4)})`);
    }
  }

  if (!seg.draw && !RIG_HAS_ARTWORK) warnings.push('the rig has no artwork yet');
  return { ok: errors.length === 0, errors, warnings };
}

/**
 * Bind the scene to a canvas. The canvas is forced to 1920×1080.
 */
export function createScene(canvas) {
  canvas.width = FRAME_W;
  canvas.height = FRAME_H;
  // willReadFrequently keeps the canvas in software, which makes
  // toDataURL fast and the pixels independent of the GPU.
  const ctx = canvas.getContext('2d', { alpha: false, willReadFrequently: true });
  warmLayers();

  /**
   * Draw one frame.
   *   frameIndex  0 … frames−1. `frames` itself is allowed as the "frame after
   *               the last", used to check loops and joins.
   *   options.overrides  { rigParam: value } live overrides (preview sliders)
   *   options.post       false to skip post effects (bloom, grade, vignette, paper, grain)
   *   options.camera     { panX, x, ... } added on top of the segment's camera (for checks)
   * Returns what was used to draw: { t, params, scene, camera }.
   */
  function renderFrame(segmentId, frameIndex, options = {}) {
    const seg = getSegment(segmentId);
    const frames = frameCount(seg.durationS);
    if (!Number.isInteger(frameIndex) || frameIndex < 0 || frameIndex > frames) {
      throw new Error(`Frame ${frameIndex} is outside segment "${segmentId}" (0…${frames - 1})`);
    }
    const t = frameIndex / FPS;
    // In a loop, the frame after the last IS frame 0, including its grain.
    const seedFrame = seg.loop ? frameIndex % frames : frameIndex;

    const params = resolveParams(seg, t, options.overrides);
    const scene = seg.sceneTracks ? evalTracks(seg.sceneTracks, t) : {};
    const camera = { ...(seg.camera ? seg.camera(t) : restCamera()), ...(options.camera || {}) };
    // sin(2π·k) is not exactly 0: without this, a "resting" camera at the end
    // of a segment is off by a rounding error and the picture is resampled
    for (const k of ['x', 'y', 'panX', 'panY', 'roll']) if (Math.abs(camera[k]) < 1e-9) camera[k] = 0;

    ctx.reset();
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, FRAME_W, FRAME_H);

    const frame = {
      ctx,
      segment: seg,
      segmentId,
      frameIndex,
      frames,
      t,
      params,
      scene,
      camera,
      rng: helpers(frameRng(segmentId, seedFrame, 'draw')),
      options,
    };
    ctx.save();
    if (seg.draw) seg.draw(frame);
    else drawKitchen(frame);
    ctx.restore();

    if (options.post !== false) {
      applyPost(ctx, { segmentId, frameIndex: seedFrame, settings: seg.post });
    }
    return { t, params, scene, camera };
  }

  function grab(segmentId, frameIndex, options) {
    renderFrame(segmentId, frameIndex, options);
    return ctx.getImageData(0, 0, FRAME_W, FRAME_H).data;
  }

  /** Largest difference of any colour channel of any pixel, 0…255, and how many pixels differ. */
  function compare(a, b) {
    let max = 0;
    let count = 0;
    for (let i = 0; i < a.length; i += 4) {
      const d = Math.max(Math.abs(a[i] - b[i]), Math.abs(a[i + 1] - b[i + 1]), Math.abs(a[i + 2] - b[i + 2]));
      if (d > 0) count++;
      if (d > max) max = d;
    }
    return { max, count };
  }

  /**
   * Checks on the finished pictures, run by render.mjs before every render:
   *   loop   a loop's frame 0 against its "frame after the last" (frame N,
   *          never rendered): they must be the same picture, grain included
   *   from   the first frame against the declared `from` pose, drawn still
   *          with the camera at rest and nothing else moving
   *   to     frame N against the declared `to` pose, drawn the same way
   * Pose pictures are compared without post effects, because film grain
   * differs from segment to segment. Returns [{ name, max, count, ok }].
   */
  function checkSegment(segmentId, threshold = 2) {
    const seg = getSegment(segmentId);
    const frames = frameCount(seg.durationS);
    const results = [];
    const add = (name, a, b) => {
      const r = compare(a, b);
      results.push({ name, ...r, ok: r.max <= threshold });
    };
    if (seg.loop) add('loop: frame 0 = frame after the last', grab(segmentId, 0).slice(), grab(segmentId, frames));
    const still = (pose) => grab('style', 0, { post: false, overrides: poseParams(pose) }).slice();
    if (seg.from) add(`first frame = ${seg.from}`, still(seg.from), grab(segmentId, 0, { post: false }));
    if (seg.to) add(`frame after the last = ${seg.to}`, still(seg.to), grab(segmentId, frames, { post: false }));
    return results;
  }

  return {
    canvas,
    ctx,
    renderFrame,
    validateSegment,
    checkSegment,
    segments: segmentDurations(),
    segmentInfo: segmentInfo(),
  };
}
