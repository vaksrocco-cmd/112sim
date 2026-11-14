// Helpers for writing timelines: say where a hand should be, get arm angles.
// They assume the torso is at rest (no lean, no slump), which holds for every
// moment a hand is placed on purpose.

import { armIK, restShoulder, CUP_REACH } from './solve.js';
import { PATIENT_RIGHT, PATIENT_LEFT } from './sides.js';
import { keys } from '../tracks.js';

const DEG = Math.PI / 180;

const NAMES = {
  [PATIENT_RIGHT]: ['armRShoulder', 'armRSwing', 'armRElbow', 'armRWrist'],
  [PATIENT_LEFT]: ['armLShoulder', 'armLSwing', 'armLElbow', 'armLWrist'],
};

/**
 * Arm angles that put the wrist at table-space point `wrist` ({ X, H, D } in
 * metres) with the hand pointing `handYaw` degrees toward the body's midline
 * (0 = straight at the camera).
 */
export function reach(side, wrist, handYaw = 0) {
  const a = armIK(side, restShoulder(side), wrist, handYaw);
  const [lift, swing, elbow, wr] = NAMES[side];
  return { [lift]: a.lift, [swing]: a.swing, [elbow]: a.elbow, [wr]: a.wrist };
}

/**
 * Right-arm angles that hold the cup with its base at `base`. Matches
 * heldCupPosition() in solve.js, so with cupAttach = 1 the cup is drawn there.
 */
export function holdCupAt(base, handYaw = 30) {
  const psi = handYaw * DEG;
  return reach(PATIENT_RIGHT, {
    X: base.X - Math.sin(psi) * CUP_REACH,
    H: base.H + 0.045,
    D: base.D - Math.cos(psi) * CUP_REACH,
  }, handYaw);
}

/** The four arm angles of a side, taken from a parameter set (e.g. neutral). */
export function armOf(side, params) {
  const out = {};
  for (const n of NAMES[side]) out[n] = params[n];
  return out;
}

/**
 * Keyframe tracks for one arm from a list of [time, angles, easing?], where
 * `angles` comes from reach(), holdCupAt() or armOf().
 */
export function armKeys(side, list) {
  const out = {};
  for (const n of NAMES[side]) out[n] = keys(list.map(([t, a, e]) => [t, a[n], e]));
  return out;
}
