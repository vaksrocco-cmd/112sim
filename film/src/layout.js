// Where things are. All positions are in REST coordinates: the pixel position
// in the 1920×1080 frame when the camera is at rest. A layer painter calls
// toRest(ctx) first and then draws with these numbers; the world extends
// beyond the frame (x −40…2560, y −60…1140) for sway and for the turn to the
// hallway door.
//
// The perspective is deliberately "cheated", as in a painted film: Helgi is a
// medium close-up, but the table is tilted toward us so the props can be read.

import { REST_ORIGIN } from './camera.js';
import { WORLD_W, WORLD_H } from './config.js';

export function toRest(ctx) {
  ctx.translate(REST_ORIGIN.x, REST_ORIGIN.y);
}

/** World bounds expressed in rest coordinates. */
export const BOUNDS = {
  x0: -REST_ORIGIN.x,
  y0: -REST_ORIGIN.y,
  x1: WORLD_W - REST_ORIGIN.x,
  y1: WORLD_H - REST_ORIGIN.y,
};

/** Eye level of the camera in the picture. */
export const HORIZON_Y = 300;

// ---------- table plane ----------
// A point on the table is (X, D): X metres to the right of the centre line,
// D metres from the far edge (Helgi's side) toward the camera.

export const TABLE = {
  centreX: 960,
  farY: 790, // the far edge of the table in the picture
  pxPerM: 1500, // scale at the far edge
  halfLength: 0.68, // table is 1.36 m long
  runnerD: 0.225, // the oilcloth runner starts this far from the far edge
  runnerHalf: 0.5,
};
const K = TABLE.farY - HORIZON_Y;
const DZ = 0.796;

export function tableZ(D) {
  return 1 - DZ * D;
}

/** Picture position of table point (X, D), plus the local scale (1 at the far edge). */
export function tablePoint(X, D) {
  const z = tableZ(D);
  return { x: TABLE.centreX + (X * TABLE.pxPerM) / z, y: HORIZON_Y + K / z, scale: 1 / z };
}

/** Pixels per metre at depth D: across the table, and for things standing up. */
export function tableScale(D) {
  const z = tableZ(D);
  return { across: TABLE.pxPerM / z, up: (TABLE.pxPerM / z) * 0.96, squash: 0.26 / z };
}

/**
 * Picture position of a point in table space: X metres right of the centre
 * line, H metres above the table top, D metres from the far edge toward the
 * camera (negative D is on Helgi's side of the edge). The arms and the cup
 * live in this space, so hands land on the same table the props stand on.
 */
export function project(X, H, D) {
  const z = Math.max(0.35, tableZ(D));
  return {
    x: TABLE.centreX + (X * TABLE.pxPerM) / z,
    y: HORIZON_Y + K / z - (H * TABLE.pxPerM * 0.96) / z,
    z,
    scale: 1 / z,
  };
}

/** The table-space point at depth D that appears at picture position (x, y). */
export function unproject(x, y, D) {
  const z = tableZ(D);
  return {
    X: ((x - TABLE.centreX) * z) / TABLE.pxPerM,
    H: ((HORIZON_Y + K / z - y) * z) / (TABLE.pxPerM * 0.96),
    D,
  };
}

// ---------- room ----------

export const WINDOW = {
  x0: 30, // opening
  x1: 700,
  sillY: 597,
  mullionX: 365,
  transomY: 160,
  panes: [
    [48, -60, 353, 150],
    [377, -60, 682, 150],
    [48, 170, 353, 579],
    [377, 170, 682, 579],
  ],
};

export const DOORWAY = {
  x0: 1996, // opening into the hallway
  x1: 2444,
  floorY: 782, // where the hallway's far wall meets its floor
  leafX: 2332, // free edge of the half-open door leaf
};

// ---------- Helgi ----------

export const HELGI = {
  headX: 920,
  headY: 352, // centre of the head
  neckX: 920,
  neckY: 540, // pivot for head tilt
  // The rig is painted into its own buffer covering this box, then textured.
  box: { x: 270, y: 100, w: 1140, h: 840 },
};

// ---------- props on the table ----------

export const PROPS = {
  cup: { X: -0.32, D: 0.17 },
  sugar: { X: 0.25, D: 0.105 },
  teapot: { X: 0.4, D: 0.21 },
  envelope: { X: 0.085, D: 0.262, w: 0.165, h: 0.115, rot: -0.2 },
};
