// onset_s2 (4 s, plays once at call 0:45: POSE_S1 → POSE_S2).
//
//   0–2    her RIGHT mouth corner sinks steadily and her right cheek flattens
//   1.5–3  she reaches for the cup with her right hand: the arm rises about
//          5 cm, wavers and drops back onto the table
//   3–4    she looks down at the hand and grips her right forearm with her
//          left hand
//
// Every stroke sign is on HER RIGHT = SCREEN LEFT: mouthCornerR, cheekSagR
// and the right arm. mouthCornerL is never touched.

import { keys, blinks, sum } from '../tracks.js';
import { idleCamera } from '../camera.js';
import { poseParams } from '../poses.js';
import { reach, armOf, armKeys } from '../rig/reach.js';
import { PATIENT_RIGHT, PATIENT_LEFT } from '../rig/sides.js';

const durationS = 4;
const A = poseParams('POSE_S1');
const B = poseParams('POSE_S2');

// ---- right arm: the failed lift. The wrist rests at X −0.2125, D 0.068.
const REST = armOf(PATIENT_RIGHT, A);
const LIFT = reach(PATIENT_RIGHT, { X: -0.232, H: 0.05, D: 0.082 }, 26); // about 5 cm up, toward the cup
const DIP = reach(PATIENT_RIGHT, { X: -0.226, H: 0.034, D: 0.078 }, 30);
const LIFT2 = reach(PATIENT_RIGHT, { X: -0.236, H: 0.047, D: 0.085 }, 24);
const SAG = reach(PATIENT_RIGHT, { X: -0.228, H: 0.036, D: 0.08 }, 29);

// ---- left arm: from her lap, over the table edge, onto her right forearm
const LAP = armOf(PATIENT_LEFT, A);
const OVER_EDGE = reach(PATIENT_LEFT, { X: 0.03, H: 0.05, D: -0.03 }, 45);
const HOLD = armOf(PATIENT_LEFT, B);

const lids = sum(
  keys([[0, A.lidL], [1.6, 0.16], [2.6, 0.2], [3.5, B.lidL]]),
  blinks([0.85, 3.2]),
);

export default {
  id: 'onset_s2',
  durationS,
  loop: false,
  from: 'POSE_S1',
  to: 'POSE_S2',

  tracks: {
    // ---- the droop develops over the first two seconds, on HER RIGHT only
    mouthCornerR: keys([[0, 0], [2.0, B.mouthCornerR, 'easeInOutSine']]),
    cheekSagR: keys([[0, 0], [0.2, 0], [2.0, B.cheekSagR, 'easeInOutSine']]),

    // ---- face
    lidL: lids,
    lidR: lids,
    mouthOpen: keys([[0, A.mouthOpen], [0.5, 0.22], [0.9, 0.12], [1.4, 0.18], [2.2, 0.2], [3.2, 0.12], [3.8, B.mouthOpen]]),
    browKnit: keys([[0, A.browKnit], [1.6, 0.6], [2.4, 0.85], [3.6, B.browKnit]]),
    browRaise: keys([[0, 0], [2.3, 0.05], [2.95, 0.4], [3.7, B.browRaise]]),
    gazeX: keys([[0, A.gazeX], [1.3, 0], [1.75, -0.5], [3.0, -0.5], [3.5, B.gazeX]]),
    gazeY: keys([[0, A.gazeY], [1.3, A.gazeY], [1.75, 0.6], [3.0, 0.7], [3.5, B.gazeY]]),

    // ---- head and body
    headYaw: keys([[0, 0], [1.4, 0], [2.2, -5], [3.0, -6], [3.6, B.headYaw]]),
    headPitch: keys([[0, 0], [1.4, 0], [2.2, 5], [3.0, 8], [3.6, B.headPitch]]),
    breath: keys([[0, 0], [1.3, 0.18], [2.2, 0.5], [3.0, 0.22], [3.8, B.breath]]),

    // ---- right arm: reach, waver, drop
    ...armKeys(PATIENT_RIGHT, [
      [0, REST], [1.5, REST],
      [2.05, LIFT, 'easeOutCubic'],
      [2.25, DIP], [2.45, LIFT2], [2.62, SAG],
      [2.86, REST, 'easeInCubic'],
      [durationS, REST],
    ]),
    armRGrip: keys([[0, 0], [1.5, 0], [2.0, 0.3], [2.6, 0.22], [2.9, 0], [durationS, 0]]),

    // ---- left hand takes hold of her right forearm
    ...armKeys(PATIENT_LEFT, [[0, LAP], [2.75, LAP], [3.4, OVER_EDGE], [3.85, HOLD], [durationS, HOLD]]),
    armLGrip: keys([[0, A.armLGrip], [3.3, A.armLGrip], [3.9, B.armLGrip]]),
  },

  // one sway cycle; a small drift at the same speed as s1's
  camera: idleCamera(durationS, { driftPx: 0.67 }),
};
