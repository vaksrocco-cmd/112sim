// Segment registry. Browsers cannot list a folder, so every segment file is
// imported here by hand. To add a segment: create segments/<id>.js with a
// default export, import it below and add it to the list.
//
// A segment is:
//   {
//     id, durationS,
//     loop: true | false,
//     from: 'POSE_X' | null,   // pose at t = 0
//     to:   'POSE_Y' | null,   // pose at t = durationS (the frame after the last)
//     tracks: { rigParam: track },        // see tracks.js and rig/params.js
//     sceneTracks?: { anyName: track },   // light, curtain, props, ...
//     camera?: (t) => cameraState,        // default: camera at rest
//     post?: { grade, vignette, grain, grainSize },
//     draw?: (frame) => void,             // default: the kitchen stack + rig
//   }
//
// The film's seven segments: intro, s1, onset_s2, s2, onset_s3, s3, end_good.

import test from './test.js';
import style from './style.js';
import intro from './intro.js';
import s1 from './s1.js';
import onsetS2 from './onset_s2.js';
import s2 from './s2.js';
import onsetS3 from './onset_s3.js';
import s3 from './s3.js';
import endGood from './end_good.js';

const list = [intro, s1, onsetS2, s2, onsetS3, s3, endGood, style, test];

export const SEGMENTS = {};
for (const seg of list) {
  if (SEGMENTS[seg.id]) throw new Error(`Duplicate segment id "${seg.id}"`);
  SEGMENTS[seg.id] = seg;
}
