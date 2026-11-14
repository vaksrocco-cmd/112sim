// Named poses: the contract between segments (FILM_SPEC.md, "Named poses").
//
//   POSE_S1 = end of intro = start and end of s1 = start of onset_s2
//   POSE_S2 = end of onset_s2 = start and end of s2 = start of onset_s3 and end_good
//   POSE_S3 = end of onset_s3 = start and end of s3
//
// A pose lists only the parameters that differ from neutral (rig/params.js),
// and neutral IS the approved style frame, so POSE_S1 lists nothing.
// "Right" always means HER right, which is SCREEN LEFT.

import { neutralParams, unknownParams, PARAM_NAMES } from './rig/params.js';

export const POSES = {
  POSE_S1: {
    describe: 'Upright, slightly hunched, head tilted 5°. Symmetric face, brows knit, lips slightly parted, gaze toward the caller but unfocused. Right hand on the table beside the cup, left hand in lap.',
    params: {},
  },

  POSE_S2: {
    describe: 'As S1 with shoulders a little higher. Her right mouth corner and cheek dropped clearly, left side normal, eyes on her right hand. Right hand limp on the table, palm down; left hand holding her right forearm.',
    params: {
      // body: same as S1, shoulders a little higher (tense)
      breath: 0.3,
      // face: HER right corner and cheek dropped, her left side untouched
      mouthCornerR: -1,
      cheekSagR: 1,
      mouthOpen: 0.1,
      browKnit: 0.7,
      browRaise: 0.2,
      // eyes on her right hand (screen left, down on the table)
      gazeX: -0.55,
      gazeY: 0.85,
      lidL: 0.34,
      lidR: 0.34,
      headYaw: -8,
      headPitch: 11,
      // right hand limp on the table, palm down: the arm stays where it was
      // left hand across her body, holding her right forearm above the wrist
      armLShoulder: 68.8,
      armLSwing: 67.8,
      armLElbow: 26.5,
      armLWrist: 14.2,
      armLGrip: 0.7,
    },
  },

  POSE_S3: {
    describe: 'Slumped to her right against the chair back, head toward her right shoulder. Eyes closed, mouth slightly open, face relaxed and asymmetric. Right arm hanging beside the chair, left hand loose in lap; cup untouched.',
    params: {
      // slumped to HER right, held by the chair back
      torsoLean: -0.75,
      torsoSlump: 1,
      // head resting toward her right shoulder
      headRoll: -14,
      headPitch: 11,
      headYaw: -5,
      // eyes closed, mouth slightly open, face slack and asymmetric
      lidL: 1,
      lidR: 1,
      mouthOpen: 0.22,
      mouthCornerR: -1,
      mouthCornerL: -0.12,
      cheekSagR: 1,
      browKnit: 0,
      gazeY: 0.4,
      // right arm off the table, hanging straight down beside the chair
      armRShoulder: 3,
      armRSwing: 0,
      armRElbow: 8,
      armRWrist: 0,
      // left hand loose in her lap: the neutral left arm
    },
  },
};

for (const [name, pose] of Object.entries(POSES)) {
  const bad = unknownParams(pose.params);
  if (bad.length) throw new Error(`${name} uses unknown rig parameter(s): ${bad.join(', ')}`);
}

/** Full parameter set for a named pose (neutral values filled in). */
export function poseParams(name) {
  const pose = POSES[name];
  if (!pose) throw new Error(`Unknown pose "${name}"`);
  return { ...neutralParams(), ...pose.params };
}

/** Parameters where `params` differs from the named pose by more than `tolerance`. */
export function poseMismatches(params, poseName, tolerance = 1e-6) {
  const target = poseParams(poseName);
  const out = [];
  for (const name of PARAM_NAMES) {
    if (Math.abs(params[name] - target[name]) > tolerance) {
      out.push({ name, value: params[name], expected: target[name] });
    }
  }
  return out;
}
