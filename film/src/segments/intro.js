// intro (12 s, plays once, ends exactly on POSE_S1).
//
//   0–3     mid-conversation: she smiles and talks, cup at chest height in
//           her right hand, steam rising
//   3–5     she sips and lowers the cup
//   5–7     she starts a sentence; her lips keep moving, then falter;
//           a small frown, her gaze loses focus
//   7–9.5   she sets the cup down clumsily: it tilts and clatters onto the
//           saucer; her hand slides off it
//   9.5–12  she looks at the caller, confused, lips searching for words
//
// Her face stays symmetric: both mouth corners share one track, both lids
// share one track, and cheekSagR is never touched.

import { keys, periodic, blinks, sum } from '../tracks.js';
import { idleCamera } from '../camera.js';
import { neutralParams } from '../rig/params.js';
import { holdCupAt, armOf, armKeys } from '../rig/reach.js';
import { PATIENT_RIGHT } from '../rig/sides.js';
import { PROPS } from '../layout.js';

const durationS = 12;
const N = neutralParams(); // POSE_S1

// ---- where the cup is, as right-arm poses
const HOLD = holdCupAt({ X: -0.14, H: 0.07, D: 0.1 }, 30); // chest height
const HOLD_UP = holdCupAt({ X: -0.135, H: 0.085, D: 0.095 }, 33); // a small gesture as she talks
const SIP = holdCupAt({ X: -0.036, H: 0.175, D: 0.069 }, 50); // rim at her lips
const LOW = holdCupAt({ X: -0.17, H: 0.03, D: 0.13 }, 12); // lowered, just above the table
const LOW_DRIFT = holdCupAt({ X: -0.185, H: 0.034, D: 0.135 }, 6);
// reaching out to the saucer, the hand follows the line of her forearm
const OVER_SAUCER = holdCupAt({ X: PROPS.cup.X + 0.008, H: 0.03, D: PROPS.cup.D }, -28);
const ON_SAUCER = holdCupAt({ X: PROPS.cup.X, H: 0, D: PROPS.cup.D }, -30); // exactly where the cup stands
const REST = armOf(PATIENT_RIGHT, N);

const LAND = 8.5; // the moment the cup lands (frame 255) and she lets go

const corners = keys([[0, 0.6], [2.8, 0.6], [3.4, 0.2], [4.7, 0.25], [5.4, 0.3], [6.3, 0.05], [7.0, 0]]);
const lids = sum(
  keys([[0, 0.28], [3.0, 0.28], [3.8, 0.55], [4.4, 0.5], [5.0, 0.25], [6.5, 0.15], [7.4, 0.32], [9.3, 0.3], [10.0, N.lidL]]),
  blinks([1.3, 2.62, 4.6, 6.9, 8.95, 10.65]),
);

export default {
  id: 'intro',
  durationS,
  loop: false,
  from: null, // the film opens mid-conversation
  to: 'POSE_S1',

  tracks: {
    breath: periodic({ lengthS: durationS, cycles: 3, amp: 0.28, shape: 'breath' }),

    // ---- face
    mouthCornerL: corners,
    mouthCornerR: corners,
    lidL: lids,
    lidR: lids,
    browKnit: keys([[0, 0], [5.8, 0.05], [6.7, 0.5], [8.3, 0.4], [10.0, 0.62], [11.4, N.browKnit]]),
    browRaise: keys([[0, 0.3], [3.0, 0.3], [3.8, 0.1], [5.2, 0.25], [6.4, 0], [9.8, 0.25], [11.3, 0]]),
    // talking, a sip, a sentence that falters, then lips searching for words
    mouthOpen: keys([
      [0, 0.25], [0.18, 0.5], [0.36, 0.15], [0.55, 0.42], [0.8, 0.1], [1.0, 0.38], [1.15, 0.2], [1.4, 0.55],
      [1.62, 0.12], [1.9, 0.3], [2.05, 0.08], [2.3, 0.45], [2.5, 0.18], [2.7, 0.34], [2.95, 0.1],
      [3.5, 0.2], [3.9, 0.3], [4.4, 0.3], [4.9, 0.08],
      [5.2, 0.3], [5.38, 0.12], [5.6, 0.45], [5.8, 0.2], [6.0, 0.36], [6.2, 0.15], [6.4, 0.26], [6.62, 0.16], [6.85, 0.2], [7.1, 0.14],
      [7.6, 0.12], [8.6, 0.1],
      [9.7, 0.1], [9.95, 0.3], [10.15, 0.14], [10.5, 0.12], [10.8, 0.26], [11.0, 0.13], [11.5, N.mouthOpen],
    ]),
    gazeX: keys([[0, 0], [5.9, 0], [6.6, 0.3], [7.2, 0.25], [7.7, -0.45], [9.2, -0.4], [9.9, N.gazeX]]),
    gazeY: keys([[0, 0], [3.4, 0.5], [4.4, 0.5], [5.0, 0], [6.6, 0.25], [7.7, 0.75], [9.2, 0.7], [9.9, N.gazeY]]),

    // ---- head
    headPitch: sum(
      keys([[0, 0], [0.6, 2], [1.3, -1], [2.1, 1.5], [2.9, 0], [3.9, -5], [4.3, -5], [5.0, 0], [7.6, 6], [9.2, 5], [10.0, N.headPitch]]),
      periodic({ lengthS: durationS, cycles: 1, amp: 0.4 }),
    ),
    headYaw: keys([[0, 0], [1.5, 2], [2.8, -1], [5.0, 0], [6.6, 3], [7.7, -7], [9.2, -6], [10.0, N.headYaw]]),
    headRoll: sum(
      keys([[0, 2], [1.8, 4], [3.0, 3], [5.6, 3], [6.8, 6.5], [9.5, N.headRoll]]),
      periodic({ lengthS: durationS, cycles: 2, amp: 0.5 }),
    ),

    // ---- right arm and the cup
    ...armKeys(PATIENT_RIGHT, [
      [0, HOLD], [1.1, HOLD_UP], [2.2, HOLD], [3.0, HOLD],
      [3.9, SIP], [4.3, SIP],
      [5.0, LOW], [7.0, LOW_DRIFT],
      [8.15, OVER_SAUCER],
      [LAND, ON_SAUCER, 'easeInCubic'],
      [8.75, ON_SAUCER],
      [9.6, REST],
    ]),
    armRGrip: keys([[0, 1], [8.6, 1], [9.4, N.armRGrip]]),
    cupAttach: keys([[0, 1], [LAND, 0, 'hold']]),
  },

  sceneTracks: {
    // radians; she tips it to drink, carries it down crooked, and it rocks on the saucer
    cupTilt: keys([
      [0, 0], [3.5, 0], [3.95, 0.12], [4.3, 0.12], [4.8, 0], [7.3, 0],
      [8.2, 0.2], [LAND, 0.16, 'linear'],
      [8.62, -0.11, 'easeOutSine'], [8.76, 0.07], [8.9, -0.035], [9.05, 0.012], [9.2, 0],
    ]),
    steam: keys([[0, 1], [5.0, 0.8], [7.5, 0.45], [9.5, 0.12], [11.0, 0]]),
  },

  // Same sway as s1 (4 s). The drift is half of s1's, over half the time, so
  // the camera's speed matches where the two meet.
  camera: idleCamera(durationS, { driftPx: 2 }),
};
