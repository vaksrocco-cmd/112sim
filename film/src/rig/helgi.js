// Helgi: 78, short grey hair, light blouse, dark-green knitted cardigan,
// reading glasses on a cord. Painted every frame from the rig parameters.
//
// Two passes, because the table hides her lap but her right hand lies on it:
//   drawRigBack   chair, body, neck, head            (behind the table)
//   drawRigFront  her cup, right sleeve end and hand (on the table)
//
// SIDES: the camera faces her, so HER right is SCREEN LEFT. Every piece of
// geometry that has a side takes `side` = PATIENT_RIGHT or PATIENT_LEFT from
// sides.js; nothing here says "left" or "right" by hand.
//
// Style-frame stage: the face parameters (brows, lids, gaze, mouth, head
// roll) already drive the drawing; the body parameters are wired in Prompt 2.

import { PATIENT_RIGHT, PATIENT_LEFT } from './sides.js';
import { toRest, HELGI } from '../layout.js';
import { PAL } from '../palette.js';
import {
  softBlob, taperStroke, fillSmooth, tracePath, linearGradient, radialGradient, rgba, mix, ellipse, lerp, clamp,
  makeCanvas, mottleOverlay,
} from '../paint.js';
import { mulberry32, hashString, helpers } from '../rng.js';
import { solveRig } from './solve.js';
import { armsBack, armsFront, cardiganFill } from './arms.js';

const DEG = Math.PI / 180;

/** A fixed random stream for a named detail, the same on every frame. */
const fixed = (name) => helpers(mulberry32(hashString(`helgi|${name}`)));

// The window is behind her to SCREEN LEFT, so that side of every form is lit.
const LIT = PATIENT_RIGHT; // -1: the lit side is screen left

// Parts that never change shape (hair, knit texture, skin brushwork) are
// painted once at double size and reused, so a frame only pays for what moves.
const sprites = new Map();
function sprite(name, w, h, ox, oy, painter) {
  let sp = sprites.get(name);
  if (!sp) {
    const canvas = makeCanvas(w * 2, h * 2);
    const g = canvas.getContext('2d');
    g.scale(2, 2);
    g.translate(ox, oy);
    painter(g);
    sp = { canvas, w, h, ox, oy };
    sprites.set(name, sp);
  }
  return sp;
}
function drawSprite(ctx, sp, dx = 0, dy = 0) {
  ctx.drawImage(sp.canvas, dx - sp.ox, dy - sp.oy, sp.w, sp.h);
}

// ---------------------------------------------------------------- chair

function chair(ctx) {
  const postX = { [PATIENT_RIGHT]: 528, [PATIENT_LEFT]: 1314 };
  // top rail, mostly hidden behind her shoulders
  fillSmooth(ctx, [[520, 606], [700, 592], [920, 588], [1140, 592], [1322, 606], [1322, 654], [1140, 642], [920, 638], [700, 642], [520, 654]],
    linearGradient(ctx, 520, 0, 1322, 0, [[0, PAL.chairLight], [0.25, PAL.chair], [1, PAL.chairShade]]));
  taperStroke(ctx, [[524, 611], [700, 597], [920, 593], [1140, 597], [1318, 611]], 5, PAL.chairLight, 0.5, 'none');
  for (const side of [PATIENT_RIGHT, PATIENT_LEFT]) {
    const x = postX[side];
    ctx.beginPath();
    ctx.roundRect(x - 18, 572, 36, 300, [16, 16, 0, 0]);
    ctx.fillStyle = linearGradient(ctx, x - 18, 0, x + 18, 0, [
      [0, mix(PAL.chairLight, '#e8d8c2', 0.3)],
      [0.3, PAL.chair],
      [1, PAL.chairShade],
    ]);
    ctx.fill();
    softBlob(ctx, x - 6, 592, 7, 16, '#f2e3cf', 0.4);
  }
}

// ---------------------------------------------------------------- torso

// The outline of her body and upper arms, at rest. Index order runs from the
// left of her neck in the picture, down HER right side, across the bottom
// (hidden by the table) and up HER left side.
const BODY_REST = [
  [860, 548], [800, 564], [718, 586], [648, 608], [598, 646], [578, 714], [572, 790], [570, 870],
  [1270, 870], [1268, 790], [1262, 714], [1242, 646], [1192, 608], [1122, 586], [1040, 564], [980, 548],
];
// The same outline where an arm has left the side of the body.
const BODY_CORE = {
  3: [662, 606], 4: [644, 640], 5: [652, 716], 6: [658, 790], 7: [660, 870],
  8: [1180, 870], 9: [1182, 790], 10: [1188, 716], 11: [1196, 640], 12: [1178, 606],
};
const BREATH_LIFT = [13, 15, 19, 25, 26, 11, 0, 0, 0, 0, 11, 26, 25, 19, 15, 13];
const SLUMP_DROP = [0, 2, 6, 10, 11, 4, 0, 0, 0, 0, 4, 11, 10, 6, 2, 0];

function bodyOutline(p, rig) {
  const awayR = rig.arms[PATIENT_RIGHT].away;
  const awayL = rig.arms[PATIENT_LEFT].away;
  return BODY_REST.map(([x, y], i) => {
    let px = x;
    let py = y;
    if (BODY_CORE[i]) {
      const away = i <= 7 ? awayR : awayL;
      px = lerp(x, BODY_CORE[i][0], away);
      py = lerp(y, BODY_CORE[i][1], away);
    }
    if (i === 4 || i === 5) px -= 5 * p.breath;
    if (i === 10 || i === 11) px += 5 * p.breath;
    py += -BREATH_LIFT[i] * p.breath + SLUMP_DROP[i] * p.torsoSlump;
    return [px, py];
  });
}

const BOX = HELGI.box;

