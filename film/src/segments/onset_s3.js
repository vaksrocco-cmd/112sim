// onset_s3 (6 s, plays once if the change went unreported: POSE_S2 → POSE_S3).
//
//   0–2    her eyelids become heavy and her head nods forward
//   2–4.5  her torso sinks sideways to HER RIGHT against the chair back; her
//          head rolls toward her right shoulder; her right arm slides off
//          the table and hangs
//   4.5–6  she settles, eyes closed
//
// She stays in the chair and the cup stays on its saucer (cupAttach is never
// touched): no fall, no spill.

import { keys } from '../tracks.js';
import { idleCamera } from '../camera.js';
import { poseParams } from '../poses.js';
import { reach, armOf, armKeys } from '../rig/reach.js';
import { PATIENT_RIGHT, PATIENT_LEFT } from '../rig/sides.js';

const durationS = 6;
const A = poseParams('POSE_S2');
const B = poseParams('POSE_S3');
const END = durationS;

// ---- right arm: off the far edge of the table, then hanging
const REST = armOf(PATIENT_RIGHT, A);
// At the edge the hand has turned to lie along it, so nothing of it is left
// over the table when it goes.
const DRAGGED = reach(PATIENT_RIGHT, { X: -0.224, H: 0.05, D: 0.034 }, 60); // pulled back and up a little as her shoulder goes
const AT_EDGE = reach(PATIENT_RIGHT, { X: -0.235, H: 0.075, D: -0.01 }, 86);
const OFF_EDGE = reach(PATIENT_RIGHT, { X: -0.25, H: -0.05, D: -0.06 }, 10);
const HANG = armOf(PATIENT_RIGHT, B);

// ---- left hand lets go and falls back into her lap
const HOLD = armOf(PATIENT_LEFT, A);
const LETTING_GO = reach(PATIENT_LEFT, { X: 0.0, H: 0.04, D: -0.03 }, 50);
const LAP = armOf(PATIENT_LEFT, B);

const lids = keys([[0, A.lidL], [1.0, 0.6], [1.8, 0.85], [2.4, 0.7], [3.2, 0.95], [4.2, 1], [END, 1]]);

export default {
  id: 'onset_s3',
  durationS,
  loop: false,
  from: 'POSE_S2',
  to: 'POSE_S3',

  tracks: {
    // ---- eyes and face go slack
    lidL: lids,
    lidR: lids,
    gazeX: keys([[0, A.gazeX], [1.5, -0.3], [3.0, B.gazeX], [END, B.gazeX]]),
    gazeY: keys([[0, A.gazeY], [2.0, 0.7], [4.0, B.gazeY], [END, B.gazeY]]),
    browKnit: keys([[0, A.browKnit], [1.8, 0.4], [3.6, 0.05], [4.4, B.browKnit], [END, B.browKnit]]),
    browRaise: keys([[0, A.browRaise], [1.5, 0.05], [2.5, 0], [END, 0]]),
    mouthOpen: keys([[0, A.mouthOpen], [2.0, 0.14], [4.4, 0.26], [5.4, B.mouthOpen], [END, B.mouthOpen]]),
    mouthCornerL: keys([[0, 0], [2.5, 0], [4.5, B.mouthCornerL], [END, B.mouthCornerL]]),

    // ---- head nods, then rolls toward HER RIGHT shoulder
    headPitch: keys([[0, A.headPitch], [1.9, 19], [2.6, 15], [4.5, 13], [5.4, B.headPitch], [END, B.headPitch]]),
    headRoll: keys([[0, A.headRoll], [2.0, 4], [4.3, -16], [5.2, B.headRoll], [END, B.headRoll]]),
    headYaw: keys([[0, A.headYaw], [2.0, -6], [4.5, B.headYaw], [END, B.headYaw]]),

    // ---- torso sinks to HER RIGHT (negative lean), into the chair back
    torsoLean: keys([[0, 0], [2.0, -0.04], [4.2, -0.8], [5.1, B.torsoLean], [END, B.torsoLean]]),
    torsoSlump: keys([[0, 0], [1.6, 0.12], [4.3, B.torsoSlump], [END, B.torsoSlump]]),
    breath: keys([[0, A.breath], [2.0, 0.15], [4.4, B.breath], [END, B.breath]]),

    // ---- arms
    ...armKeys(PATIENT_RIGHT, [[0, REST], [2.0, REST], [2.5, DRAGGED], [2.95, AT_EDGE], [3.5, OFF_EDGE], [4.4, HANG], [END, HANG]]),
    ...armKeys(PATIENT_LEFT, [[0, HOLD], [1.8, HOLD], [2.6, LETTING_GO], [3.6, LAP], [END, LAP]]),
    armLGrip: keys([[0, A.armLGrip], [1.8, A.armLGrip], [2.6, 0.3], [3.6, B.armLGrip], [END, B.armLGrip]]),
  },

  camera: idleCamera(durationS, { driftPx: 1 }),
};
