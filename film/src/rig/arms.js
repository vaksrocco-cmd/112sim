// Arms, hands and the cup.
//
// An arm is three pieces: upper arm, forearm, hand. Their joints come from
// solve.js. What is drawn where:
//   back pass   both upper arms; a forearm and hand that are NOT over the
//               table (raised in front of her, or dropped behind the edge,
//               where the table layer then hides them)
//   front pass  a forearm and hand that ARE over the table, and the cup
//
// `side` is always PATIENT_RIGHT or PATIENT_LEFT from sides.js.

import { PATIENT_RIGHT, PATIENT_LEFT } from './sides.js';
import { project } from '../layout.js';
import { PAL } from '../palette.js';
import {
  softBlob, taperStroke, fillSmooth, tracePath, linearGradient, rgba, mix, ellipse, lerp, clamp,
} from '../paint.js';
import { mulberry32, hashString, helpers } from '../rng.js';

const DEG = Math.PI / 180;
const fixed = (name) => helpers(mulberry32(hashString(`helgi|${name}`)));

// The window is behind her at screen left: her right side is the lit side.
const LIT = PATIENT_RIGHT;

/** The cardigan's colour across the picture: lit at screen left, shaded at screen right. */
export function cardiganFill(ctx) {
  return linearGradient(ctx, 570, 0, 1270, 0, [
    [0, PAL.cardiganLight],
    [0.16, PAL.cardigan],
    [0.7, mix(PAL.cardigan, PAL.cardiganShade, 0.6)],
    [1, PAL.cardiganShade],
  ]);
}

// ---------------------------------------------------------------- limbs

function capsulePath(ctx, p0, r0, p1, r1) {
  const ang = Math.atan2(p1.y - p0.y, p1.x - p0.x);
  ctx.beginPath();
  if (Math.hypot(p1.x - p0.x, p1.y - p0.y) < 0.5) {
    ctx.arc(p0.x, p0.y, Math.max(r0, r1), 0, Math.PI * 2);
    return;
  }
  ctx.arc(p0.x, p0.y, r0, ang + Math.PI / 2, ang - Math.PI / 2);
  ctx.arc(p1.x, p1.y, r1, ang - Math.PI / 2, ang + Math.PI / 2);
  ctx.closePath();
}

/** A knitted sleeve between two points: wool colour, soft form, ribs along its length. */
function sleeve(ctx, p0, r0, p1, r1, side) {
  const dx = p1.x - p0.x;
  const dy = p1.y - p0.y;
  const len = Math.hypot(dx, dy);
  const ux = len > 0.5 ? dx / len : 0;
  const uy = len > 0.5 ? dy / len : 1;
  // normal pointing to the shaded side (screen right / down)
  let nx = -uy;
  let ny = ux;
  if (nx + ny * 0.4 < 0) {
    nx = -nx;
    ny = -ny;
  }
  const rMax = Math.max(r0, r1);
  ctx.save();
  capsulePath(ctx, p0, r0, p1, r1);
  ctx.clip();
  ctx.fillStyle = cardiganFill(ctx);
  ctx.fillRect(Math.min(p0.x, p1.x) - rMax - 2, Math.min(p0.y, p1.y) - rMax - 2, Math.abs(dx) + rMax * 2 + 4, Math.abs(dy) + rMax * 2 + 4);
  // round form: lighter toward the window, darker on the far side
  ctx.fillStyle = linearGradient(ctx, p0.x - nx * rMax, p0.y - ny * rMax, p0.x + nx * rMax, p0.y + ny * rMax, [
    [0, rgba(PAL.cardiganLight, side === LIT ? 0.3 : 0.1)],
    [0.5, rgba(PAL.cardigan, 0)],
    [0.85, rgba(PAL.cardiganDeep, 0.22)],
    [1, rgba(PAL.cardiganDeep, 0.3)],
  ]);
  ctx.fillRect(Math.min(p0.x, p1.x) - rMax - 2, Math.min(p0.y, p1.y) - rMax - 2, Math.abs(dx) + rMax * 2 + 4, Math.abs(dy) + rMax * 2 + 4);
  // knit ribs along the sleeve
  if (len > 6) {
    for (let o = -rMax; o <= rMax; o += 8.5) {
      const k0 = o * (r0 / rMax);
      const k1 = o * (r1 / rMax);
      const a = [p0.x + nx * k0 - ux * r0, p0.y + ny * k0 - uy * r0];
      const b = [p1.x + nx * k1 + ux * r1, p1.y + ny * k1 + uy * r1];
      taperStroke(ctx, [a, b], 2.6, PAL.cardiganDeep, 0.24, 'none');
      taperStroke(ctx, [[a[0] + 3, a[1]], [b[0] + 3, b[1]]], 1.6, PAL.cardiganLight, 0.16, 'none');
    }
  }
  // daylight along the edge that faces the window
  if (side === LIT) {
    const a = [p0.x - nx * (r0 - 4), p0.y - ny * (r0 - 4)];
    const b = [p1.x - nx * (r1 - 4), p1.y - ny * (r1 - 4)];
    taperStroke(ctx, [a, b], 14, '#a9c2ae', 0.3, 'none');
    taperStroke(ctx, [[a[0] - 2, a[1] - 1], [b[0] - 2, b[1] - 1]], 5, '#d6e4d6', 0.45, 'none');
  }
  ctx.restore();
}