/** Knit ribs and wool flecks for the whole cardigan, painted once. */
function knitTexture() {
  return sprite('knit', BOX.w, BOX.h, -BOX.x, -BOX.y, (ctx) => {
    const rng = fixed('knit');
    for (let x = 566; x < 1280; x += 8.5) {
      const lean = (x - 920) / 350;
      const top = 530 + Math.abs(lean) * 60;
      const pts = [[x - lean * 12, top], [x + lean * 4, 700], [x + lean * 9, 876]];
      taperStroke(ctx, pts, 2.6, PAL.cardiganDeep, 0.2 + rng.next() * 0.1, 'none', 4);
      taperStroke(ctx, pts.map(([px, py]) => [px + 3, py]), 1.6, PAL.cardiganLight, 0.14 + rng.next() * 0.08, 'none', 4);
    }
    for (let i = 0; i < 300; i++) {
      softBlob(ctx, rng.range(570, 1270), rng.range(556, 866), rng.range(1.5, 3.5), rng.range(2, 5), rng.next() < 0.5 ? PAL.cardiganLight : PAL.cardiganDeep, rng.range(0.1, 0.24));
    }
  });
}

function torso(ctx, p, rig) {
  const outline = bodyOutline(p, rig);
  const chest = -13 * p.breath; // everything on her upper chest rises with a breath
  // soft shadow she casts on the chair rail
  softBlob(ctx, 930, 640, 420, 46, PAL.shadow, 0.25);

  ctx.save();
  ctx.beginPath();
  tracePath(ctx, outline, true);
  ctx.clip();

  // cardigan: lit from the window at screen left, falling into shade at screen right
  ctx.fillStyle = cardiganFill(ctx);
  ctx.fillRect(540, 500, 760, 400);
  // form: chest forward, hollows under the arms, shade under the chin
  softBlob(ctx, 920, 572 + chest, 150, 64, PAL.cardiganDeep, 0.42);
  softBlob(ctx, 1176, 760, 34, 140, PAL.cardiganDeep, 0.5);
  softBlob(ctx, 668, 770, 30, 130, PAL.cardiganDeep, 0.4);
  softBlob(ctx, 790, 690 + chest, 110 + 14 * p.breath, 90, PAL.cardiganLight, 0.22 + 0.1 * p.breath);
  softBlob(ctx, 920, 868, 380, 60, PAL.cardiganDeep, 0.4);
  softBlob(ctx, 1230, 690, 60, 130, PAL.cardiganDeep, 0.3);
  // a slumped chest folds in on itself
  if (p.torsoSlump > 0) softBlob(ctx, 920, 720, 260, 34, PAL.cardiganDeep, 0.3 * p.torsoSlump);

  drawSprite(ctx, knitTexture());

  // creases where the sleeves meet the body
  taperStroke(ctx, [[1150, 636], [1178, 700], [1172, 790], [1176, 866]], 9, PAL.cardiganDeep, 0.5);
  taperStroke(ctx, [[690, 636], [664, 700], [670, 790], [666, 866]], 9, PAL.cardiganDeep, 0.42);
  taperStroke(ctx, [[1076, 606], [1120, 660], [1136, 740]], 7, PAL.cardiganDeep, 0.22);
  taperStroke(ctx, [[764, 606], [722, 660], [706, 740]], 7, PAL.cardiganDeep, 0.18);

  // daylight catching the shoulder and upper arm on the lit side
  const rim = outline.slice(0, 7).map(([x, y], i) => [x + (i > 3 ? 5 : i === 3 ? 2 : 0), y + (i > 4 ? 0 : 5)]);
  taperStroke(ctx, rim, 16, '#a9c2ae', 0.3, 'soft');
  taperStroke(ctx, rim.map(([x, y]) => [x - 2, y - 2]), 6, '#d6e4d6', 0.5, 'soft');
  ctx.restore();

  ctx.save();
  ctx.translate(0, chest);
  // ---- blouse in the V of the cardigan
  const V = [[874, 544], [966, 544], [960, 610], [942, 676], [922, 734], [902, 676], [882, 610]];
  ctx.save();
  ctx.beginPath();
  tracePath(ctx, V, true);
  ctx.clip();
  ctx.fillStyle = linearGradient(ctx, 870, 0, 970, 0, [
    [0, '#ebe6da'],
    [0.5, PAL.blouse],
    [1, PAL.blouseShade],
  ]);
  ctx.fillRect(860, 530, 120, 210);
  softBlob(ctx, 924, 556, 64, 50, '#6f6055', 0.5); // shade under the chin
  const dots = fixed('blouse');
  for (let i = 0; i < 70; i++) softBlob(ctx, dots.range(872, 968), dots.range(560, 732), 2.2, 2.2, '#8fa0ad', 0.5);
  taperStroke(ctx, [[921, 584], [922, 660], [922, 732]], 2, PAL.blouseShade, 0.7, 'none');
  for (const by of [632, 684]) {
    ellipse(ctx, 922, by, 5, 5);
    ctx.fillStyle = '#f7f3ea';
    ctx.fill();
    softBlob(ctx, 923, by + 1, 6, 6, PAL.blouseShade, 0.35);
  }
  ctx.restore();

  // ribbed front bands of the cardigan along the V
  for (const side of [PATIENT_RIGHT, PATIENT_LEFT]) {
    const s = side;
    const band = [[920 + s * 50, 548], [920 + s * 43, 612], [920 + s * 24, 680], [920 + s * 3, 738], [921 + s * 1, 790], [920 + s * 2, 870]];
    taperStroke(ctx, band, 26, side === LIT ? PAL.cardigan : mix(PAL.cardigan, PAL.cardiganShade, 0.5), 1, 'none');
    taperStroke(ctx, band.map(([x, y]) => [x - s * 11, y]), 3, PAL.cardiganDeep, 0.45, 'none');
    taperStroke(ctx, band.map(([x, y]) => [x + s * 11, y]), 3, PAL.cardiganDeep, 0.5, 'none');
    // rib marks across the band
    for (let t = 0.02; t < 1; t += 0.028) {
      const i = Math.min(band.length - 2, Math.floor(t * (band.length - 1)));
      const f = t * (band.length - 1) - i;
      const x = lerp(band[i][0], band[i + 1][0], f);
      const y = lerp(band[i][1], band[i + 1][1], f);
      taperStroke(ctx, [[x - 10, y - 1], [x + 10, y + 1]], 2, PAL.cardiganLight, 0.2, 'none');
    }
  }
  // top button, just above the table edge
  softBlob(ctx, 924, 770, 12, 12, PAL.cardiganDeep, 0.6);
  ellipse(ctx, 922, 767, 9, 9);
  ctx.fillStyle = radialGradient(ctx, 919, 764, 1, 11, [[0, '#b7a583'], [1, PAL.button]]);
  ctx.fill();
  softBlob(ctx, 920, 767, 2, 2, '#3d3327', 0.8);
  softBlob(ctx, 925, 767, 2, 2, '#3d3327', 0.8);

  // blouse collar: two small pointed leaves lying over the cardigan
  for (const side of [PATIENT_RIGHT, PATIENT_LEFT]) {
    const s = side;
    const c = [[920 + s * 5, 570], [920 + s * 30, 550], [920 + s * 50, 552], [920 + s * 56, 574], [920 + s * 44, 602], [920 + s * 22, 588]];
    ctx.save();
    ctx.shadowColor = rgba(PAL.cardiganDeep, 0.55);
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 3;
    ctx.beginPath();
    ctx.moveTo(c[0][0], c[0][1]);
    ctx.quadraticCurveTo(c[1][0] - s * 8, c[1][1] + 6, c[1][0], c[1][1]);
    ctx.quadraticCurveTo(c[2][0], c[2][1] - 4, c[3][0], c[3][1]);
    ctx.lineTo(c[4][0], c[4][1]);
    ctx.quadraticCurveTo(c[5][0], c[5][1] + 4, c[0][0], c[0][1]);
    ctx.closePath();
    ctx.fillStyle = side === LIT ? '#dfd9cc' : mix(PAL.blouse, PAL.blouseShade, 0.85);
    ctx.fill();
    ctx.restore();
    taperStroke(ctx, [c[3], c[4], c[5]], 1.6, side === LIT ? '#f3efe5' : PAL.blouse, 0.55);
    softBlob(ctx, 920 + s * 26, 558, 30, 16, '#6f6055', 0.35); // the chin shades the top of the collar
  }
  ctx.restore();
}

