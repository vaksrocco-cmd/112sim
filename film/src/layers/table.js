// Layer 5: the table (parallax 0.9, sharp). Pale wood, an oilcloth runner,
// teapot, sugar bowl, the saucer of Helgi's cup and the white envelope.
// The cup itself belongs to the rig, because she lifts it in the intro.

import { defineLayer } from './index.js';
import { toRest, BOUNDS, TABLE, PROPS, tablePoint, tableScale } from '../layout.js';
import { PAL } from '../palette.js';
import {
  softBlob, taperStroke, fillSmooth, linearGradient, radialGradient, rgba, mix, mottle, strokeField, ellipse, tracePath,
} from '../paint.js';
import { mulberry32, hashString, helpers } from '../rng.js';

const P = (X, D) => {
  const p = tablePoint(X, D);
  return [p.x, p.y];
};

function poly(ctx, pts) {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
}

const D_MAX = 0.56; // beyond the bottom of the world

function tabletop(ctx, rng) {
  const L = TABLE.halfLength;
  const top = [P(-L, 0), P(L, 0), P(L, D_MAX), P(-L, D_MAX)];

  // the right end of the table: edge thickness, apron and the far leg
  const [ex0, ey0] = P(L, 0);
  const [ex1, ey1] = P(L, D_MAX);
  ctx.fillStyle = mix(PAL.woodDark, PAL.shadow, 0.35);
  ctx.fillRect(ex0 - 96, ey0 + 60, 60, BOUNDS.y1 - ey0);
  poly(ctx, [[ex0 - 6, ey0 + 20], [ex1 - 6, ey1 + 34], [ex1 - 6, ey1 + 300], [ex0 - 6, ey0 + 150]]);
  ctx.fillStyle = linearGradient(ctx, ex0, ey0, ex0, ey0 + 220, [
    [0, PAL.woodDark],
    [1, mix(PAL.woodDark, PAL.shadow, 0.4)],
  ]);
  ctx.fill();
  poly(ctx, [[ex0, ey0], [ex1, ey1], [ex1, ey1 + 62], [ex0, ey0 + 36]]);
  ctx.fillStyle = mix(PAL.woodShade, PAL.woodDark, 0.5);
  ctx.fill();

  ctx.save();
  poly(ctx, top);
  ctx.clip();
  // base: lighter toward the window on the left, darker toward us
  ctx.fillStyle = linearGradient(ctx, BOUNDS.x0, 0, 2100, 0, [
    [0, PAL.woodLight],
    [0.4, PAL.wood],
    [1, mix(PAL.wood, PAL.woodShade, 0.7)],
  ]);
  ctx.fillRect(BOUNDS.x0, TABLE.farY, BOUNDS.x1 - BOUNDS.x0, BOUNDS.y1 - TABLE.farY);
  ctx.fillStyle = linearGradient(ctx, 0, TABLE.farY, 0, 1100, [
    [0, 'rgba(255,250,235,0.16)'],
    [0.4, 'rgba(255,250,235,0)'],
    [1, rgba(PAL.woodDark, 0.22)],
  ]);
  ctx.fillRect(BOUNDS.x0, TABLE.farY, BOUNDS.x1 - BOUNDS.x0, BOUNDS.y1 - TABLE.farY);

  // wood grain along the planks
  strokeField(ctx, rng, {
    x: BOUNDS.x0, y: TABLE.farY, w: BOUNDS.x1 - BOUNDS.x0, h: 360, count: 520, length: [160, 760], width: [1.2, 3.6],
    angle: 0, spread: 0.012, colors: [PAL.woodShade, PAL.woodDark, PAL.woodLight, '#c9b48d'], alpha: [0.06, 0.16], bend: 0.012,
  });
  // plank seams
  for (const D of [0.19, 0.38]) {
    const y = P(0, D)[1];
    taperStroke(ctx, [[BOUNDS.x0, y], [900, y + 1.5], [BOUNDS.x1, y - 1]], 2.6, PAL.woodDark, 0.5, 'none');
    taperStroke(ctx, [[BOUNDS.x0, y + 3], [900, y + 4.5], [BOUNDS.x1, y + 2]], 2, PAL.woodLight, 0.4, 'none');
  }
  // knots
  for (const [kx, ky] of [[742, 836], [1502, 812], [208, 858]]) {
    softBlob(ctx, kx, ky, 15, 5, PAL.woodDark, 0.38);
    softBlob(ctx, kx, ky, 34, 9, PAL.woodDark, 0.12);
  }
  // the overcast window reflected along the far left of the table
  softBlob(ctx, 300, 812, 640, 30, '#ffffff', 0.36);
  softBlob(ctx, 140, 880, 520, 110, '#ffffff', 0.14);
  // Helgi's soft shadow falls toward us (the light is behind her)
  softBlob(ctx, 980, 792, 400, 64, PAL.shadow, 0.2);
  softBlob(ctx, 1040, 800, 250, 30, PAL.shadow, 0.14);
  ctx.restore();

  // the far edge catches the light
  ctx.fillStyle = rgba(PAL.woodLight, 0.9);
  ctx.fillRect(BOUNDS.x0, TABLE.farY - 1, ex0 - BOUNDS.x0, 3.2);
  ctx.fillStyle = rgba(PAL.woodDark, 0.25);
  ctx.fillRect(BOUNDS.x0, TABLE.farY + 2.2, ex0 - BOUNDS.x0, 2);
}

