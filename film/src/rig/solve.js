// The rig's skeleton: where the joints are for a set of parameters.
// Drawing code never moves anything by itself; it asks solveRig().
//
// Hierarchy:
//   torso (lean, slump, breath)
//     ├─ neck → head (roll, yaw, pitch) → face parts
//     └─ shoulders → upper arm → forearm → hand (→ cup when attached)
//
// The torso is a 2D transform in the picture. The arms are solved in table
// space (layout.js: X across, H above the table top, D toward the camera), so
// a hand can rest on the table, lift off it, or drop behind its far edge.

import { project, unproject, HELGI, PROPS, TABLE } from '../layout.js';
import { PATIENT_RIGHT, PATIENT_LEFT } from './sides.js';

const DEG = Math.PI / 180;

export const ARM = {
  // Shorter than a real arm, on purpose: the picture cheats its perspective
  // (the table top sits at chest height), and with true lengths the elbows
  // end up in places that look wrong from the front.
  upper: 0.17, // metres, shoulder to elbow
  fore: 0.17, // elbow to wrist
  hand: 0.191, // wrist to fingertips
  shoulderD: -0.12, // the shoulders are this far behind the table's far edge
};

/** Shoulder joints in rest coordinates, before the torso moves. */
export const SHOULDER_REST = {
  [PATIENT_RIGHT]: { x: 622, y: 669 },
  [PATIENT_LEFT]: { x: 1218, y: 669 },
};

/** Toward the body's midline, in table X, for each arm. */
const INWARD = { [PATIENT_RIGHT]: 1, [PATIENT_LEFT]: -1 };

export const TORSO = {
  pivot: { x: 920, y: 1040 }, // hips, hidden under the table
  leanDeg: 12, // rotation at torsoLean = ±1
  sinkPx: 46, // how far a full slump lowers her
  squash: 0.05, // and shortens her
};

// ---------------------------------------------------------------- torso

/**
 * The torso's transform as a 2D matrix [a, b, c, d, e, f] (canvas order).
 * torsoLean > 0 leans toward HER left (screen right), < 0 toward her right.
 */
export function torsoMatrix(p) {
  const ang = p.torsoLean * TORSO.leanDeg * DEG;
  const cos = Math.cos(ang);
  const sin = Math.sin(ang);
  const sy = 1 - TORSO.squash * p.torsoSlump;
  const sink = TORSO.sinkPx * p.torsoSlump;
  const { x: px, y: py } = TORSO.pivot;
  // M = T(pivot) · R(ang) · T(0, sink) · S(1, sy) · T(−pivot)
  const a = cos;
  const b = sin;
  const c = -sin * sy;
  const d = cos * sy;
  const e = px - cos * px + sin * sy * py - sin * sink;
  const f = py - sin * px - cos * sy * py + cos * sink;
  return { m: [a, b, c, d, e, f], angle: ang };
}

export function applyMatrix(m, x, y) {
  return { x: m[0] * x + m[2] * y + m[4], y: m[1] * x + m[3] * y + m[5] };
}

// ---------------------------------------------------------------- arms

const smooth = (u) => { const c = Math.min(1, Math.max(0, u)); return c * c * (3 - 2 * c); };
const add = (p, v, k) => ({ X: p.X + v.X * k, H: p.H + v.H * k, D: p.D + v.D * k });

/**
 * Forward kinematics for one arm.
 *   lift   upper arm raised forward from hanging straight down (deg)
 *   swing  the arm's plane turned toward the body's midline (deg)
 *   elbow  bend of the elbow, 0 = straight (deg)
 *   wrist  the hand turned further toward the midline (deg). The hand always
 *          stays level, as it does on a table or holding a cup.
 */