function glassesOnCord(ctx) {
  // the cord runs round her neck and the glasses rest on her chest
  const cord = (s) => [[920 + s * 58, 556], [920 + s * 70, 610], [920 + s * 63, 664], [920 + s * 52, 700]];
  for (const side of [PATIENT_RIGHT, PATIENT_LEFT]) {
    taperStroke(ctx, cord(side), 3.2, PAL.cord, 0.95, 'none');
    taperStroke(ctx, cord(side).map(([x, y]) => [x - 1, y - 0.5]), 1.2, '#b48a72', 0.6, 'none');
  }
  ctx.save();
  ctx.translate(922, 714);
  ctx.rotate(-3 * DEG);
  softBlob(ctx, 4, 8, 84, 26, PAL.cardiganDeep, 0.5);
  for (const s of [-1, 1]) {
    // lens: mostly clear, a little sky in it
    ellipse(ctx, s * 37, 0, 30, 21);
    ctx.fillStyle = 'rgba(205, 220, 222, 0.2)';
    ctx.fill();
    softBlob(ctx, s * 37 - 9, -7, 14, 7, '#eef4f2', 0.42, -0.4);
    ctx.strokeStyle = PAL.glassFrame;
    ctx.lineWidth = 3.4;
    ellipse(ctx, s * 37, 0, 30, 21);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(214, 190, 150, 0.7)';
    ctx.lineWidth = 1.1;
    ellipse(ctx, s * 37, 0, 30, 21, 0, Math.PI * 1.05, Math.PI * 1.6);
    ctx.stroke();
    // temple arm folded up toward the cord
    taperStroke(ctx, [[s * 66, -4], [s * 62, -14], [s * 52, -16]], 3.6, PAL.glassFrame, 1, 'none');
  }
  ctx.strokeStyle = PAL.glassFrame;
  ctx.lineWidth = 3.4;
  ctx.beginPath();
  ctx.moveTo(-8, -4);
  ctx.quadraticCurveTo(0, -10, 8, -4);
  ctx.stroke();
  ctx.restore();
}

// ---------------------------------------------------------------- neck

function neck(ctx, p, chest) {
  ctx.save();
  ctx.translate(920, 580 + chest);
  ctx.rotate(p.headRoll * 0.45 * DEG - 5 * 0.45 * DEG);
  ctx.translate(-920, -580);
  const pts = [[858, 470], [854, 520], [850, 556], [920, 578], [990, 556], [986, 520], [982, 470]];
  ctx.save();
  ctx.beginPath();
  tracePath(ctx, pts, true);
  ctx.clip();
  // The neck is in the shadow of the jaw: clearly darker than the face, so
  // the jawline reads.
  ctx.fillStyle = linearGradient(ctx, 860, 0, 980, 0, [
    [0, mix(PAL.skinShade, PAL.skin, 0.35)],
    [0.5, PAL.skinShade],
    [1, mix(PAL.skinShade, PAL.skinDeep, 0.6)],
  ]);
  ctx.fillRect(850, 460, 140, 120);
  softBlob(ctx, 924, 500, 100, 46, PAL.skinDeep, 0.75);
  softBlob(ctx, 944, 540, 60, 40, PAL.skinDeep, 0.3);
  // the soft cords of an old neck, and a crease
  taperStroke(ctx, [[900, 512], [904, 540], [910, 568]], 5, PAL.skinDeep, 0.3);
  taperStroke(ctx, [[942, 512], [938, 540], [932, 568]], 5, PAL.skinDeep, 0.3);
  taperStroke(ctx, [[872, 538], [920, 547], [970, 538]], 2.2, PAL.skinLine, 0.32);
  softBlob(ctx, 858, 522, 10, 40, PAL.skinLight, 0.4); // daylight on the lit side of the neck
  ctx.restore();
  ctx.restore();
}

// ---------------------------------------------------------------- head
// Head-local coordinates: origin at the centre of the head, x to screen
// right, y down. Crown ≈ −164, chin ≈ +164.

const FACE = [
  [0, -164], [58, -156], [100, -116], [112, -56], [113, 2], [108, 50], [97, 94], [78, 128], [46, 154],
  [0, 163], [-46, 154], [-78, 128], [-97, 94], [-108, 50], [-113, 2], [-112, -56], [-100, -116], [-58, -156],
];

// outer silhouette of the hair, from below HER right ear, over the crown, to below her left ear
const HAIR_OUTER = [
  [-118, 60], [-138, 36], [-152, -22], [-148, -90], [-123, -153], [-70, -193], [-6, -205],
  [58, -193], [108, -160], [139, -102], [149, -36], [140, 28], [121, 60],
];

