// end_good (8 s, plays once, starts on POSE_S2). The clips are silent, so the
// ambulance's arrival is told with light, a head turn and a figure.
//
//   0–     a faint blue light pulses on the hallway wall, about 1.5 times a
//          second, as if from outside
//   1–2.5  the camera turns right toward the hallway door, like a head
//          turning at the doorbell
//   2.5–6  a paramedic steps into the doorway
//   6–8    hold on the doorway, blue light pulsing
//
// Helgi keeps POSE_S2's asymmetry throughout (mouthCornerR and cheekSagR are
// not animated); she turns her head toward the door too.

import { keys, periodic, blinks, sum } from '../tracks.js';
import { idleCamera, MAX_PAN_RIGHT } from '../camera.js';
import { poseParams } from '../poses.js';

const durationS = 8;
const P = poseParams('POSE_S2');
const END = durationS;
const TAU = Math.PI * 2;

// ---- the camera's turn. The frame can travel this far before it reaches the
// edge of the painted world: about 15° at this framing.
const TURN_PX = Math.min(600, MAX_PAN_RIGHT - 24);
const turn = keys([[0, 0], [1.0, 0], [2.5, 1, 'easeInOutSine'], [END, 1]]);
const idle = idleCamera(durationS, { driftPx: 1.3 });

function camera(t) {
  const c = idle(t);
  const u = turn(t);
  const mid = Math.sin(Math.PI * u); // 0 at both ends of the turn, 1 half-way
  return {
    ...c,
    panX: TURN_PX * u, // the head turns: everything slides the same way
    x: c.x + 16 * u, // and the eyes travel a little with it, which gives the layers their parallax
    y: c.y + 5 * mid,
    roll: c.roll + 0.35 * mid,
  };
}

/** Blue light: fades in over the first 0.8 s, then pulses 1.5 times a second. */
function blueLight(t) {
  const fadeIn = Math.min(1, t / 0.8);
  const pulse = (0.5 - 0.5 * Math.cos(TAU * 1.5 * t)) ** 1.4;
  return fadeIn * (0.22 + 0.78 * pulse);
}

const lids = sum(
  keys([[0, P.lidL], [1.4, P.lidL], [2.0, 0.14], [END, 0.16]]),
  blinks([0.9, 3.3, 5.4, 7.1]),
);

export default {
  id: 'end_good',
  durationS,
  loop: false,
  from: 'POSE_S2',
  to: null, // the app shows its ending screen after this clip

  tracks: {
    breath: periodic({ lengthS: durationS, cycles: 2, amp: 0.26, offset: P.breath, shape: 'breath' }),
    // she hears it too, and turns toward the door (screen right)
    headYaw: keys([[0, P.headYaw], [1.5, P.headYaw], [2.5, 16], [END, 15]]),
    headPitch: keys([[0, P.headPitch], [1.5, P.headPitch], [2.4, 2], [END, 2]]),
    gazeX: keys([[0, P.gazeX], [1.3, P.gazeX], [1.9, 0.6], [END, 0.55]]),
    gazeY: keys([[0, P.gazeY], [1.3, P.gazeY], [1.9, 0.1], [END, 0.1]]),
    lidL: lids,
    lidR: lids,
    browRaise: keys([[0, P.browRaise], [1.4, P.browRaise], [2.1, 0.55], [END, 0.45]]),
  },

  sceneTracks: {
    blueLight,
    // px to the right of the doorway's left edge; he starts hidden behind the wall
    medicX: keys([[0, -170], [2.5, -170], [4.3, 168, 'easeOutSine'], [END, 168]]),
    // three steps in, then both feet together
    medicStep: keys([[0, 0], [2.5, 0], [4.3, Math.PI * 3, 'linear'], [END, Math.PI * 3]]),
  },

  camera,
};