export function armFK(side, S, { lift, swing, elbow, wrist }) {
  const inward = INWARD[side];
  const phi = swing * DEG;
  const fwd = { X: inward * Math.sin(phi), H: 0, D: Math.cos(phi) };
  const down = { X: 0, H: -1, D: 0 };
  const t1 = lift * DEG;
  const t2 = (lift + elbow) * DEG;
  const E = add(add(S, fwd, ARM.upper * Math.sin(t1)), down, ARM.upper * Math.cos(t1));
  const W = add(add(E, fwd, ARM.fore * Math.sin(t2)), down, ARM.fore * Math.cos(t2));
  const psi = (swing + wrist) * DEG;
  const handDir = { X: inward * Math.sin(psi), H: 0, D: Math.cos(psi) };
  const F = add(W, handDir, ARM.hand);
  return { side, inward, S, E, W, F, handDir };
}

/**
 * Inverse kinematics: the angles that put the wrist at W with the hand
 * pointing `handYaw` degrees toward the midline. Used to work out poses.
 */
export function armIK(side, S, W, handYaw = 0) {
  const inward = INWARD[side];
  const dX = (W.X - S.X) * inward;
  const dD = W.D - S.D;
  const r = Math.hypot(dX, dD);
  const v = S.H - W.H;
  const reach = Math.min(Math.hypot(r, v), ARM.upper + ARM.fore - 1e-6);
  const swing = Math.atan2(dX, dD) / DEG;
  const dir = Math.atan2(r, v);
  const alpha = Math.acos((ARM.upper ** 2 + reach ** 2 - ARM.fore ** 2) / (2 * ARM.upper * reach));
  const inner = Math.acos((ARM.upper ** 2 + ARM.fore ** 2 - reach ** 2) / (2 * ARM.upper * ARM.fore));
  return {
    lift: (dir - alpha) / DEG,
    swing,
    elbow: 180 - inner / DEG,
    wrist: handYaw - swing,
  };
}

function solveArm(side, shoulderPx, angles, torsoAngle) {
  const S = unproject(shoulderPx.x, shoulderPx.y, ARM.shoulderD);
  const arm = armFK(side, S, angles);
  // The arms belong to the torso: when it leans, they lean with it. Rotate
  // the elbow and wrist about the shoulder, in the plane of the picture.
  if (torsoAngle) {
    const cos = Math.cos(torsoAngle);
    const sin = Math.sin(torsoAngle);
    for (const key of ['E', 'W']) {
      const dX = arm[key].X - S.X;
      const dH = arm[key].H - S.H;
      arm[key] = { X: S.X + dX * cos + dH * sin, H: S.H - dX * sin + dH * cos, D: arm[key].D };
    }
  }
  // A hand over the table rests ON it: when the shoulder sinks a little (a
  // breath out, the start of a slump), the table still holds the hand up.
  // Only a hand that is clearly under the table top (in her lap) stays there.
  // The support fades in between 2 and 4 cm onto the table and fades out for a hand
  // well below the top, so nothing jumps.
  if (arm.W.D > 0 && arm.W.H < 0 && arm.W.H > -0.04) {
    const onto = smooth((arm.W.D - 0.02) / 0.02);
    const shallow = smooth((arm.W.H + 0.04) / 0.03);
    arm.W = { ...arm.W, H: arm.W.H * (1 - onto * shallow) };
  }
  arm.F = add(arm.W, arm.handDir, ARM.hand);
  arm.s = project(S.X, S.H, S.D);
  arm.e = project(arm.E.X, arm.E.H, arm.E.D);
  arm.w = project(arm.W.X, arm.W.H, arm.W.D);
  arm.f = project(arm.F.X, arm.F.H, arm.F.D);
  // Is the hand over the table (in front of its far edge, not under its top)?
  arm.onTable = arm.W.D >= -0.012 && arm.W.H >= -0.006;
  const { E, W } = arm;
  const at = (t) => ({ X: E.X + (W.X - E.X) * t, H: E.H + (W.H - E.H) * t, D: E.D + (W.D - E.D) * t });
  // Is the elbow itself over the table? Only then is the forearm drawn on top
  // of the table; otherwise the table hides whatever is below its far edge.
  arm.elbowOverTable = E.D >= 0 && E.H >= 0;
  // Where the forearm comes into view above the table's far edge. The sleeve
  // end points back there. If none of it shows (hand flat on the table with
  // the elbow hidden), `v` is the wrist itself.
  let seen = 1;
  let prevY = null;
  for (let i = 0; i <= 24; i++) {
    const P = at(i / 24);
    const q = project(P.X, P.H, P.D);
    if (q.y < TABLE.farY - 1 || (P.D >= 0 && P.H >= 0 && arm.elbowOverTable)) {
      seen = i / 24;
      // refine to the exact crossing of the table edge, so the sleeve end
      // turns smoothly instead of in small steps as the arm moves
      if (i > 0 && prevY !== null && prevY > q.y && !arm.elbowOverTable) {
        seen = (i - 1 + (prevY - (TABLE.farY - 1)) / (prevY - q.y)) / 24;
      }
      break;
    }
    prevY = q.y;
  }
  const V = at(seen);
  arm.v = project(V.X, V.H, V.D);
  // how far the upper arm has left the side of the body, 0…1
  const restX = arm.s.x + Math.sin(torsoAngle || 0) * -1 * (arm.e.y - arm.s.y);
  arm.away = Math.min(1, Math.max(0, (Math.abs(arm.e.x - restX) - 30) / 110));
  return arm;
}