const upperRadius = (pt) => 0.0305 * 1500 * pt.scale;
const foreRadius = (pt) => 0.026 * 1500 * pt.scale;

export function upperArm(ctx, arm) {
  sleeve(ctx, arm.shoulderPx, upperRadius(arm.s), arm.e, upperRadius(arm.e) * 0.96, arm.side);
}

function forearm(ctx, arm) {
  sleeve(ctx, arm.e, foreRadius(arm.e), arm.w, foreRadius(arm.w) * 0.9, arm.side);
}

// ---------------------------------------------------------------- sleeve end and cuff

/**
 * The end of the sleeve with its ribbed cuff. It points back from the wrist
 * along the visible forearm; when the forearm is hidden (hand flat on the
 * table), it points up toward the upper arm above the table edge, and its far
 * end fades out so it joins that arm without a seam.
 */
function sleeveEnd(ctx, arm) {
  const w = arm.w;
  const toQ = { x: arm.shoulderPx.x + 1 - w.x, y: arm.shoulderPx.y + 47 - w.y - 16 };
  const toO = { x: arm.v.x - w.x, y: arm.v.y - w.y };
  const visible = Math.hypot(toO.x, toO.y);
  const k = clamp(visible / 90);
  const nq = Math.hypot(toQ.x, toQ.y) || 1;
  const no = visible || 1;
  let vx = lerp(toQ.x / nq, toO.x / no, k);
  let vy = lerp(toQ.y / nq, toO.y / no, k);
  const nv = Math.hypot(vx, vy) || 1;
  vx /= nv;
  vy /= nv;
  const rot = Math.atan2(vy, vx) + Math.PI / 2; // 0 when the sleeve comes from straight above
  const size = arm.w.scale / 1.0572; // 1 at the resting place on the table
  const lit = arm.side === LIT;

  ctx.save();
  ctx.translate(w.x, w.y);
  ctx.rotate(rot);
  ctx.scale(arm.side === PATIENT_RIGHT ? size : -size, size);
  ctx.translate(2, -16);
  // From here on: wrist end at the origin, sleeve running up (−y).
  const shape = [
    [-56, -80], [-20, -86], [34, -78], [62, -50], [66, -14],
    [52, 8], [20, 22], [-20, 22], [-46, 10], [-56, -20],
  ];
  ctx.save();
  ctx.beginPath();
  tracePath(ctx, shape, true);
  ctx.clip();
  ctx.fillStyle = linearGradient(ctx, -56, 0, 66, 0, lit
    ? [[0, PAL.cardiganLight], [0.3, PAL.cardigan], [1, mix(PAL.cardigan, PAL.cardiganShade, 0.5)]]
    : [[0, mix(PAL.cardigan, PAL.cardiganShade, 0.35)], [0.4, mix(PAL.cardigan, PAL.cardiganShade, 0.6)], [1, PAL.cardiganShade]]);
  ctx.fillRect(-70, -96, 150, 130);
  // the bend of the elbow and the fold above the cuff
  softBlob(ctx, 50, -40, 30, 30, PAL.cardiganDeep, 0.28);
  taperStroke(ctx, [[-50, -34], [-6, -22], [40, -34], [62, -50]], 5, PAL.cardiganDeep, 0.35);
  const rng = fixed('cuff');
  for (let i = 0; i < 46; i++) softBlob(ctx, rng.range(-56, 64), rng.range(-80, -14), 2.5, 4, rng.next() < 0.5 ? PAL.cardiganLight : PAL.cardiganDeep, 0.2);
  // ribbed cuff: a band round the wrist
  const cuffTop = (x) => -10 + (x / 60) ** 2 * -6;
  for (let i = 0; i <= 18; i++) {
    const x0 = lerp(-50, 58, i / 18);
    const lean = x0 / 60;
    taperStroke(ctx, [[x0 - lean * 3, cuffTop(x0)], [x0 + lean * 4, 24]], 3, PAL.cardiganDeep, 0.42, 'none');
    taperStroke(ctx, [[x0 - lean * 3 + 3, cuffTop(x0)], [x0 + lean * 4 + 3, 24]], 1.8, PAL.cardiganLight, 0.26, 'none');
  }
  taperStroke(ctx, [[-54, -6], [0, -12], [62, -8]], 4, PAL.cardiganDeep, 0.5, 'none');
  if (lit) taperStroke(ctx, [[-54, -76], [-58, -30], [-48, 8]], 6, '#d6e4d6', 0.35, 'soft');
  // fade the far end and the inner edge away
  ctx.globalCompositeOperation = 'destination-out';
  ctx.fillStyle = linearGradient(ctx, 0, -90, 0, -40, [[0, `rgba(0,0,0,${1 - 0.7 * k})`], [1, 'rgba(0,0,0,0)']]);
  ctx.fillRect(-70, -96, 150, 60);
  ctx.fillStyle = linearGradient(ctx, 30, 0, 68, 0, [[0, 'rgba(0,0,0,0)'], [1, `rgba(0,0,0,${0.9 * (1 - k)})`]]);
  ctx.fillRect(30, -96, 40, 84);
  ctx.restore();
  // a sliver of blouse cuff
  taperStroke(ctx, [[-40, 14], [-4, 25], [44, 12]], 6, '#e9e4d8', 0.95, 'soft');
  ctx.restore();
}