function runner(ctx) {
  const H = TABLE.runnerHalf;
  const D0 = TABLE.runnerD;
  const shape = [P(-H, D0), P(H, D0), P(H, D_MAX), P(-H, D_MAX)];
  // the cloth's own thin shadow on the wood
  ctx.save();
  ctx.translate(0, 3);
  poly(ctx, shape);
  ctx.fillStyle = rgba(PAL.shadow, 0.22);
  ctx.fill();
  ctx.restore();

  ctx.save();
  poly(ctx, shape);
  ctx.clip();
  ctx.fillStyle = linearGradient(ctx, 0, 0, 1920, 0, [
    [0, mix(PAL.cloth, '#ffffff', 0.25)],
    [0.5, PAL.cloth],
    [1, PAL.clothShade],
  ]);
  ctx.fillRect(BOUNDS.x0, 880, BOUNDS.x1 - BOUNDS.x0, 300);

  // woven check: bands both ways, darker where they cross
  const step = 0.044;
  const band = 0.022;
  const inset = 0.03;
  ctx.fillStyle = rgba(PAL.check, 0.26);
  for (let D = D0 + inset; D < D_MAX; D += step) {
    poly(ctx, [P(-H + inset, D), P(H - inset, D), P(H - inset, D + band), P(-H + inset, D + band)]);
    ctx.fill();
  }
  for (let X = -H + inset; X < H - inset - band; X += step) {
    poly(ctx, [P(X, D0 + inset), P(X + band, D0 + inset), P(X + band, D_MAX), P(X, D_MAX)]);
    ctx.fill();
  }
  // a thin warm line through the light squares
  ctx.fillStyle = rgba('#a5655c', 0.28);
  for (let D = D0 + inset + band + (step - band) / 2 - 0.002; D < D_MAX; D += step) {
    poly(ctx, [P(-H + inset, D), P(H - inset, D), P(H - inset, D + 0.004), P(-H + inset, D + 0.004)]);
    ctx.fill();
  }
  // border line
  ctx.fillStyle = rgba(PAL.check, 0.5);
  poly(ctx, [P(-H + 0.014, D0 + 0.013), P(H - 0.014, D0 + 0.013), P(H - 0.014, D0 + 0.018), P(-H + 0.014, D0 + 0.018)]);
  ctx.fill();

  // oilcloth sheen and two old fold lines
  softBlob(ctx, 250, 960, 560, 70, '#ffffff', 0.2);
  softBlob(ctx, 980, 1010, 500, 50, '#ffffff', 0.08);
  for (const X of [-0.2, 0.22]) {
    const a = P(X, D0);
    const b = P(X, D_MAX);
    taperStroke(ctx, [a, b], 3, '#ffffff', 0.3, 'none');
    taperStroke(ctx, [[a[0] + 4, a[1]], [b[0] + 6, b[1]]], 3, PAL.shadow, 0.1, 'none');
  }
  ctx.fillStyle = rgba(PAL.woodDark, 0.18);
  ctx.fillRect(BOUNDS.x0, 1000, BOUNDS.x1 - BOUNDS.x0, 200);
  ctx.restore();
}

