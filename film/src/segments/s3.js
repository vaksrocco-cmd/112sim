// s3 (30 s seamless loop on POSE_S3): unresponsive but breathing.
//
// Nothing moves except her breathing, the light and the curtain. The caller
// has to be able to answer "is she breathing?" from the picture, so the
// breathing is the largest motion in the frame.
//
// This loop can play four or five times in a row. To avoid an obvious repeat:
//   breath   six breaths of 5 s; their depth varies over the full 30 s
//   light    drifts with a 30 s period
//   curtain  two motions with 15 s and 10 s periods, mixed differently in
//            the two panels
// so nothing in it repeats sooner than the loop itself.

import { periodic } from '../tracks.js';
import { idleCamera } from '../camera.js';

const durationS = 30;
const TAU = Math.PI * 2;

/** Six breaths of 5 s. Each rises and falls smoothly; depth varies from breath to breath. */
function breathing(t) {
  const depth = 0.88 + 0.08 * Math.sin((TAU * t) / 30) + 0.04 * Math.sin((TAU * 2 * t) / 30);
  // a slightly quicker in-breath than out-breath
  const u = (t / 5) % 1;
  const shaped = u < 0.42 ? u / 0.84 : 0.5 + (u - 0.42) / 1.16;
  return depth * (1 - Math.cos(TAU * shaped)) * 0.5;
}

export default {
  id: 's3',
  durationS,
  loop: true,
  from: 'POSE_S3',
  to: 'POSE_S3',

  // Her eyes stay closed and nothing else in the rig moves: every other
  // parameter holds its POSE_S3 value.
  tracks: {
    breath: breathing,
  },

  sceneTracks: {
    light: periodic({ lengthS: durationS, cycles: 1, amp: 1 }), // 30 s
    curtainA: periodic({ lengthS: durationS, cycles: 2, amp: 1 }), // 15 s
    curtainB: periodic({ lengthS: durationS, cycles: 3, amp: 1 }), // 10 s
  },

  camera: idleCamera(durationS),
};
