// The rig's parameter set, from the "Character rig" table in FILM_SPEC.md.
// This list drives the preview sliders and the defaults for every frame.
//
// NEUTRAL = THE APPROVED STYLE FRAME. With every parameter at its neutral
// value the rig draws POSE_S1: head tilted 5°, brows a little knit, lips
// slightly parted, lids relaxed, right hand on the table, left hand in her lap.
//
// Sides: "R" and "L" in a name always mean HER right / HER left (sides.js).
// Her right is SCREEN LEFT.
//
// Directions:
//   torsoLean  − toward her right (screen left), + toward her left
//   headYaw    − turns toward screen left,       + toward screen right
//   headPitch  − chin up,                        + chin down
//   headRoll   − tilts toward her right shoulder, + toward her left
//   gazeX      − looks toward screen left,       + toward screen right
//   gazeY      − up,                             + down
//
// Arms. The spec lists "shoulder, elbow, wrist" angles. A shoulder is a ball
// joint, and one angle cannot put a hand both on the table and across the
// body, so the shoulder has two: Shoulder (lift forward) and Swing (toward
// the midline). All arm angles are absolute, in degrees:
//   Shoulder  0 = upper arm hangs straight down, + = raised forward
//   Swing     0 = straight ahead, + = toward the body's midline
//   Elbow     0 = straight, + = bent
//   Wrist     hand turned further toward the midline; the hand stays level
//   Grip      0 = open, 1 = closed. The spec lists grip for the right arm only;
//             the left needs it too, to hold her right forearm in POSE_S2.

export const RIG_PARAMS = [
  // Torso
  { name: 'breath', min: 0, max: 1, neutral: 0, group: 'Torso', note: 'chest rise, shoulder lift' },
  { name: 'torsoLean', min: -1, max: 1, neutral: 0, group: 'Torso', note: '− toward her right (screen left), + toward her left' },
  { name: 'torsoSlump', min: 0, max: 1, neutral: 0, group: 'Torso', note: 's3 collapse: she sinks and rounds, staying in the chair' },

  // Head
  { name: 'headYaw', min: -30, max: 30, neutral: 0, unit: '°', group: 'Head', note: '− toward screen left, + toward screen right' },
  { name: 'headPitch', min: -20, max: 20, neutral: 0, unit: '°', group: 'Head', note: '− chin up, + chin down' },
  { name: 'headRoll', min: -25, max: 25, neutral: 5, unit: '°', group: 'Head', note: '− toward her right shoulder, + toward her left' },

  // Eyes and brows
  { name: 'gazeX', min: -1, max: 1, neutral: 0, group: 'Eyes and brows', note: '− screen left, + screen right' },
  { name: 'gazeY', min: -1, max: 1, neutral: 0.08, group: 'Eyes and brows', note: '− up, + down' },
  { name: 'lidL', min: 0, max: 1, neutral: 0.2, group: 'Eyes and brows', note: '0 open – 1 closed, her left eye' },
  { name: 'lidR', min: 0, max: 1, neutral: 0.2, group: 'Eyes and brows', note: '0 open – 1 closed, her right eye' },
  { name: 'browKnit', min: 0, max: 1, neutral: 0.5, group: 'Eyes and brows' },
  { name: 'browRaise', min: 0, max: 1, neutral: 0, group: 'Eyes and brows' },

  // Mouth and cheek
  { name: 'mouthOpen', min: 0, max: 1, neutral: 0.16, group: 'Mouth and cheek' },
  { name: 'mouthCornerL', min: -1, max: 1, neutral: 0, group: 'Mouth and cheek', note: '−1 down – +1 up, her left' },
  { name: 'mouthCornerR', min: -1, max: 1, neutral: 0, group: 'Mouth and cheek', note: '−1 down – +1 up, her right (S2 droop)' },
  { name: 'cheekSagR', min: 0, max: 1, neutral: 0, group: 'Mouth and cheek', note: 'her right cheek (S2)' },

  // Right arm (her right, screen left)
  { name: 'armRShoulder', min: -20, max: 110, neutral: 18.8, unit: '°', group: 'Right arm (screen left)', note: 'lift forward; 0 = hanging' },
  { name: 'armRSwing', min: -60, max: 100, neutral: 10.4, unit: '°', group: 'Right arm (screen left)', note: 'toward the midline' },
  { name: 'armRElbow', min: 0, max: 155, neutral: 107.9, unit: '°', group: 'Right arm (screen left)', note: '0 = straight' },
  { name: 'armRWrist', min: -80, max: 80, neutral: 23.5, unit: '°', group: 'Right arm (screen left)', note: 'hand turned toward the midline' },
  { name: 'armRGrip', min: 0, max: 1, neutral: 0, group: 'Right arm (screen left)', note: '0 open – 1 closed' },

  // Left arm (her left, screen right)
  { name: 'armLShoulder', min: -20, max: 110, neutral: 0, unit: '°', group: 'Left arm (screen right)', note: 'lift forward; 0 = hanging' },
  { name: 'armLSwing', min: -60, max: 100, neutral: 30, unit: '°', group: 'Left arm (screen right)', note: 'toward the midline' },
  { name: 'armLElbow', min: 0, max: 155, neutral: 80, unit: '°', group: 'Left arm (screen right)', note: '0 = straight' },
  { name: 'armLWrist', min: -80, max: 80, neutral: 0, unit: '°', group: 'Left arm (screen right)', note: 'hand turned toward the midline' },
  { name: 'armLGrip', min: 0, max: 1, neutral: 0.25, group: 'Left arm (screen right)', note: '0 open – 1 closed' },

  // Props
  { name: 'cupAttach', min: 0, max: 1, step: 1, neutral: 0, group: 'Props', note: '0 = on the table, 1 = in her right hand' },
];

export const PARAM_NAMES = RIG_PARAMS.map((p) => p.name);

const BY_NAME = new Map(RIG_PARAMS.map((p) => [p.name, p]));

export function paramSpec(name) {
  return BY_NAME.get(name);
}

/** Every parameter at its neutral value: the approved style frame. */
export function neutralParams() {
  const out = {};
  for (const p of RIG_PARAMS) out[p.name] = p.neutral;
  return out;
}

/** Names in `obj` that are not rig parameters (catches typos in poses and tracks). */
export function unknownParams(obj) {
  return Object.keys(obj || {}).filter((k) => !BY_NAME.has(k));
}