function saucer(ctx) {
  const { X, D } = PROPS.cup;
  const p = tablePoint(X, D);
  const s = tableScale(D);
  const rx = 0.073 * s.across;
  const ry = rx * s.squash;
  softBlob(ctx, p.x + 26, p.y + 10, rx * 1.2, ry * 1.5, PAL.shadow, 0.3);
  ellipse(ctx, p.x, p.y + 4, rx, ry);
  ctx.fillStyle = PAL.ceramicShade;
  ctx.fill();
  ellipse(ctx, p.x, p.y, rx, ry);
  ctx.fillStyle = linearGradient(ctx, p.x - rx, 0, p.x + rx, 0, [
    [0, '#f7f4ea'],
    [0.45, PAL.ceramic],
    [1, mix(PAL.ceramic, PAL.ceramicShade, 0.75)],
  ]);
  ctx.fill();
  // thin blue line near the rim
  ctx.save();
  ctx.strokeStyle = rgba(PAL.ceramicBlue, 0.7);
  ctx.lineWidth = 2.4;
  ellipse(ctx, p.x, p.y, rx * 0.9, ry * 0.9);
  ctx.stroke();
  ctx.restore();
  // the well
  ellipse(ctx, p.x, p.y + 1, rx * 0.56, ry * 0.56);
  ctx.fillStyle = rgba(PAL.ceramicShade, 0.5);
  ctx.fill();
  softBlob(ctx, p.x - rx * 0.5, p.y - ry * 0.3, rx * 0.4, ry * 0.4, '#ffffff', 0.5);
}

/** Outline of a squat rounded pot standing on the table: flat-ish shoulders, a full belly, a round foot. */
function potPath(ctx, cx, top, bottom, rx, squash) {
  const h = bottom - top;
  const foot = rx * 0.6;
  ctx.beginPath();
  ctx.moveTo(cx - rx * 0.56, top);
  ctx.bezierCurveTo(cx - rx * 0.96, top + h * 0.04, cx - rx * 1.04, top + h * 0.36, cx - rx, top + h * 0.56);
  ctx.bezierCurveTo(cx - rx * 0.96, top + h * 0.8, cx - rx * 0.78, top + h * 0.96, cx - foot, bottom);
  ctx.ellipse(cx, bottom, foot, foot * squash, 0, Math.PI, 0, true);
  ctx.bezierCurveTo(cx + rx * 0.78, top + h * 0.96, cx + rx * 0.96, top + h * 0.8, cx + rx, top + h * 0.56);
  ctx.bezierCurveTo(cx + rx * 1.04, top + h * 0.36, cx + rx * 0.96, top + h * 0.04, cx + rx * 0.56, top);
  ctx.closePath();
}

function shadeCeramic(ctx, cx, top, bottom, rx) {
  const h = bottom - top;
  // the light comes from the window behind and to the left
  ctx.fillStyle = linearGradient(ctx, cx - rx, 0, cx + rx, 0, [
    [0, '#fbf8ee'],
    [0.22, PAL.ceramic],
    [0.62, mix(PAL.ceramic, PAL.ceramicShade, 0.55)],
    [1, mix(PAL.ceramicShade, PAL.ceramicDeep, 0.55)],
  ]);
  ctx.fillRect(cx - rx - 4, top - 60, rx * 2 + 8, h + 160);
  softBlob(ctx, cx + rx * 0.2, bottom, rx * 0.9, h * 0.34, PAL.ceramicDeep, 0.3);
  softBlob(ctx, cx + rx * 0.1, bottom + 6, rx * 0.8, h * 0.16, '#d9b98f', 0.22); // warm bounce from the table
  softBlob(ctx, cx - rx * 0.52, top + h * 0.3, rx * 0.2, h * 0.26, '#ffffff', 0.75, 0.25);
}