// hairline: where the hair meets the temples and forehead
const HAIRLINE = [
  [-111, 36], [-107, -30], [-93, -78], [-58, -102], [-12, -111], [36, -101], [78, -86], [101, -52], [108, -4], [111, 36],
];

const hairlineY = (x) => -111 + 0.0026 * x * x + (Math.abs(x) > 78 ? (Math.abs(x) - 78) * 2.4 : 0);

function paintHairBack(ctx) {
  // The hair behind the head, including the short hair at the nape that
  // shows behind the jaw on both sides. It is in shade.
  fillSmooth(ctx, [...HAIR_OUTER, [116, 96], [92, 128], [60, 120], [-60, 120], [-92, 128], [-116, 96]], linearGradient(ctx, -150, 0, 150, 0, [
    [0, mix(PAL.hair, PAL.hairLight, 0.5)],
    [0.2, mix(PAL.hair, PAL.hairShade, 0.3)],
    [0.75, PAL.hairShade],
    [1, mix(PAL.hairShade, PAL.hairDeep, 0.5)],
  ]));
  const rng = fixed('nape');
  for (let i = 0; i < 46; i++) {
    const s = i % 2 ? -1 : 1;
    const x = s * rng.range(84, 126);
    const y = rng.range(40, 112);
    const len = rng.range(16, 30);
    taperStroke(ctx, [[x, y - len / 2], [x - s * 3, y], [x - s * rng.range(4, 12), y + len / 2]], rng.range(3, 6),
      s === LIT ? mix(PAL.hair, PAL.hairLight, rng.next() * 0.6) : mix(PAL.hairShade, PAL.hairDeep, rng.next()), rng.range(0.4, 0.75));
  }
}

function paintHairFront(ctx) {
  ctx.save();
  ctx.beginPath();
  tracePath(ctx, [...HAIR_OUTER, ...[...HAIRLINE].reverse()], true);
  ctx.clip();
  ctx.fillStyle = linearGradient(ctx, -150, 0, 150, 0, [
    [0, mix(PAL.hairLight, PAL.hair, 0.3)],
    [0.3, PAL.hair],
    [0.72, mix(PAL.hair, PAL.hairShade, 0.55)],
    [1, PAL.hairShade],
  ]);
  ctx.fillRect(-160, -210, 320, 280);
  // depth: darker near the hairline, under the crown on the far side, behind the ears
  softBlob(ctx, 20, -100, 120, 20, PAL.hairDeep, 0.32);
  softBlob(ctx, 128, 14, 26, 66, PAL.hairDeep, 0.42);
  softBlob(ctx, -124, 30, 20, 40, PAL.hairDeep, 0.22);
  softBlob(ctx, 74, -140, 80, 50, PAL.hairShade, 0.35);

  // Short, softly waved locks, combed from a side parting toward both sides
  // and turning downward over the temples.
  const rng = fixed('hair');
  const partX = 24;
  let placed = 0;
  for (let guard = 0; placed < 330 && guard < 4000; guard++) {
    const x = rng.range(-150, 150);
    const y = rng.range(-205, 62);
    const inside = (x / 152) ** 2 + ((y + 38) / 168) ** 2 < 1;
    const overFace = Math.abs(x) < 106 && y > hairlineY(x) + 4;
    if (!inside || overFace) continue;
    placed++;
    const sg = x < partX ? -1 : 1;
    const away = clamp(Math.abs(x - partX) / 128);
    const phi = (lerp(6, 80, away ** 0.85) + rng.range(-13, 13)) * DEG;
    const dx = sg * Math.cos(phi);
    const dy = Math.sin(phi);
    const len = rng.range(30, 66);
    const wave = rng.range(-9, 9);
    const pts = [
      [x - dx * len * 0.5, y - dy * len * 0.5],
      [x - dy * wave, y + dx * wave * sg],
      [x + dx * len * 0.5, y + dy * len * 0.5],
    ];
    const litChance = x < -20 ? 0.72 : x < 60 ? 0.42 : 0.2;
    const col = rng.next() < litChance
      ? mix(PAL.hairLight, PAL.hair, rng.next() * 0.7)
      : mix(PAL.hair, PAL.hairDeep, rng.next() * 0.75);
    taperStroke(ctx, pts, rng.range(3, 7.5), col, rng.range(0.28, 0.62));
  }
  // soft light on the crown from the window
  softBlob(ctx, -66, -158, 86, 28, '#ffffff', 0.3, -0.5);
  ctx.restore();

  // wisps of the fringe falling over the top of the forehead
  const fr = fixed('fringe');
  for (let i = 0; i < 20; i++) {
    const x = fr.range(-92, 92);
    const sg = x < 24 ? -1 : 1;
    const y0 = hairlineY(x) - fr.range(6, 22);
    const drop = fr.range(12, 28);
    const sweep = sg * fr.range(8, 22);
    taperStroke(ctx, [[x - sweep, y0], [x - sweep * 0.2, y0 + drop * 0.5], [x + sweep * 0.5, y0 + drop]], fr.range(2.2, 4.4),
      x < 0 ? mix(PAL.hairLight, PAL.hair, fr.next()) : mix(PAL.hair, PAL.hairShade, fr.next()), fr.range(0.55, 0.9), 'end');
  }
  // small curls turning out at the ends, over the ears
  const cu = fixed('curls');
  for (let i = 0; i < 40; i++) {
    const s = i % 2 ? -1 : 1;
    const y = cu.range(-40, 58);
    const x = s * (lerp(146, 122, clamp((y + 40) / 98)) + cu.range(-14, 4));
    const r = cu.range(7, 13);
    const col = s === LIT ? mix(PAL.hairLight, PAL.hair, cu.next()) : mix(PAL.hair, PAL.hairDeep, cu.next() * 0.8);
    taperStroke(ctx, [[x - s * r * 0.4, y - r], [x + s * r * 0.5, y], [x - s * r * 0.3, y + r]], cu.range(3, 5.5), col, cu.range(0.45, 0.85));
  }
  // daylight rim on the lit edge of her hair
  taperStroke(ctx, [[-124, 50], [-146, -22], [-141, -88], [-115, -150], [-64, -188], [-4, -200]], 6, '#ffffff', 0.5, 'soft');
  // a few loose hairs break the outline so it does not look cut out
  const loose = fixed('loose');
  for (let i = 0; i < 22; i++) {
    const a = loose.range(-200, 20) * DEG;
    const x0 = Math.cos(a) * 149;
    const y0 = -40 + Math.sin(a) * 160;
    const len = loose.range(8, 20);
    const col = x0 < 0 ? PAL.hairLight : PAL.hairShade;
    taperStroke(ctx, [[x0, y0], [x0 + Math.cos(a) * len * 0.6 + loose.range(-4, 4), y0 + Math.sin(a) * len * 0.5], [x0 + Math.cos(a) * len + loose.range(-5, 5), y0 + Math.sin(a) * len * 0.4 + loose.range(0, 8)]], loose.range(1.3, 2.4), col, loose.range(0.35, 0.7), 'end');
  }
}