// ---------------------------------------------------------------- hand

/**
 * A hand seen from above, laid along the direction the solver gives.
 * In hand space +a runs along the fingers and +b toward the little finger;
 * the thumb is on the −b side, toward the body's midline. The left hand is
 * the same drawing mirrored.
 */
function hand(ctx, arm, grip) {
  const w = arm.w;
  const ax = arm.f.x - w.x;
  const ay = arm.f.y - w.y;
  const flat = 0.52; // how much the flat hand is squashed by the view from across the table
  const gam = Math.atan2(ay / flat, ax);
  const k = Math.hypot(ax, ay) / (228 * Math.hypot(Math.cos(gam), flat * Math.sin(gam)));
  const g = clamp(grip);

  // contact shadow while the hand is on or just above the table
  const near = arm.onTable ? clamp(1 - arm.W.H / 0.035) : 0;
  if (near > 0) {
    softBlob(ctx, w.x + ax * 0.6 + 16, w.y + ay * 0.6, 150 * k / 0.92, 32, PAL.shadow, 0.3 * near, Math.atan2(ay, ax) - 0.09);
    softBlob(ctx, w.x + 12, w.y + 4, 84, 20, PAL.shadow, 0.34 * near);
  }

  ctx.save();
  ctx.translate(w.x, w.y);
  ctx.scale(1, flat);
  ctx.rotate(gam);
  ctx.scale(k, arm.side === PATIENT_RIGHT ? k : -k);

  const skinFill = linearGradient(ctx, 0, -70, 0, 70, [
    [0, '#ecd2be'],
    [0.45, PAL.skin],
    [1, '#c39e88'],
  ]);
  const curl = 1 - 0.52 * g; // closing the hand shortens what we see of the fingers
  const tuck = 1 - 0.45 * g;

  // thumb: swings in across the palm as the hand closes
  const th = (x, y) => [x - 26 * g * (x / 150), y + 34 * g * (x / 150)];
  fillSmooth(ctx, [th(14, -34), th(58, -66), th(108, -88), th(146, -96), th(158, -86), th(150, -70), th(108, -58), th(66, -40), th(30, -20)], skinFill);
  taperStroke(ctx, [th(60, -62), th(108, -84), th(146, -93)], 3, '#fff1e2', 0.4);

  // fingers: [b, length, width]
  const fingers = [[-43, 98, 28], [-14, 110, 29], [16, 102, 28], [44, 80, 25]];
  const a0 = 118;
  for (const [b0, len0, wd] of fingers) {
    const b = b0 * tuck;
    const len = len0 * curl;
    const spread = b * 0.12 * tuck;
    fillSmooth(ctx, [
      [a0, b - wd / 2], [a0 + len * 0.55, b + spread - wd / 2 + 1], [a0 + len - 8, b + spread * 1.6 - wd * 0.4],
      [a0 + len, b + spread * 1.7], [a0 + len - 8, b + spread * 1.6 + wd * 0.4], [a0 + len * 0.55, b + spread + wd / 2 - 1], [a0, b + wd / 2],
    ], skinFill);
  }
  // back of the hand
  fillSmooth(ctx, [[-4, -38], [40, -48], [96, -62], [128, -60], [136, -22], [138, 20], [130, 56], [96, 62], [40, 50], [-4, 40]], skinFill);

  // form and age
  softBlob(ctx, 70, 30, 70, 30, PAL.skinDeep, 0.2);
  softBlob(ctx, 60, -30, 60, 20, PAL.skinLight, 0.4);
  for (const [b0, len0, wd] of fingers) {
    const b = b0 * tuck;
    const len = len0 * curl;
    const spread = b * 0.12 * tuck;
    softBlob(ctx, a0 + 6, b, 15, 12, PAL.skinLight, 0.5 + 0.2 * g); // knuckle
    taperStroke(ctx, [[a0 + 2, b - 8], [a0 + 8, b], [a0 + 2, b + 8]], 1.8, PAL.skinLine, 0.3 + 0.3 * g);
    const jx = a0 + len * 0.52;
    taperStroke(ctx, [[jx, b + spread - wd * 0.36], [jx + 3, b + spread], [jx, b + spread + wd * 0.36]], 1.8, PAL.skinLine, 0.4);
    if (g < 0.6) {
      taperStroke(ctx, [[jx + len * 0.24, b + spread * 1.4 - wd * 0.3], [jx + len * 0.24 + 2, b + spread * 1.4 + wd * 0.3]], 1.5, PAL.skinLine, 0.3);
      softBlob(ctx, a0 + len - 12, b + spread * 1.65, 9, wd * 0.3, '#f3dcd0', 0.75 * (1 - g)); // nail
    } else {
      softBlob(ctx, a0 + len - 6, b + spread * 1.6, 12, wd * 0.5, PAL.skinDeep, 0.25); // fingers curling under
    }
    taperStroke(ctx, [[a0, b], [70, b * 0.6], [20, b * 0.3]], 3, PAL.skinLight, 0.22); // tendon
  }
  // gaps between the fingers
  for (const b0 of [-28.5, 1, 30]) {
    const b = b0 * tuck;
    taperStroke(ctx, [[112, b], [112 + 38 * curl, b + b * 0.1], [112 + 84 * curl, b + b * 0.2]], 2.4, PAL.skinLine, 0.5, 'start');
  }
  taperStroke(ctx, [th(30, -24), th(66, -42), th(106, -60)], 2.2, PAL.skinLine, 0.4);
  // veins and age spots
  taperStroke(ctx, [[18, -6], [56, 4], [100, -6]], 4, '#8fa0a6', 0.2);
  taperStroke(ctx, [[30, 18], [70, 26], [108, 22]], 3.4, '#8fa0a6', 0.16);
  for (const [a, b, r] of [[52, -20, 5], [84, 30, 4], [36, 26, 3.5], [100, -36, 3]]) softBlob(ctx, a, b, r, r, '#a57a62', 0.4);
  ctx.restore();
}