/** How far ahead of the wrist the cup sits in her hand, in metres. */
export const CUP_REACH = 0.095;

/** Where the cup's base is in table space when she holds it in her right hand. */
export function heldCupPosition(arm) {
  const g = add(arm.W, arm.handDir, CUP_REACH);
  return { X: g.X, H: arm.W.H - 0.045, D: g.D };
}

// ---------------------------------------------------------------- whole rig

const cache = new WeakMap();

/** All joint positions for a parameter set. Cached per params object. */
export function solveRig(p) {
  const hit = cache.get(p);
  if (hit) return hit;
  const torso = torsoMatrix(p);
  const arms = {};
  for (const side of [PATIENT_RIGHT, PATIENT_LEFT]) {
    const rest = SHOULDER_REST[side];
    // a slump rounds the shoulders down
    const sPx = applyMatrix(torso.m, rest.x, rest.y + 10 * p.torsoSlump);
    const R = side === PATIENT_RIGHT;
    arms[side] = solveArm(side, sPx, {
      lift: R ? p.armRShoulder : p.armLShoulder,
      swing: R ? p.armRSwing : p.armLSwing,
      elbow: R ? p.armRElbow : p.armLElbow,
      wrist: R ? p.armRWrist : p.armLWrist,
    }, torso.angle);
    arms[side].shoulderPx = sPx;
  }
  // Drawing order. Her left hand is the one that takes hold of her right arm,
  // so it must always be drawn over the right hand. When the right hand is on
  // the table and the left hand comes near it above the table's far edge,
  // the left hand is drawn with it in the front pass. It is promoted while the
  // two are still apart, so the change of pass cannot be seen.
  const R = arms[PATIENT_RIGHT];
  const L = arms[PATIENT_LEFT];
  if (R.onTable && !L.onTable && Math.hypot(R.w.x - L.w.x, R.w.y - L.w.y) < 400 && L.w.y < 778) {
    L.onTable = true;
  }
  const held = p.cupAttach >= 0.5;
  const rig = {
    torso,
    arms,
    cup: held ? { held: true, ...heldCupPosition(arms[PATIENT_RIGHT]) } : { held: false, X: PROPS.cup.X, H: 0, D: PROPS.cup.D },
  };
  cache.set(p, rig);
  return rig;
}

/** Shoulder joint of an arm in table space when the torso is at rest. */
export function restShoulder(side) {
  const r = SHOULDER_REST[side];
  return unproject(r.x, r.y, ARM.shoulderD);
}

void HELGI;
