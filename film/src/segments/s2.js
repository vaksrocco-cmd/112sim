// s2 (24 s seamless loop on POSE_S2): the change the caller must report.
//
//   0–6    she stares at her right hand; the fingers twitch, the hand does not lift
//   6–10   she tries again: her right shoulder hitches up, the arm stays on the table
//   10–14  her left hand rubs her right forearm
//   14–19  she looks up at the caller, frightened; her lips move, but only
//          the left side of her mouth moves properly
//   19–24  her gaze drops back to her hand; back to POSE_S2
//
// The asymmetry is constant: mouthCornerR and cheekSagR are not animated at
// all, so they hold their POSE_S2 values (her RIGHT side = SCREEN LEFT) for
// the whole loop. Only mouthCornerL moves when she speaks.

import { keys, periodic, blinks, sum } from '../tracks.js';
import { idleCamera } from '../camera.js';
import { poseParams } from '../poses.js';
import { reach, armOf, armKeys } from '../rig/reach.js';
import { PATIENT_LEFT } from '../rig/sides.js';

const durationS = 24;
const P = poseParams('POSE_S2');
const END = durationS;

// ---- left hand on her right forearm, rubbing along it
const HOLD = armOf(PATIENT_LEFT, P);
// Both ends of the rub stay over the table, so the hand never changes its
// place in the drawing order (which would show as a one-frame pop).
const RUB_BACK = reach(PATIENT_LEFT, { X: -0.122, H: 0.02, D: -0.004 }, 79); // toward her elbow
const RUB_FWD = reach(PATIENT_LEFT, { X: -0.104, H: 0.012, D: 0.026 }, 85); // toward her wrist

const lids = sum(
  keys([[0, P.lidL], [6.6, P.lidL], [7.3, 0.45], [8.6, 0.4], [9.6, P.lidL], [14.0, P.lidL], [14.8, 0.08], [18.6, 0.1], [19.8, P.lidL], [END, P.lidL]]),
  blinks([0.8, 3.1, 5.6, 7.55, 9.9, 12.3, 14.25, 16.0, 16.5, 18.9, 20.5, 22.3]),
);

export default {
  id: 's2',
  durationS,
  loop: true,
  from: 'POSE_S2',
  to: 'POSE_S2',

  tracks: {
    // breathing slightly faster than s1 (7 breaths in 24 s instead of 6),
    // around shoulders held a little high; deeper during the effort at 6–10
    breath: sum(
      periodic({ lengthS: durationS, cycles: 7, amp: 0.26, offset: P.breath, shape: 'breath' }),
      keys([[0, 0], [6.4, 0], [6.95, 0.22], [7.5, 0.12], [7.95, 0.24], [8.5, 0.02], [8.95, 0.14], [9.6, 0], [END, 0]]),
    ),
    // her right shoulder hitches: the whole upper body tips a little toward her left
    torsoLean: keys([[0, 0], [6.4, 0], [6.9, 0.16], [7.5, 0.11], [7.9, 0.19], [8.45, 0], [8.9, 0.12], [9.6, 0], [END, 0]]),

    // ---- her right hand: fingers twitch, nothing lifts
    armRGrip: keys([
      [0, 0], [1.1, 0], [1.25, 0.14], [1.5, 0], [2.5, 0], [2.62, 0.1], [2.85, 0.02],
      [4.2, 0], [4.32, 0.16], [4.55, 0.04], [4.75, 0.1], [5.3, 0],
      [6.8, 0], [7.2, 0.18], [8.0, 0.2], [8.6, 0], [END, 0],
    ]),

    // ---- left hand rubs her right forearm
    ...armKeys(PATIENT_LEFT, [
      [0, HOLD], [10.2, HOLD],
      [10.75, RUB_BACK], [11.25, RUB_FWD], [11.7, RUB_BACK], [12.25, RUB_FWD], [12.65, RUB_BACK], [13.25, RUB_FWD],
      [13.9, HOLD], [END, HOLD],
    ]),
    armLGrip: keys([[0, P.armLGrip], [10.2, P.armLGrip], [10.75, 0.5], [11.25, 0.62], [12.25, 0.5], [13.25, 0.6], [13.9, P.armLGrip], [END, P.armLGrip]]),

    // ---- face
    lidL: lids,
    lidR: lids,
    browKnit: keys([[0, P.browKnit], [6.6, P.browKnit], [7.3, 0.95], [8.6, 0.9], [9.8, P.browKnit], [14.0, P.browKnit], [14.9, 0.85], [18.6, 0.85], [20.0, P.browKnit], [END, P.browKnit]]),
    browRaise: keys([[0, P.browRaise], [6.8, 0.05], [9.6, P.browRaise], [14.0, P.browRaise], [14.8, 0.75], [18.4, 0.7], [19.8, P.browRaise], [END, P.browRaise]]),
    gazeX: keys([[0, P.gazeX], [2.4, -0.6], [3.0, -0.5], [5.0, -0.58], [10.4, P.gazeX], [14.0, P.gazeX], [14.55, 0], [18.7, 0], [19.4, P.gazeX], [END, P.gazeX]]),
    gazeY: keys([[0, P.gazeY], [14.0, P.gazeY], [14.55, 0.02], [18.7, 0.05], [19.4, P.gazeY], [END, P.gazeY]]),
    // her lips move when she looks up: irregular, and only as far as the weak side allows
    mouthOpen: keys([
      [0, P.mouthOpen], [6.8, P.mouthOpen], [7.4, 0.04], [8.6, 0.05], [9.6, P.mouthOpen], [14.6, P.mouthOpen],
      [15.0, 0.4], [15.2, 0.16], [15.45, 0.52], [15.7, 0.2], [15.95, 0.36], [16.2, 0.12],
      [16.9, 0.14], [17.1, 0.44], [17.32, 0.18], [17.6, 0.5], [17.85, 0.22], [18.1, 0.34], [18.4, 0.12],
      [19.4, P.mouthOpen], [END, P.mouthOpen],
    ]),
    // the corner on her healthy LEFT side works as she speaks; her right corner never moves
    mouthCornerL: keys([
      [0, 0], [14.8, 0], [15.0, 0.25], [15.45, -0.05], [15.95, 0.3], [16.3, 0.05],
      [17.1, 0.3], [17.6, 0], [18.1, 0.28], [18.5, 0], [END, 0],
    ]),

    // ---- head
    headYaw: keys([[0, P.headYaw], [6.6, P.headYaw], [7.4, -10], [9.4, P.headYaw], [14.0, P.headYaw], [14.7, 0], [18.7, 1], [19.6, P.headYaw], [END, P.headYaw]]),
    headPitch: sum(
      keys([[0, P.headPitch], [14.0, P.headPitch], [14.7, 1], [18.7, 2], [19.6, P.headPitch], [END, P.headPitch]]),
      periodic({ lengthS: durationS, cycles: 2, amp: 0.4 }),
    ),
    headRoll: sum(
      keys([[0, P.headRoll], [7.2, 7], [9.4, P.headRoll], [14.6, 3.5], [18.8, 4], [20.0, P.headRoll], [END, P.headRoll]]),
      periodic({ lengthS: durationS, cycles: 4, amp: 0.5 }),
    ),
  },

  camera: idleCamera(durationS),
};