// ---------------------------------------------------------------- cup

/**
 * Her cup, standing with its base at table-space position `at`.
 * `tilt` (radians) tips it about its base; `onSaucer` adds its shadow there.
 */
export function cup(ctx, at, tilt = 0, onSaucer = true) {
  const pt = project(at.X, at.H, at.D);
  const across = 1500 * pt.scale;
  const cx = pt.x;
  const baseY = pt.y - 3;
  const rx = 0.0425 * across;
  const squash = 0.26 * pt.scale;
  const ry = rx * squash;
  const brx = 0.027 * across;
  const h = 0.064 * across * 0.96;
  const rimY = baseY - h;

  if (onSaucer) softBlob(ctx, cx + 20, baseY + 4, brx * 1.5, brx * 0.42, PAL.shadow, 0.34);

  ctx.save();
  if (tilt) {
    ctx.translate(cx, baseY);
    ctx.rotate(tilt);
    ctx.translate(-cx, -baseY);
  }
  // handle on HER right (screen left), where her right hand holds it
  const hs = PATIENT_RIGHT;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#f6f3e9';
  ctx.lineWidth = 12 * pt.scale;
  ctx.beginPath();
  ctx.moveTo(cx + hs * (rx - 6), rimY + h * 0.22);
  ctx.bezierCurveTo(cx + hs * (rx + 40), rimY + h * 0.2, cx + hs * (rx + 36), baseY - h * 0.24, cx + hs * (brx + 12), baseY - h * 0.22);
  ctx.stroke();
  ctx.strokeStyle = rgba(PAL.ceramicShade, 0.6);
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(cx + hs * (rx - 2), rimY + h * 0.28);
  ctx.bezierCurveTo(cx + hs * (rx + 30), rimY + h * 0.28, cx + hs * (rx + 28), baseY - h * 0.3, cx + hs * (brx + 12), baseY - h * 0.28);
  ctx.stroke();
  ctx.restore();

  // body
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(cx - rx, rimY);
  ctx.bezierCurveTo(cx - rx, rimY + h * 0.55, cx - brx - 8, baseY - 12, cx - brx, baseY);
  ctx.ellipse(cx, baseY, brx, brx * squash, 0, Math.PI, 0, true);
  ctx.bezierCurveTo(cx + brx + 8, baseY - 12, cx + rx, rimY + h * 0.55, cx + rx, rimY);
  ctx.closePath();
  ctx.clip();
  ctx.fillStyle = linearGradient(ctx, cx - rx, 0, cx + rx, 0, [
    [0, '#fdfbf3'],
    [0.25, PAL.ceramic],
    [0.65, mix(PAL.ceramic, PAL.ceramicShade, 0.6)],
    [1, mix(PAL.ceramicShade, PAL.ceramicDeep, 0.5)],
  ]);
  ctx.fillRect(cx - rx - 2, rimY - 30, rx * 2 + 4, h + 80);
  softBlob(ctx, cx + 6, baseY + 4, rx * 0.8, 20, '#d9b98f', 0.3);
  // blue line under the rim and a small painted sprig
  ctx.strokeStyle = rgba(PAL.ceramicBlue, 0.75);
  ctx.lineWidth = 2.6;
  ellipse(ctx, cx, rimY + h * 0.12, rx * 0.985, ry, 0, 0, Math.PI);
  ctx.stroke();
  const u = h / 106.5;
  taperStroke(ctx, [[cx - 20 * u, rimY + 74 * u], [cx - 10 * u, rimY + 56 * u], [cx + 6 * u, rimY + 46 * u]], 2.2, PAL.ceramicBlue, 0.7);
  for (const [dx, dy] of [[-16, 58], [-2, 44], [8, 54], [-8, 66], [10, 40]]) softBlob(ctx, cx + dx * u, rimY + dy * u, 5.5 * u, 5.5 * u, PAL.ceramicBlue, 0.75);
  softBlob(ctx, cx - rx * 0.62, rimY + h * 0.4, 9, 30 * u, '#ffffff', 0.7);
  ctx.restore();

  // rim and the inside
  ellipse(ctx, cx, rimY, rx, ry);
  ctx.fillStyle = '#f8f5ec';
  ctx.fill();
  ctx.save();
  ellipse(ctx, cx, rimY + 1, rx - 5, ry - 3.5);
  ctx.clip();
  ctx.fillStyle = linearGradient(ctx, cx - rx, 0, cx + rx, 0, [
    [0, mix(PAL.ceramicShade, PAL.ceramicDeep, 0.3)],
    [0.5, PAL.ceramicShade],
    [1, '#e3ded0'],
  ]);
  ctx.fillRect(cx - rx, rimY - ry, rx * 2, ry * 2 + 2);
  // tea, a little below the rim after her sip
  ellipse(ctx, cx, rimY + 15 * u, rx - 10, ry - 4);
  ctx.fillStyle = PAL.tea;
  ctx.fill();
  softBlob(ctx, cx - 20 * u, rimY + 16 * u, 24 * u, 4, '#cdb48f', 0.45);
  ctx.restore();
  ctx.restore();
}