function blueBand(ctx, cx, y, rx, squash, rng) {
  // a painted band that follows the roundness of the pot
  ctx.save();
  ctx.strokeStyle = rgba(PAL.ceramicBlue, 0.72);
  ctx.lineWidth = 3;
  ellipse(ctx, cx, y - 15, rx * 1.02, rx * squash, 0, 0.06, Math.PI - 0.06);
  ctx.stroke();
  ellipse(ctx, cx, y + 15, rx * 1.02, rx * squash, 0, 0.06, Math.PI - 0.06);
  ctx.stroke();
  ctx.restore();
  const n = Math.round(rx / 11);
  for (let i = 1; i < n; i++) {
    const a = Math.PI - (i / n) * Math.PI;
    const px = cx + Math.cos(a) * rx * 0.98;
    const py = y + Math.sin(a) * rx * squash;
    const k = Math.sin(a); // foreshorten toward the sides
    softBlob(ctx, px, py, 6.5 * (0.35 + 0.65 * k), 6.5, i % 2 ? PAL.ceramicBlue : '#8f6f66', 0.8);
    void rng;
  }
}

function sugarBowl(ctx, rng) {
  const { X, D } = PROPS.sugar;
  const p = tablePoint(X, D);
  const s = tableScale(D);
  const rx = 0.052 * s.across;
  const h = 0.066 * s.up;
  const top = p.y - h;
  softBlob(ctx, p.x + rx * 0.7, p.y + 8, rx * 1.5, rx * 0.5, PAL.shadow, 0.3);
  softBlob(ctx, p.x, p.y + 4, rx * 0.9, rx * 0.26, PAL.shadow, 0.35);
  // little ear handles
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.strokeStyle = side < 0 ? PAL.ceramic : PAL.ceramicShade;
    ctx.lineWidth = 9;
    ellipse(ctx, p.x + side * rx * 1.02, top + h * 0.42, rx * 0.2, h * 0.17);
    ctx.stroke();
    ctx.restore();
  }
  ctx.save();
  potPath(ctx, p.x, top, p.y, rx, s.squash);
  ctx.clip();
  shadeCeramic(ctx, p.x, top, p.y, rx);
  blueBand(ctx, p.x, top + h * 0.5, rx, s.squash * 0.9, rng);
  ctx.restore();
  // lid and knob
  const lidY = top + 2;
  ellipse(ctx, p.x, lidY, rx * 0.66, rx * s.squash * 0.7);
  ctx.fillStyle = linearGradient(ctx, p.x - rx, 0, p.x + rx, 0, [
    [0, '#fbf8ee'],
    [0.5, PAL.ceramic],
    [1, PAL.ceramicShade],
  ]);
  ctx.fill();
  fillSmooth(ctx, [[p.x - rx * 0.6, lidY], [p.x - rx * 0.3, lidY - h * 0.2], [p.x, lidY - h * 0.25], [p.x + rx * 0.3, lidY - h * 0.2], [p.x + rx * 0.6, lidY], [p.x, lidY + rx * s.squash * 0.5]],
    linearGradient(ctx, p.x - rx, 0, p.x + rx, 0, [[0, '#fbf8ee'], [0.45, PAL.ceramic], [1, PAL.ceramicShade]]));
  softBlob(ctx, p.x, lidY - h * 0.3, rx * 0.17, rx * 0.15, PAL.ceramic, 1);
  softBlob(ctx, p.x - 3, lidY - h * 0.33, rx * 0.08, rx * 0.07, '#ffffff', 0.9);
}

