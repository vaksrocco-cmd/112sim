// POV camera. The camera is the caller's eyes, seated across the table.
//
// A camera state has two kinds of motion, because they look different:
//   x, y        the eye MOVES (breathing sway, drift). Layers shift by
//               x · parallax, so near layers move more than far ones.
//   panX, panY  the head TURNS (the look toward the hallway door). Every layer
//               shifts by the same amount, as in a real pan.
//   roll        degrees, around the frame centre.
//   zoom        1 = normal.
// All offsets are in pixels, relative to the rest position.

import { FRAME_W, FRAME_H, WORLD_W, WORLD_H } from './config.js';
import { periodic, cyclesNear } from './tracks.js';

/**
 * Top-left corner of the frame in world space at rest. The frame sits at the
 * LEFT of the 2600 px world (with a small margin for sway and roll), so all
 * the spare width is on the right, where the camera turns toward the hallway
 * door in the good ending.
 */
export const REST_ORIGIN = { x: 40, y: 60 };

/** Furthest the camera can pan right before the frame leaves the world. */
export const MAX_PAN_RIGHT = WORLD_W - FRAME_W - REST_ORIGIN.x - 12;

/** 40 mm-equivalent framing: horizontal field of view and pixels per degree of head turn. */
export const HFOV_DEG = (2 * Math.atan(18 / 40) * 180) / Math.PI;
export const PX_PER_DEGREE = FRAME_W / HFOV_DEG;

export function restCamera() {
  return { x: 0, y: 0, panX: 0, panY: 0, roll: 0, zoom: 1 };
}

/**
 * Set the transform for drawing a layer in world coordinates.
 * `parallax` is the layer's factor from the spec (0.2 far … 1.0 foreground).
 * Call inside ctx.save() / ctx.restore().
 */
export function applyLayerTransform(ctx, cam, parallax = 1) {
  ctx.translate(FRAME_W / 2, FRAME_H / 2);
  if (cam.roll) ctx.rotate((cam.roll * Math.PI) / 180);
  if (cam.zoom !== 1) ctx.scale(cam.zoom, cam.zoom);
  ctx.translate(-FRAME_W / 2, -FRAME_H / 2);
  ctx.translate(
    -(REST_ORIGIN.x + cam.panX + cam.x * parallax),
    -(REST_ORIGIN.y + cam.panY + cam.y * parallax),
  );
}

/**
 * Idle POV motion for a segment of `lengthS` seconds: breathing sway (about
 * 4 s period, 3 px vertical, 0.15° roll) and a very slow drift.
 * Every period divides the segment length, so loops close and every segment
 * starts and ends at the rest position with the sway in the same phase.
 * (30 s and 6 s segments get a 3.75 s / 3 s sway instead of 4 s.)
 */
export function idleCamera(lengthS, { swayPeriodS = 4, swayPx = 3, rollDeg = 0.15, driftPx = 4 } = {}) {
  const swayCycles = cyclesNear(lengthS, swayPeriodS);
  const swayY = periodic({ lengthS, cycles: swayCycles, amp: swayPx });
  const roll = periodic({ lengthS, cycles: swayCycles, amp: rollDeg });
  const driftX = periodic({ lengthS, cycles: 1, amp: driftPx });
  return (t) => ({
    x: driftX(t),
    y: swayY(t),
    panX: 0,
    panY: 0,
    roll: roll(t),
    zoom: 1,
  });
}

/** Largest difference between two camera states, for loop and join checks. */
export function cameraDelta(a, b) {
  let d = 0;
  for (const k of ['x', 'y', 'panX', 'panY', 'roll', 'zoom']) d = Math.max(d, Math.abs(a[k] - b[k]));
  return d;
}