// ---------------------------------------------------------------- passes

// ---------------------------------------------------------------- steam

/**
 * Steam rising from the tea. `amount` 0…1 fades it; `time` (seconds) makes it
 * drift. It is a fixed function of time, so every render is the same.
 */
function steam(ctx, at, amount, time) {
  if (!(amount > 0.01)) return;
  const pt = project(at.X, at.H, at.D);
  const top = pt.y - 3 - 0.064 * 1500 * pt.scale * 0.96; // the rim
  const wisps = [
    { x: -16, speed: 0.31, phase: 0.0, sway: 13, height: 150 },
    { x: 8, speed: 0.24, phase: 2.1, sway: 17, height: 190 },
    { x: 22, speed: 0.37, phase: 4.3, sway: 11, height: 130 },
  ];
  for (const w of wisps) {
    // each wisp rises, thins out and starts again from the cup
    const life = (time * w.speed + w.phase / 6.283) % 1;
    const rise = 0.35 + 0.65 * life;
    const pts = [];
    for (let i = 0; i <= 6; i++) {
      const u = i / 6;
      const y = top - 6 - u * w.height * rise;
      const x = pt.x + w.x + Math.sin(u * 4.2 + time * 1.7 * w.speed * 6.283 + w.phase) * w.sway * u;
      pts.push([x, y]);
    }
    const fade = Math.sin(Math.PI * life) ** 0.8;
    taperStroke(ctx, pts, 20, '#ffffff', 0.1 * amount * fade, 'both');
    taperStroke(ctx, pts, 9, '#ffffff', 0.12 * amount * fade, 'both');
  }
}

