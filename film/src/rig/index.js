// Character rig for Helgi.
//
// Tooling stage: the parameter plumbing is here, the artwork is not. The rig
// itself (painted shapes on a transform hierarchy: torso → neck → head → face
// parts; torso → shoulders → arms → hands) is built in Prompts 1 and 2.

import { neutralParams, unknownParams } from './params.js';
import { POSES } from '../poses.js';
import { evalTracks } from '../tracks.js';

export { RIG_PARAMS, PARAM_NAMES, neutralParams } from './params.js';
export * from './sides.js';

/**
 * Rig parameters for a segment at time t (seconds).
 * Order: neutral values → the segment's `from` pose → its tracks → live overrides.
 * A parameter with no track therefore holds its `from` pose value.
 */
export function resolveParams(segment, t, overrides) {
  const params = neutralParams();
  if (segment.from) Object.assign(params, POSES[segment.from].params);
  if (segment.tracks) Object.assign(params, evalTracks(segment.tracks, t));
  if (overrides) {
    const bad = unknownParams(overrides);
    if (bad.length) throw new Error(`Unknown rig parameter(s) in overrides: ${bad.join(', ')}`);
    Object.assign(params, overrides);
  }
  return params;
}

export { drawRigBack, drawRigFront } from './helgi.js';

export const RIG_HAS_ARTWORK = true;