function teapot(ctx, rng) {
  const { X, D } = PROPS.teapot;
  const p = tablePoint(X, D);
  const s = tableScale(D);
  const rx = 0.074 * s.across;
  const h = 0.108 * s.up;
  const top = p.y - h;
  const cx = p.x;
  // cast shadow toward us and to the right
  softBlob(ctx, cx + rx * 0.75, p.y + 16, rx * 1.7, rx * 0.5, PAL.shadow, 0.3);
  softBlob(ctx, cx + 6, p.y + 6, rx * 0.95, rx * 0.26, PAL.shadow, 0.4);

  // handle on the right
  ctx.save();
  ctx.lineCap = 'round';
  ctx.strokeStyle = PAL.ceramicShade;
  ctx.lineWidth = 21;
  ctx.beginPath();
  ctx.moveTo(cx + rx * 0.8, top + h * 0.2);
  ctx.bezierCurveTo(cx + rx * 1.62, top + h * 0.06, cx + rx * 1.66, top + h * 0.82, cx + rx * 0.86, top + h * 0.8);
  ctx.stroke();
  ctx.strokeStyle = rgba(PAL.ceramic, 0.75);
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(cx + rx * 0.84, top + h * 0.17);
  ctx.bezierCurveTo(cx + rx * 1.5, top + h * 0.07, cx + rx * 1.56, top + h * 0.5, cx + rx * 1.4, top + h * 0.62);
  ctx.stroke();
  ctx.restore();

  // spout on the left, toward the middle of the table
  fillSmooth(ctx, [
    [cx - rx * 0.78, top + h * 0.5], [cx - rx * 1.18, top + h * 0.34], [cx - rx * 1.5, top + h * 0.02],
    [cx - rx * 1.62, top - h * 0.02], [cx - rx * 1.66, top + h * 0.05], [cx - rx * 1.42, top + h * 0.4],
    [cx - rx * 1.14, top + h * 0.72], [cx - rx * 0.7, top + h * 0.86],
  ], linearGradient(ctx, cx - rx * 1.7, top, cx - rx * 0.7, top + h, [
    [0, '#fbf8ee'],
    [0.5, PAL.ceramic],
    [1, PAL.ceramicShade],
  ]));

  ctx.save();
  potPath(ctx, cx, top, p.y, rx, s.squash);
  ctx.clip();
  shadeCeramic(ctx, cx, top, p.y, rx);
  blueBand(ctx, cx, top + h * 0.52, rx, s.squash * 0.85, rng);
  ctx.restore();

  // lid with a knob
  const lidY = top + 3;
  fillSmooth(ctx, [
    [cx - rx * 0.6, lidY], [cx - rx * 0.36, lidY - h * 0.13], [cx, lidY - h * 0.17], [cx + rx * 0.36, lidY - h * 0.13],
    [cx + rx * 0.6, lidY], [cx + rx * 0.3, lidY + rx * s.squash * 0.52], [cx - rx * 0.3, lidY + rx * s.squash * 0.52],
  ], linearGradient(ctx, cx - rx * 0.6, 0, cx + rx * 0.6, 0, [[0, '#fbf8ee'], [0.4, PAL.ceramic], [1, PAL.ceramicShade]]));
  ctx.save();
  ctx.strokeStyle = rgba(PAL.ceramicDeep, 0.45);
  ctx.lineWidth = 2;
  ellipse(ctx, cx, lidY, rx * 0.6, rx * s.squash * 0.55, 0, 0.1, Math.PI - 0.1);
  ctx.stroke();
  ctx.restore();
  ellipse(ctx, cx, lidY - h * 0.2, rx * 0.13, rx * 0.11);
  ctx.fillStyle = radialGradient(ctx, cx - 5, lidY - h * 0.22, 1, rx * 0.16, [[0, '#ffffff'], [0.6, PAL.ceramic], [1, PAL.ceramicShade]]);
  ctx.fill();
}

