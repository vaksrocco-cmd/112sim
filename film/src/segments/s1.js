// s1 (24 s seamless loop, starts and ends on POSE_S1).
//
//   0–4    lips move in fragments, stop, try again
//   4–8    she frowns and turns her head slowly toward the window
//   8–12   she looks back toward the caller, opens her mouth, closes it
//   12–16  she looks down; her left hand fidgets with the edge of the envelope
//   16–20  a small frustrated shake of the head, brows knit
//   20–24  she settles back into POSE_S1
//
// Loop rules: every keyframe track starts and ends on its POSE_S1 value, and
// every idle motion makes a whole number of cycles in 24 s. Her face stays
// symmetric: both lids share one track; the mouth corners and cheekSagR are
// never touched, so no S2 sign can appear early.

import { keys, periodic, blinks, sum } from '../tracks.js';
import { idleCamera } from '../camera.js';
import { neutralParams } from '../rig/params.js';
import { reach, armOf, armKeys } from '../rig/reach.js';
import { PATIENT_LEFT } from '../rig/sides.js';

const durationS = 24;
const N = neutralParams(); // POSE_S1
const END = durationS;

// ---- left hand: from her lap, up over the table edge, to the far edge of the envelope
const LAP = armOf(PATIENT_LEFT, N);
const UP = reach(PATIENT_LEFT, { X: 0.1, H: 0.045, D: -0.03 }, 10); // above the edge, in front of her
const AT_EDGE = reach(PATIENT_LEFT, { X: 0.08, H: 0.006, D: 0.04 }, 5); // fingertips on the envelope's edge
const PUSH = reach(PATIENT_LEFT, { X: 0.075, H: 0.008, D: 0.05 }, -4);
const PULL = reach(PATIENT_LEFT, { X: 0.09, H: 0.006, D: 0.035 }, 12);

const lids = sum(
  keys([[0, N.lidL], [4.6, 0.12], [7.6, 0.14], [9.2, N.lidL], [12.2, N.lidL], [12.9, 0.5], [15.7, 0.48], [16.6, 0.3], [19.0, 0.3], [21.0, N.lidL], [END, N.lidL]]),
  blinks([1.15, 3.4, 5.3, 8.5, 9.9, 12.45, 14.9, 17.9, 19.3, 20.7, 22.6]),
);

export default {
  id: 's1',
  durationS,
  loop: true,
  from: 'POSE_S1',
  to: 'POSE_S1',

  tracks: {
    breath: periodic({ lengthS: durationS, cycles: 6, amp: 0.28, shape: 'breath' }),

    // ---- face
    lidL: lids,
    lidR: lids,
    mouthOpen: keys([
      [0, N.mouthOpen],
      // fragments, a stop, another try
      [0.5, 0.3], [0.68, 0.12], [0.9, 0.36], [1.1, 0.16], [1.3, 0.1],
      [2.2, 0.1], [2.4, 0.32], [2.62, 0.14], [2.85, 0.4], [3.1, 0.18], [3.35, 0.26], [3.6, 0.1],
      [4.5, 0.08], [8.8, 0.08],
      // opens her mouth, closes it
      [9.6, 0.2], [10.1, 0.52], [10.7, 0.5], [11.3, 0.06],
      [12.5, 0.06], [16.5, 0.03], [18.5, 0.05], [20.5, 0.2], [21.5, N.mouthOpen], [END, N.mouthOpen],
    ]),
    browKnit: keys([
      [0, N.browKnit], [1.0, 0.6], [4.2, 0.7], [5.0, 0.85], [8.0, 0.8], [9.0, 0.55], [10.2, 0.4], [11.5, 0.6],
      [13.0, 0.55], [16.2, 0.75], [17.0, 0.95], [19.0, 0.9], [21.0, 0.6], [22.5, N.browKnit], [END, N.browKnit],
    ]),
    browRaise: keys([[0, 0], [9.4, 0], [10.1, 0.35], [11.0, 0.1], [12.0, 0], [END, 0]]),
    gazeX: keys([
      [0, N.gazeX], [4.0, -0.2], [4.8, -0.6], [6.4, -0.75], [7.6, -0.5], [8.3, 0.3], [9.3, 0],
      [12.3, 0], [13.0, 0.25], [15.6, 0.2], [16.4, 0], [END, N.gazeX],
    ]),
    gazeY: keys([
      [0, N.gazeY], [4.6, -0.25], [7.6, -0.2], [9.2, N.gazeY], [12.2, N.gazeY], [12.9, 0.85], [15.7, 0.8],
      [16.5, 0.3], [19.0, 0.25], [21.0, N.gazeY], [END, N.gazeY],
    ]),

    // ---- head
    headYaw: keys([
      [0, 0], [4.2, 0],
      [6.4, -22], [7.5, -20], // toward the window, at screen left
      [9.2, 0], [12.4, 0], [13.2, 3], [15.8, 2], [16.6, 0],
      [16.95, 6], [17.3, -7], [17.65, 5], [18.0, -3.5], [18.4, 1], [18.9, 0], // the shake
      [END, 0],
    ]),
    headPitch: sum(
      keys([[0, 0], [4.6, -3], [7.6, -3], [9.2, 0], [12.2, 0], [13.0, 10], [15.7, 9], [16.6, 4], [19.0, 3], [21.5, 0], [END, 0]]),
      periodic({ lengthS: durationS, cycles: 2, amp: 0.4 }),
    ),
    headRoll: sum(
      keys([[0, N.headRoll], [5.0, 3], [7.6, 3], [9.2, 5.5], [12.2, 5], [13.0, 7], [15.8, 7], [16.6, 5], [20.0, 4], [22.0, N.headRoll], [END, N.headRoll]]),
      periodic({ lengthS: durationS, cycles: 4, amp: 0.5 }),
    ),

    // ---- left hand and the envelope
    ...armKeys(PATIENT_LEFT, [
      [0, LAP], [12.0, LAP],
      [12.7, UP], [13.25, AT_EDGE],
      [13.6, PUSH], [13.85, AT_EDGE], [14.2, PULL], [14.5, PUSH], [14.9, AT_EDGE], [15.2, PULL],
      [15.55, UP], [16.3, LAP], [END, LAP],
    ]),
    armLGrip: keys([
      [0, N.armLGrip], [12.6, N.armLGrip], [13.3, 0.45], [13.6, 0.3], [13.9, 0.5], [14.3, 0.3], [14.7, 0.5],
      [15.1, 0.35], [16.3, N.armLGrip], [END, N.armLGrip],
    ]),
  },

  camera: idleCamera(durationS),
};