function wristEnd(ctx, arm, p, rig, extras) {
  sleeveEnd(ctx, arm);
  const right = arm.side === PATIENT_RIGHT;
  if (right && rig.cup.held) {
    cup(ctx, rig.cup, extras.cupTilt || 0, false);
    steam(ctx, rig.cup, extras.steam || 0, extras.time || 0);
  }
  hand(ctx, arm, right ? p.armRGrip : p.armLGrip);
}

/**
 * Behind the table: both arms from the shoulder to the wrist (the table layer
 * then hides whatever is below its far edge), and the hands that are not over
 * the table.
 */
export function armsBack(ctx, p, rig, extras = {}) {
  for (const side of [PATIENT_LEFT, PATIENT_RIGHT]) {
    const arm = rig.arms[side];
    upperArm(ctx, arm);
    forearm(ctx, arm);
    if (!arm.onTable) wristEnd(ctx, arm, p, rig, extras);
  }
}

/** On the table: the cup, then the hands (and any forearm) that are over the table. */
export function armsFront(ctx, p, rig, extras = {}) {
  if (!rig.cup.held) {
    cup(ctx, rig.cup, extras.cupTilt || 0, true);
    steam(ctx, rig.cup, extras.steam || 0, extras.time || 0);
  }
  for (const side of [PATIENT_RIGHT, PATIENT_LEFT]) {
    const arm = rig.arms[side];
    if (!arm.onTable) continue;
    if (arm.elbowOverTable) forearm(ctx, arm);
    wristEnd(ctx, arm, p, rig, extras);
  }
}

void DEG;