function envelope(ctx) {
  const { X, D, w, h, rot } = PROPS.envelope;
  const cos = Math.cos(rot);
  const sin = Math.sin(rot);
  // (u, v) on the envelope in metres: u to the camera's right, v toward the camera
  const at = (u, v) => P(X + u * cos - v * sin, D + u * sin + v * cos);
  const corners = [at(-w / 2, -h / 2), at(w / 2, -h / 2), at(w / 2, h / 2), at(-w / 2, h / 2)];

  ctx.save();
  ctx.shadowColor = rgba(PAL.shadow, 0.4);
  ctx.shadowBlur = 12;
  ctx.shadowOffsetX = 7;
  ctx.shadowOffsetY = 5;
  poly(ctx, corners);
  ctx.fillStyle = PAL.paper;
  ctx.fill();
  ctx.restore();
  ctx.save();
  poly(ctx, corners);
  ctx.clip();
  ctx.fillStyle = linearGradient(ctx, corners[0][0], 0, corners[1][0], 0, [
    [0, '#fbfaf5'],
    [1, '#e2dfd5'],
  ]);
  ctx.fillRect(corners[3][0] - 20, corners[0][1] - 30, 420, 200);

  // The address: handwriting-like marks. Loops and strokes, no letters.
  const rng = helpers(mulberry32(hashString('envelope-hand')));
  // Each "word" is a run of small up-and-down pen strokes with the odd tall
  // or hanging one, joined like cursive.
  const line = (v0, u0, u1) => {
    let u = u0;
    while (u < u1) {
      const letters = rng.int(3, 8);
      const pts = [at(u, v0)];
      for (let i = 0; i < letters && u < u1; i++) {
        const kind = rng.next();
        const hgt = kind < 0.62 ? rng.range(0.0022, 0.003) : kind < 0.86 ? rng.range(0.0048, 0.006) : -rng.range(0.002, 0.0032);
        const wdt = rng.range(0.0021, 0.003);
        pts.push(at(u + wdt * 0.42, v0 - hgt));
        pts.push(at(u + wdt * 0.72, v0 - hgt * 0.35));
        pts.push(at(u + wdt, v0 + rng.range(-0.0003, 0.0003)));
        u += wdt;
      }
      ctx.beginPath();
      tracePath(ctx, pts);
      ctx.strokeStyle = rgba(PAL.ink, 0.78);
      ctx.lineWidth = 1.35;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.stroke();
      u += rng.range(0.004, 0.007);
    }
  };
  line(-0.008, -0.03, 0.045);
  line(0.01, -0.03, 0.052);
  line(0.028, -0.03, 0.03);
  line(0.045, -0.03, 0.014);

  // stamp and postmark in the far right corner
  const st = [at(0.046, -0.047), at(0.07, -0.047), at(0.07, -0.016), at(0.046, -0.016)];
  poly(ctx, st);
  ctx.fillStyle = '#ded6c2';
  ctx.fill();
  poly(ctx, [at(0.049, -0.044), at(0.067, -0.044), at(0.067, -0.019), at(0.049, -0.019)]);
  ctx.fillStyle = '#97625a';
  ctx.fill();
  const sc = at(0.058, -0.031);
  softBlob(ctx, sc[0], sc[1], 9, 6, '#d9c7a8', 0.8);
  ctx.strokeStyle = rgba(PAL.ink, 0.32);
  ctx.lineWidth = 1.6;
  for (let i = 0; i < 4; i++) {
    const pts = [];
    for (let u = 0.012; u <= 0.05; u += 0.004) pts.push(at(u, -0.042 + i * 0.006 + 0.0012 * Math.sin(u * 700)));
    ctx.beginPath();
    tracePath(ctx, pts);
    ctx.stroke();
  }
  ctx.restore();
  // a crisp lit edge on the left, a faint dark one on the right
  taperStroke(ctx, [corners[0], corners[3]], 2, '#ffffff', 0.9, 'none');
  taperStroke(ctx, [corners[1], corners[2]], 1.6, PAL.ceramicDeep, 0.35, 'none');
  taperStroke(ctx, [corners[3], corners[2]], 1.6, PAL.ceramicDeep, 0.3, 'none');
}

defineLayer({
  id: 'table',
  parallax: 0.9,
  blur: 0,
  paint(ctx, { rng }) {
    toRest(ctx);
    tabletop(ctx, rng);
    runner(ctx);
    mottle(ctx, 'table', 0.22);
    saucer(ctx);
    sugarBowl(ctx, rng);
    teapot(ctx, rng);
    envelope(ctx);
  },
});