const hairBackSprite = () => sprite('hairBack', 340, 360, 170, 215, paintHairBack);
const hairFrontSprite = () => sprite('hairFront', 340, 300, 170, 215, paintHairFront);

function ears(ctx, turn) {
  // turn > 0: the head is turned toward screen right, so the ear at screen
  // left comes forward and the other goes behind the head
  for (const side of [PATIENT_RIGHT, PATIENT_LEFT]) {
    const s = side;
    const show = clamp(1 - side * turn * 1.6);
    if (show <= 0) continue;
    const dx = -turn * 16;
    fillSmooth(ctx, [[s * 108 + dx, -14], [s * 122 + dx, -8], [s * 127 + dx, 16], [s * 122 + dx, 44], [s * 112 + dx, 54], [s * 106 + dx, 34]],
      side === LIT ? mix(PAL.skin, PAL.skinLight, 0.4) : PAL.skinShade);
    softBlob(ctx, s * 116 + dx, 16, 6, 16, PAL.skinDeep, 0.4);
  }
}

/** The outline of the face. HER right cheek and jaw sink with cheekSagR (S2). */
function faceOutline(p) {
  const sag = p.cheekSagR;
  if (!sag) return FACE;
  const pts = FACE.map((q) => [q[0], q[1]]);
  const r = PATIENT_RIGHT; // her right is at negative x
  pts[10] = [r * 48, 154 + 5 * sag];
  pts[11] = [r * (81 + 3 * sag), 128 + 12 * sag];
  pts[12] = [r * (98 + 2 * sag), 94 + 10 * sag];
  pts[13] = [r * 108, 50 + 4 * sag];
  return pts;
}

/** Blotches and brushwork of the skin, painted once. */
function skinTexture() {
  return sprite('skin', 260, 360, 130, 180, (ctx) => {
    const rng = fixed('skin');
    for (let i = 0; i < 64; i++) {
      softBlob(ctx, rng.range(-112, 112), rng.range(-150, 160), rng.range(14, 40), rng.range(12, 34),
        rng.pick([PAL.skinLight, PAL.blush, PAL.skinDeep, '#d6ad8c', '#e6c7ae']), rng.range(0.05, 0.12), rng.range(0, 3));
    }
    for (let i = 0; i < 150; i++) {
      const x = rng.range(-108, 108);
      const y = rng.range(-110, 156);
      // strokes run across the forehead and round the cheeks and jaw
      const ang = y < -30 ? rng.range(-0.25, 0.25) : Math.atan2(y - 10, x) + Math.PI / 2 + rng.range(-0.4, 0.4);
      const len = rng.range(16, 40);
      const dx = Math.cos(ang) * len * 0.5;
      const dy = Math.sin(ang) * len * 0.5;
      taperStroke(ctx, [[x - dx, y - dy], [x + rng.range(-3, 3), y + rng.range(-3, 3)], [x + dx, y + dy]], rng.range(5, 10),
        rng.pick([PAL.skinLight, PAL.skinShade, PAL.blush, '#e3c5ae', '#cfa78f']), rng.range(0.05, 0.11));
    }
  });
}

function skin(ctx, p, outline) {
  const sag = p.cheekSagR;
  ctx.save();
  ctx.beginPath();
  tracePath(ctx, outline, true);
  ctx.clip();
  // base: the lit side of the face is screen left
  ctx.fillStyle = linearGradient(ctx, -116, 0, 116, 0, [
    [0, '#e8cfbc'],
    [0.3, '#dcc0ab'],
    [0.62, PAL.skin],
    [0.86, '#c6a38e'],
    [1, '#b08a76'],
  ]);
  ctx.fillRect(-140, -180, 280, 370);
  drawSprite(ctx, skinTexture());

  // large forms
  softBlob(ctx, 0, -150, 150, 56, PAL.skinDeep, 0.36); // shade under the fringe
  softBlob(ctx, 76, 40, 34, 120, PAL.skinShade, 0.4); // the soft core shadow down the far side
  softBlob(ctx, 70, 84, 30, 22, PAL.skinDeep, 0.12); // under the far cheekbone
  softBlob(ctx, 122, 20, 44, 170, PAL.skinDeep, 0.34); // far cheek turning away
  softBlob(ctx, -28, -62, 78, 26, PAL.skinLight, 0.4); // forehead
  softBlob(ctx, 0, 176, 120, 34, PAL.skinDeep, 0.42); // turning under the jaw
  for (const side of [PATIENT_RIGHT, PATIENT_LEFT]) {
    const s = side;
    const g = side === PATIENT_RIGHT ? sag : 0; // only HER right cheek sags
    softBlob(ctx, s * 48, -12, 42, 26, PAL.skinDeep, 0.32); // eye sockets
    softBlob(ctx, s * 48, 15 + 2 * g, 32, 11 + 3 * g, PAL.skinDeep, 0.16 + 0.1 * g); // under the eyes
    softBlob(ctx, s * 64, 50 + 12 * g, 42, 32, PAL.blush, 0.22 * (1 - 0.35 * g)); // cheeks
    softBlob(ctx, s * 86, 78 + 8 * g, 20, 42, PAL.skinDeep, 0.14); // the hollow of an old cheek
    softBlob(ctx, s * (88 + 4 * g), 122 + 10 * g, 26 + 6 * g, 28 + 6 * g, PAL.skinDeep, 0.2 + 0.16 * g); // jowls
    softBlob(ctx, s * 92, -40, 20, 34, PAL.skinDeep, 0.14); // temples
  }
  // the lit cheekbone: it loses its roundness when the cheek sags
  softBlob(ctx, -62, 34 + 8 * sag, 44, 38, PAL.skinLight, 0.38 * (1 - 0.6 * sag));
  if (sag > 0) {
    softBlob(ctx, PATIENT_RIGHT * 70, 100, 40, 34, PAL.skinDeep, 0.2 * sag); // the weight of the cheek settles low
    softBlob(ctx, PATIENT_RIGHT * 58, 62, 34, 20, PAL.skin, 0.3 * sag); // and the fold beside the nose smooths out
  }
  // jawline: a soft darker edge so the face ends before the neck begins
  const jaw = [outline[12], outline[11], outline[10], outline[9], outline[8], outline[7], outline[6]].map(([x, y]) => [x * 0.985, y - 2]);
  taperStroke(ctx, jaw, 9, PAL.skinDeep, 0.26, 'soft');
  softBlob(ctx, -115, 10, 14, 150, '#fff4e8', 0.55); // daylight on the edge of the lit cheek
  ctx.restore();
}

function wrinkles(ctx, p) {
  const line = (pts, w, a) => taperStroke(ctx, pts, w, PAL.skinLine, a);
  const light = (pts, w, a) => taperStroke(ctx, pts, w, PAL.skinLight, a);
  // forehead: two faint lines
  line([[-70, -66], [-18, -72], [34, -70], [74, -62]], 2.2, 0.2);
  line([[-56, -84], [0, -89], [56, -83]], 1.8, 0.13);
  // between the brows: deeper when she frowns
  const k = p.browKnit;
  line([[-8, -50], [-7, -40], [-9, -29]], 2.6, 0.14 + 0.42 * k);
  line([[8, -50], [7, -40], [9, -29]], 2.6, 0.14 + 0.42 * k);
  for (const side of [PATIENT_RIGHT, PATIENT_LEFT]) {
    const s = side;
    const sag = side === PATIENT_RIGHT ? p.cheekSagR : 0;
    // crow's feet
    line([[s * 78, -12], [s * 90, -17]], 1.8, 0.28);
    line([[s * 79, -6], [s * 93, -5]], 1.8, 0.28);
    line([[s * 78, 0], [s * 90, 7]], 1.8, 0.24);
    // nose-to-mouth fold: it flattens on the side where the cheek sags (S2)
    const fold = [[s * 26, 54], [s * 38, 72], [s * 49, 96], [s * 52, 114 + sag * 6]];
    line(fold, 3.2, 0.44 * (1 - 0.88 * sag));
    light(fold.map(([x, y]) => [x + s * 6, y - 1]), 4.5, 0.22 * (1 - sag));
    // lines from the mouth corners toward the chin: longer under a drooping corner
    const drop = mouthCornerDrop(side === PATIENT_RIGHT ? p.mouthCornerR : p.mouthCornerL);
    const low = Math.max(0, drop);
    line([[s * 46, 116 + low], [s * 50, 130 + low * 0.9], [s * 46, 142 + low * 0.7]], 2.2, 0.2 + 0.012 * low);
    // soft cheek line
    line([[s * 88, 26], [s * 92, 58], [s * 84, 86]], 2.4, 0.12);
  }
  // chin crease
  line([[-22, 136], [0, 132], [22, 136]], 2.2, 0.2);
  // fine lines above the upper lip
  for (const x of [-20, -7, 7, 20]) line([[x, 86], [x * 1.04, 93]], 1.3, 0.12);
}

function nose(ctx) {
  // the shaded side plane of the nose (screen right, away from the window)
  fillSmooth(ctx, [[7, -26], [14, 6], [24, 40], [28, 54], [18, 62], [8, 50], [6, 12]], rgba(PAL.skinDeep, 0.2));
  softBlob(ctx, 16, 20, 12, 46, PAL.skinDeep, 0.2);
  softBlob(ctx, -5, 2, 6, 40, PAL.skinLight, 0.55); // lit ridge
  softBlob(ctx, 0, 46, 20, 16, PAL.skin, 0.6); // the ball of the nose
  softBlob(ctx, 10, 50, 13, 12, PAL.skinDeep, 0.24);
  softBlob(ctx, -5, 41, 7, 6, '#fff6ec', 0.55);
  // shadow under the nose
  fillSmooth(ctx, [[-17, 63], [-6, 67], [6, 67], [19, 63], [14, 72], [0, 74], [-12, 71]], rgba(PAL.skinDeep, 0.4));
  for (const s of [-1, 1]) {
    softBlob(ctx, s * 10.5, 62, 6.5, 3.8, '#6d4a40', 0.75); // nostrils
    taperStroke(ctx, [[s * 19, 42], [s * 26, 52], [s * 24, 61], [s * 16, 65]], 2.4, PAL.skinLine, s === LIT ? 0.28 : 0.44); // wings
  }
  taperStroke(ctx, [[-7, 64], [0, 66], [7, 64]], 1.8, PAL.skinLine, 0.4);
}

/** One eye and its brow. `side` is PATIENT_RIGHT or PATIENT_LEFT. */
function eye(ctx, side, p) {
  const lid = side === PATIENT_RIGHT ? p.lidR : p.lidL;
  const open = Math.max(0, 1 - lid);
  ctx.save();
  ctx.translate(side * 48, -9);
  // Mirror, so that +x always points to the outer corner of this eye.
  ctx.scale(side * 1.2, 1.2);

  const inner = [-21, 3];
  const outer = [22, 2.5];
  const upY = -11 * open + 2.5 * (1 - open);
  const lowY = 3.5 + 4.5 * open + (side === PATIENT_RIGHT ? 1.6 * p.cheekSagR : 0);
  const eyeShape = () => {
    ctx.beginPath();
    ctx.moveTo(inner[0], inner[1]);
    ctx.bezierCurveTo(-12, upY - 2, 9, upY - 1, outer[0], outer[1]);
    ctx.bezierCurveTo(11, lowY, -10, lowY + 1, inner[0], inner[1]);
    ctx.closePath();
  };

  if (open > 0.05) {
    ctx.save();
    eyeShape();
    ctx.clip();
    ctx.fillStyle = linearGradient(ctx, 0, -12, 0, 10, [
      [0, '#a2978f'],
      [0.5, '#dad2c8'],
      [1, '#cbc2b7'],
    ]);
    ctx.fillRect(-26, -14, 52, 28);
    // Iris. gazeX is in screen terms, so undo the mirror for it. Both irises
    // sit a touch outward: the unfocused look.
    const ix = p.gazeX * 6.5 * side + 1.5;
    const iy = p.gazeY * 4.5 - 0.5;
    ellipse(ctx, ix, iy, 9.9, 9.9);
    ctx.fillStyle = radialGradient(ctx, ix, iy + 2, 1, 10.5, [
      [0, '#8d9799'],
      [0.55, PAL.iris],
      [0.9, PAL.irisDark],
      [1, '#363d40'],
    ]);
    ctx.fill();
    ellipse(ctx, ix, iy, 4.7, 4.7);
    ctx.fillStyle = '#25272a';
    ctx.fill();
    // a soft window light in the eye, on the screen-left side of both eyes
    softBlob(ctx, ix + side * -3.6, iy - 3.6, 3, 2.8, '#ffffff', 0.55);
    // the upper lid shades the top of the eyeball
    softBlob(ctx, 0, upY, 30, 7.5, '#3b2d29', 0.48);
    ctx.restore();
  }

  // a closed lid is a soft fold of skin over the eye
  if (open < 0.3) {
    const c = 1 - open / 0.3;
    softBlob(ctx, 0, -1, 24, 9, PAL.skin, 0.75 * c);
    softBlob(ctx, 0, -4, 20, 5, PAL.skinLight, 0.3 * c);
  }
  // upper lid edge
  taperStroke(ctx, [inner, [-12, upY + 1.5 + (1 - open) * 1.5], [8, upY + 1 + (1 - open) * 1.5], outer], 3, '#4a3933', 0.9, 'soft');
  taperStroke(ctx, [outer, [26, 4.5], [29, 8]], 2, '#4a3933', 0.45, 'end');
  // the fold above the lid, and the soft hooding of an old eyelid
  taperStroke(ctx, [[-20, -5], [-8, upY - 7.5], [10, upY - 7.5], [26, -1]], 2.2, PAL.skinLine, 0.5);
  softBlob(ctx, 14, -13, 17, 7, PAL.skinShade, 0.45, 0.2);
  softBlob(ctx, -2, upY - 3.5, 20, 4, PAL.skinLight, 0.32 * open);
  // lower lid and the soft bag under the eye
  taperStroke(ctx, [[-18, 6], [-6, lowY + 1], [10, lowY], [21, 3.5]], 1.6, PAL.skinLine, 0.42);
  softBlob(ctx, 0, lowY + 5, 22, 4, PAL.skinLight, 0.32);
  taperStroke(ctx, [[-20, 13], [-2, 19.5], [20, 14]], 2.2, PAL.skinLine, 0.26);

  // brow: thin and grey. Knit pulls the inner end down and in; raise lifts it.
  const k = p.browKnit;
  const r = p.browRaise;
  const brow = [
    [-26 - k * 3.5, -29 + k * 7 - r * 5],
    [-10 - k * 2, -35 + k * 3 - r * 8],
    [10, -37 - r * 8],
    [34, -28 - r * 4],
  ];
  taperStroke(ctx, brow, 7.5, '#8f8982', 0.34);
  const rng = fixed(`brow${side}`);
  for (let i = 0; i < 46; i++) {
    const t = rng.next();
    const j = Math.min(2, Math.floor(t * 3));
    const f = t * 3 - j;
    const x = lerp(brow[j][0], brow[j + 1][0], f) + rng.range(-1.5, 1.5);
    const y = lerp(brow[j][1], brow[j + 1][1], f) + rng.range(-2.5, 2.5);
    taperStroke(ctx, [[x - 3.5, y + 2.5], [x + 4.5, y - 2.5 + t * 3.5]], rng.range(1.1, 1.9), rng.next() < 0.6 ? '#7a7570' : '#c9c6bf', rng.range(0.4, 0.8), 'end');
  }
  ctx.restore();
}

/** How far a mouth corner sits below its neutral place, in px (negative = raised). */
function mouthCornerDrop(value) {
  return value < 0 ? -value * 15 : -value * 8;
}

function mouth(ctx, p) {
  const g = p.mouthOpen * 20; // how far the lower lip drops
  // mouthCornerR is HER right corner, drawn at screen left; L is her left.
  const dropR = mouthCornerDrop(p.mouthCornerR);
  const dropL = mouthCornerDrop(p.mouthCornerL);
  const slackR = Math.max(0, dropR) / 15; // 0…1: a drooping corner hangs slack
  const slackL = Math.max(0, dropL) / 15;
  const a = [PATIENT_RIGHT * (41 + 1.5 * slackR), 102 + dropR]; // her right corner (screen left)
  const b = [PATIENT_LEFT * (41 + 1.5 * slackL), 102 + dropL]; // her left corner (screen right)
  // The half of the mouth beside a dropped corner slopes down toward it; the
  // middle and the other half stay where they are.
  const da = dropR * 0.42;
  const db = dropL * 0.42;
  const midY = 100;
  const upperLine = [a, [-22, midY + da], [0, midY + 1], [22, midY + db], b];
  // the slack side parts a little even when the mouth is closed
  // A slack side barely follows when she opens her mouth to speak: in S2 only
  // the other side of her mouth moves properly.
  const gapR = g * 0.8 * (1 - 0.8 * slackR) + 2.6 * slackR;
  const gapL = g * 0.8 * (1 - 0.8 * slackL) + 2.6 * slackL;
  const slack = Math.max(slackR, slackL);
  const lowerLine = [a, [-22, midY + da + gapR], [0, midY + 1 + g * (1 - 0.3 * slack)], [22, midY + db + gapL], b];
  const parted = g > 0.5 || slackR > 0.3 || slackL > 0.3;

  softBlob(ctx, 0, 122 + g, 30, 8, PAL.skinDeep, 0.32); // shade under the lower lip

  // inside of the mouth
  if (parted) {
    ctx.save();
    ctx.beginPath();
    tracePath(ctx, upperLine);
    const rev = [...lowerLine].reverse();
    for (let i = 1; i < rev.length; i++) ctx.lineTo(rev[i][0], rev[i][1]);
    ctx.closePath();
    ctx.fillStyle = '#3d2725';
    ctx.fill();
    if (g > 6) {
      ctx.clip();
      softBlob(ctx, 0, midY + 2, 26, Math.min(6, g * 0.4), '#d9d0c4', 0.7);
    }
    ctx.restore();
  }
  // upper lip: thin, as old lips are
  fillSmooth(ctx, [a, [-24, 97.5 + da * 0.9], [-8, 95.8 + da * 0.3], [0, 97.2], [8, 95.8 + db * 0.3], [24, 97.5 + db * 0.9], b, [22, midY + db], [0, midY + 1.4], [-22, midY + da]],
    linearGradient(ctx, -42, 0, 42, 0, [[0, rgba('#ad7c73', 0.9)], [0.6, rgba('#9f7067', 0.9)], [1, rgba('#8c625b', 0.9)]]));
  // lower lip: a little fuller
  fillSmooth(ctx, [a, lowerLine[1], lowerLine[2], lowerLine[3], b, [23, 107 + g + db + 2.6 * slackL], [0, 110.5 + g], [-23, 107 + g + da + 2.6 * slackR]],
    linearGradient(ctx, -42, 0, 42, 0, [[0, rgba('#c0958a', 0.9)], [0.55, rgba('#b0857b', 0.9)], [1, rgba('#9c746b', 0.9)]]));
  softBlob(ctx, -6, 105.5 + g, 14, 2.8, '#f1d7ce', 0.4);
  // the line between the lips
  taperStroke(ctx, upperLine, 2.2, PAL.lipDark, parted ? 0.55 : 0.85, 'soft');
  // corners, with a deeper crease under one that droops
  softBlob(ctx, a[0] - 2, a[1], 5 + 2 * slackR, 4.5 + 2 * slackR, PAL.skinLine, 0.5 + 0.25 * slackR);
  softBlob(ctx, b[0] + 2, b[1], 5 + 2 * slackL, 4.5 + 2 * slackL, PAL.skinLine, 0.55 + 0.25 * slackL);
}

function head(ctx, p) {
  const sy = Math.sin(p.headYaw * DEG);
  const sp = Math.sin(p.headPitch * DEG);
  // A turned or nodding head is suggested by sliding its layers over each
  // other: the hair moves least, the face more, the features most, the nose
  // furthest.
  const fx = sy * 100;
  const fy = sp * 64;
  const narrow = 1 - 0.12 * Math.abs(sy);

  ctx.save();
  ctx.translate(HELGI.neckX, HELGI.neckY);
  ctx.rotate(p.headRoll * DEG); // + = clockwise in the picture = toward HER left
  ctx.translate(HELGI.headX - HELGI.neckX, HELGI.headY - HELGI.neckY);

  drawSprite(ctx, hairBackSprite(), fx * 0.1, fy * 0.1);
  ears(ctx, sy);

  const outline = faceOutline(p);
  ctx.save();
  ctx.translate(fx * 0.36, fy * 0.3);
  ctx.scale(narrow, 1);
  skin(ctx, p, outline);
  ctx.beginPath();
  tracePath(ctx, outline, true);
  ctx.clip();
  ctx.translate(fx * 0.64, fy * 0.7);
  ctx.scale(1 - 0.08 * Math.abs(sy), 1 - 0.05 * Math.abs(sp));
  wrinkles(ctx, p);
  ctx.save();
  ctx.translate(fx * 0.28, fy * 0.1);
  nose(ctx);
  ctx.restore();
  mouth(ctx, p);
  eye(ctx, PATIENT_RIGHT, p);
  eye(ctx, PATIENT_LEFT, p);
  ctx.restore();

  drawSprite(ctx, hairFrontSprite(), fx * 0.42, fy * 0.5);
  ctx.restore();
}

// ---------------------------------------------------------------- entry points
// Each pass is painted into a buffer, mottled like the static layers (so the
// character has the same gouache unevenness and does not look vector-clean),
// then drawn into the scene.

let buffer = null;
let bufferCtx = null;

function paintPass(ctx, painter) {
  if (!buffer) {
    buffer = makeCanvas(BOX.w, BOX.h);
    bufferCtx = buffer.getContext('2d');
  }
  const g = bufferCtx;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalCompositeOperation = 'source-over';
  g.globalAlpha = 1;
  g.clearRect(0, 0, BOX.w, BOX.h);
  g.save();
  g.translate(-BOX.x, -BOX.y);
  painter(g);
  g.restore();
  g.globalCompositeOperation = 'source-atop';
  g.drawImage(mottleOverlay(BOX.w, BOX.h, 'helgi', 0.2), 0, 0);
  g.globalCompositeOperation = 'source-over';

  ctx.save();
  toRest(ctx);
  ctx.drawImage(buffer, BOX.x, BOX.y);
  ctx.restore();
}

/**
 * Behind the table: chair, body, neck, head, upper arms, and any forearm and
 * hand that are not over the table. `extras` carries scene values that are
 * not rig parameters (for example cupTilt, in radians).
 */
export function drawRigBack(ctx, p, extras = {}) {
  const rig = solveRig(p);
  const chest = -13 * p.breath;
  paintPass(ctx, (g) => {
    chair(g);
    g.save();
    g.transform(...rig.torso.m);
    neck(g, p, chest);
    torso(g, p, rig);
    // the glasses hang from their cord, so they stay nearly upright when she leans
    g.save();
    g.translate(920, 556 + chest);
    g.rotate(-rig.torso.angle * 0.8);
    g.translate(-920, -556);
    glassesOnCord(g);
    g.restore();
    g.save();
    g.translate(0, chest);
    head(g, p);
    g.restore();
    g.restore();
    armsBack(g, p, rig, extras);
  });
}

/** On the table: her cup, and any forearm and hand that are over the table. */
export function drawRigFront(ctx, p, extras = {}) {
  const rig = solveRig(p);
  paintPass(ctx, (g) => {
    armsFront(g, p, rig, extras);
  });
}
