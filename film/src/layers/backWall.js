// Layer 2: the kitchen's back wall (parallax 0.4, blurred 3 px).
// Pale painted wood panelling, the window frame and sill, a geranium on the
// sill, a wall clock and a shelf with jars. The lace curtain is a second
// cached canvas at the same depth, so it can move on its own later (s3).

import { defineLayer } from './index.js';
import { toRest, BOUNDS, WINDOW } from '../layout.js';
import { PAL } from '../palette.js';
import {
  softBlob, taperStroke, fillSmooth, linearGradient, radialGradient, rgba, mix, mottle, strokeField, ellipse,
} from '../paint.js';

const TAU = Math.PI * 2;

function panelling(ctx, rng) {
  const { x0, y0, x1, y1 } = BOUNDS;
  // The window wall is lit only by light bouncing around the room: mid value,
  // a little lighter far from the window, darker into the top corners.
  ctx.fillStyle = linearGradient(ctx, x0, 0, x1, 0, [
    [0, mix(PAL.wall, PAL.wallShade, 0.55)],
    [0.3, mix(PAL.wall, PAL.wallShade, 0.2)],
    [0.62, PAL.wall],
    [1, mix(PAL.wall, PAL.wallShade, 0.3)],
  ]);
  ctx.fillRect(x0, y0, x1 - x0, y1 - y0);

  // vertical boards
  const boardW = 112;
  for (let x = x0 - 30; x < x1; x += boardW) {
    const tone = rng.range(-1, 1);
    ctx.fillStyle = tone > 0 ? rgba(PAL.wallLight, tone * 0.16) : rgba(PAL.wallShade, -tone * 0.16);
    ctx.fillRect(x, y0, boardW, y1 - y0);
    // groove: a dark line with a light edge beside it
    ctx.fillStyle = rgba(PAL.seam, 0.5);
    ctx.fillRect(x - 1.5, y0, 3.5, y1 - y0);
    ctx.fillStyle = rgba(PAL.wallLight, 0.4);
    ctx.fillRect(x + 2.5, y0, 2.5, y1 - y0);
    ctx.fillStyle = rgba(PAL.wallShade, 0.16);
    ctx.fillRect(x - 9, y0, 7, y1 - y0);
  }
  // brushed paint streaks
  strokeField(ctx, rng, {
    x: x0, y: y0, w: x1 - x0, h: y1 - y0, count: 900, length: [90, 420], width: [3, 12],
    angle: Math.PI / 2, spread: 0.03, colors: [PAL.wallLight, PAL.wallShade, '#c6cbbd'], alpha: [0.03, 0.09], bend: 0.01,
  });
  // corners fall away
  softBlob(ctx, x1 - 200, y0 + 60, 900, 420, PAL.wallShade, 0.3);
  softBlob(ctx, 1100, y1 + 40, 1500, 300, PAL.wallShade, 0.22);
  // daylight spilling from the window onto the wall beside it
  softBlob(ctx, 790, 330, 190, 430, PAL.windowGlow, 0.2);
}

function clock(ctx) {
  const cx = 1332;
  const cy = 172;
  softBlob(ctx, cx + 14, cy + 20, 132, 132, PAL.shadow, 0.22);
  ellipse(ctx, cx, cy, 100, 100);
  ctx.fillStyle = linearGradient(ctx, cx - 100, cy - 100, cx + 100, cy + 100, [
    [0, '#8a7360'],
    [0.5, '#6a5646'],
    [1, '#4e3e33'],
  ]);
  ctx.fill();
  ellipse(ctx, cx, cy, 86, 86);
  ctx.fillStyle = radialGradient(ctx, cx - 26, cy - 30, 10, 130, [
    [0, '#efe9d9'],
    [0.7, '#dcd4c0'],
    [1, '#bdb49f'],
  ]);
  ctx.fill();
  // tick marks only: nothing readable
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU;
    const big = i % 3 === 0;
    const r0 = big ? 64 : 70;
    taperStroke(ctx, [[cx + Math.cos(a) * r0, cy + Math.sin(a) * r0], [cx + Math.cos(a) * 78, cy + Math.sin(a) * 78]], big ? 6 : 3.5, '#4a4039', 0.8, 'none');
  }
  const hand = (deg, len, w) => {
    const a = ((deg - 90) * Math.PI) / 180;
    taperStroke(ctx, [[cx - Math.cos(a) * 10, cy - Math.sin(a) * 10], [cx + Math.cos(a) * len, cy + Math.sin(a) * len]], w, '#35302c', 0.9, 'end');
  };
  hand(308, 46, 8);
  hand(66, 68, 6);
  ellipse(ctx, cx, cy, 6, 6);
  ctx.fillStyle = '#35302c';
  ctx.fill();
  softBlob(ctx, cx - 34, cy - 40, 46, 30, '#ffffff', 0.3, -0.6);
}

function jar(ctx, x, w, h, { glass, content, level = 0.75, lid, lidH = 16, band }) {
  const base = 352;
  const top = base - h;
  softBlob(ctx, x + 16, base - h * 0.4, w * 0.75, h * 0.6, PAL.shadow, 0.14);
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x - w / 2, top, w, h, [w * 0.2, w * 0.2, 8, 8]);
  ctx.clip();
  ctx.fillStyle = glass;
  ctx.fillRect(x - w / 2, top, w, h);
  if (content) {
    ctx.fillStyle = content;
    ctx.fillRect(x - w / 2, base - h * level, w, h * level);
  }
  if (band) {
    ctx.fillStyle = band;
    ctx.fillRect(x - w / 2, top + h * 0.38, w, h * 0.2);
  }
  // form: light edge toward the window (left), shade on the right
  ctx.fillStyle = linearGradient(ctx, x - w / 2, 0, x + w / 2, 0, [
    [0, 'rgba(255,255,255,0.34)'],
    [0.18, 'rgba(255,255,255,0.06)'],
    [0.6, 'rgba(0,0,0,0.0)'],
    [1, 'rgba(30,25,20,0.3)'],
  ]);
  ctx.fillRect(x - w / 2, top, w, h);
  ctx.restore();
  ctx.fillStyle = lid;
  ctx.beginPath();
  ctx.roundRect(x - w / 2 - 3, top - lidH + 4, w + 6, lidH, 5);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  ctx.fillRect(x - w / 2, top - lidH + 5, w * 0.5, 3);
}

function shelf(ctx) {
  softBlob(ctx, 1690, 392, 260, 34, PAL.shadow, 0.26);
  // brackets
  for (const bx of [1516, 1852]) {
    fillSmooth(ctx, [[bx - 9, 366], [bx + 9, 366], [bx + 8, 424], [bx - 2, 432], [bx - 9, 420]], mix(PAL.trim, PAL.wallShade, 0.4));
  }
  jar(ctx, 1524, 86, 128, { glass: '#c9cfc6', content: '#ad8748', level: 0.78, lid: '#d9d2bf', lidH: 22 });
  jar(ctx, 1626, 98, 108, { glass: '#e4decd', lid: '#d6cfbd', lidH: 14, band: PAL.ceramicBlue });
  jar(ctx, 1722, 74, 94, { glass: '#bfc5bd', content: '#6d3a36', level: 0.82, lid: '#a8894a' });
  jar(ctx, 1808, 80, 142, { glass: '#cdd3ca', content: '#ebe7dc', level: 0.7, lid: '#a48562', lidH: 18 });
  // the board
  ctx.fillStyle = linearGradient(ctx, 0, 350, 0, 370, [
    [0, PAL.trimLight],
    [0.3, PAL.trim],
    [1, PAL.trimShade],
  ]);
  ctx.beginPath();
  ctx.roundRect(1466, 350, 432, 19, 3);
  ctx.fill();
}

function windowFrame(ctx) {
  const { x0, x1, sillY, panes } = WINDOW;
  const top = BOUNDS.y0 - 10;
  // Casing and sashes. Backlit, so the paint reads as a cool mid grey-white.
  ctx.fillStyle = linearGradient(ctx, x0 - 30, 0, x1 + 30, 0, [
    [0, mix(PAL.trimShade, PAL.wallShade, 0.45)],
    [0.5, mix(PAL.trimShade, PAL.wallShade, 0.2)],
    [1, mix(PAL.trimShade, PAL.wallShade, 0.35)],
  ]);
  ctx.fillRect(x0 - 30, top, x1 - x0 + 60, sillY - top);
  // inner sash step
  ctx.fillStyle = rgba(PAL.trimShade, 0.5);
  ctx.fillRect(x0, top, x1 - x0, sillY - top);
  ctx.fillStyle = mix(PAL.trimShade, PAL.wallShade, 0.1);
  ctx.fillRect(x0 + 6, top, x1 - x0 - 12, sillY - top - 4);
  // outer edge lines of the casing
  ctx.fillStyle = rgba(PAL.seam, 0.5);
  ctx.fillRect(x0 - 31, top, 3, sillY - top);
  ctx.fillRect(x1 + 28, top, 3, sillY - top);

  // glass: cut the panes out so the outside layer shows through
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  for (const [a, b, c, d] of panes) ctx.fillRect(a, b, c - a, d - b);
  ctx.restore();

  // light catching the edges of the bars that face the glass
  for (const [a, b, c, d] of panes) {
    ctx.fillStyle = rgba(PAL.trimLight, 0.85);
    ctx.fillRect(a - 4, b, 4, d - b);
    ctx.fillRect(c, b, 4, d - b);
    ctx.fillRect(a, d, c - a, 4);
    ctx.fillRect(a, b - 4, c - a, 4);
  }

  // sill: a lit top surface and a shaded front edge
  softBlob(ctx, (x0 + x1) / 2, sillY + 46, 420, 34, PAL.shadow, 0.28);
  ctx.fillStyle = linearGradient(ctx, 0, sillY, 0, sillY + 17, [
    [0, '#f0efe6'],
    [1, PAL.trimLight],
  ]);
  ctx.fillRect(x0 - 44, sillY, x1 - x0 + 88, 17);
  ctx.fillStyle = linearGradient(ctx, 0, sillY + 17, 0, sillY + 38, [
    [0, PAL.trim],
    [1, PAL.trimShade],
  ]);
  ctx.beginPath();
  ctx.roundRect(x0 - 44, sillY + 17, x1 - x0 + 88, 21, [0, 0, 5, 5]);
  ctx.fill();
}

function geraniumLeaf(ctx, x, y, r, rot, rng) {
  const pts = [];
  const n = 16;
  for (let i = 0; i < n; i++) {
    const a = rot + (i / n) * TAU;
    const rr = r * (1 + 0.09 * Math.sin(i * 3.5) + rng.range(-0.04, 0.04)) * (i === 0 ? 0.55 : 1);
    pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.86]);
  }
  fillSmooth(ctx, pts, radialGradient(ctx, x - r * 0.2, y - r * 0.2, r * 0.1, r * 1.1, [
    [0, PAL.leafLight],
    [0.45, PAL.leafGreen],
    [1, PAL.leafDark],
  ]));
  // the darker zone ring geranium leaves have
  ctx.save();
  ctx.strokeStyle = rgba(PAL.leafDark, 0.45);
  ctx.lineWidth = r * 0.2;
  ellipse(ctx, x, y, r * 0.55, r * 0.47, rot);
  ctx.stroke();
  ctx.restore();
}

function geranium(ctx, rng) {
  const x = 498;
  const sill = WINDOW.sillY;
  // pot and its saucer
  softBlob(ctx, x + 20, sill + 4, 90, 12, PAL.shadow, 0.3);
  ellipse(ctx, x, sill - 3, 62, 9);
  ctx.fillStyle = PAL.terracottaShade;
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x - 52, sill - 74);
  ctx.lineTo(x + 52, sill - 74);
  ctx.lineTo(x + 40, sill - 6);
  ctx.quadraticCurveTo(x, sill + 2, x - 40, sill - 6);
  ctx.closePath();
  ctx.fillStyle = linearGradient(ctx, x - 52, 0, x + 52, 0, [
    [0, mix(PAL.terracotta, '#e9c7a7', 0.35)],
    [0.3, PAL.terracotta],
    [1, PAL.terracottaShade],
  ]);
  ctx.fill();
  ctx.beginPath();
  ctx.roundRect(x - 57, sill - 88, 114, 20, 6);
  ctx.fillStyle = linearGradient(ctx, x - 57, 0, x + 57, 0, [
    [0, mix(PAL.terracotta, '#e9c7a7', 0.45)],
    [0.35, mix(PAL.terracotta, '#e9c7a7', 0.1)],
    [1, PAL.terracottaShade],
  ]);
  ctx.fill();

  // stems
  const tops = [[438, 398], [512, 372], [566, 420], [470, 452], [548, 470]];
  for (const [tx, ty] of tops) {
    taperStroke(ctx, [[x + rng.range(-18, 18), sill - 86], [(x + tx) / 2 + rng.range(-10, 10), (sill - 86 + ty) / 2], [tx, ty]], 6, PAL.leafDark, 0.9, 'end');
  }
  // leaves, back to front
  const leaves = [
    [420, 478, 34], [566, 492, 32], [452, 440, 30], [598, 452, 28], [520, 446, 36], [476, 500, 34],
    [540, 506, 30], [404, 440, 24], [500, 470, 30], [586, 512, 26], [446, 512, 28], [530, 418, 24],
  ];
  for (const [lx, ly, r] of leaves) geraniumLeaf(ctx, lx, ly, r, rng.range(0, TAU), rng);
  // flower heads: clusters of small blooms
  for (const [fx, fy] of tops.slice(0, 3)) {
    for (let i = 0; i < 13; i++) {
      const a = rng.range(0, TAU);
      const d = rng.range(0, 26);
      const px = fx + Math.cos(a) * d;
      const py = fy + Math.sin(a) * d * 0.8;
      softBlob(ctx, px, py, rng.range(9, 13), rng.range(8, 12), rng.pick([PAL.flower, PAL.flower, PAL.flowerLight, '#9c3d39']), 0.95);
    }
    softBlob(ctx, fx - 8, fy - 8, 16, 12, PAL.flowerLight, 0.5);
  }
}

defineLayer({
  id: 'backWall',
  parallax: 0.4,
  blur: 3,
  paint(ctx, { rng }) {
    toRest(ctx);
    panelling(ctx, rng);
    clock(ctx);
    shelf(ctx);
    mottle(ctx, 'backWall', 0.3);
    windowFrame(ctx);
    geranium(ctx, rng);
  },
});

// ---------- lace curtain ----------

function lacePanel(ctx, rng, xa, xb) {
  const top = BOUNDS.y0 - 10;
  const bottom = 726;
  const w = xb - xa;
  ctx.save();
  // the panel, with a scalloped hem
  ctx.beginPath();
  ctx.moveTo(xa, top);
  ctx.lineTo(xb, top);
  ctx.lineTo(xb, bottom - 8);
  const scallops = Math.round(w / 26);
  for (let i = 0; i < scallops; i++) {
    const sx1 = xb - ((i + 1) / scallops) * w;
    const sx0 = xb - (i / scallops) * w;
    ctx.quadraticCurveTo((sx0 + sx1) / 2, bottom + 12, sx1, bottom - 8);
  }
  ctx.closePath();
  ctx.clip();
  ctx.fillStyle = rgba(PAL.lace, 0.8);
  ctx.fillRect(xa, top, w, bottom - top + 20);
  // soft vertical folds
  const folds = Math.round(w / 30);
  for (let i = 0; i < folds; i++) {
    const fx = xa + ((i + 0.5) / folds) * w + rng.range(-5, 5);
    ctx.fillStyle = linearGradient(ctx, fx - 15, 0, fx + 15, 0, [
      [0, 'rgba(120,125,120,0)'],
      [0.5, `rgba(120,125,120,${rng.range(0.12, 0.26).toFixed(3)})`],
      [1, 'rgba(120,125,120,0)'],
    ]);
    ctx.fillRect(fx - 15, top, 30, bottom - top + 20);
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(fx + 9, top, 5, bottom - top + 20);
  }
  // lace: punch a pattern of small holes through the cloth
  ctx.globalCompositeOperation = 'destination-out';
  const cell = 26;
  for (let y = top; y < bottom + 10; y += cell) {
    for (let x = xa - cell; x < xb + cell; x += cell) {
      const ox = (Math.round((y - top) / cell) % 2) * (cell / 2);
      const cx = x + ox;
      // a small flower: a ring of holes
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * TAU;
        ellipse(ctx, cx + Math.cos(a) * 6.5, y + Math.sin(a) * 6.5, 2.7, 2.7);
        ctx.fillStyle = 'rgba(0,0,0,0.62)';
        ctx.fill();
      }
      ellipse(ctx, cx + cell / 2, y + cell / 2, 1.8, 1.8);
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fill();
    }
  }
  // a denser band above the hem
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = rgba(PAL.lace, 0.4);
  ctx.fillRect(xa, bottom - 54, w, 10);
  ctx.fillRect(xa, bottom - 24, w, 8);
  ctx.restore();
}

defineLayer({
  id: 'curtain',
  parallax: 0.4,
  blur: 3,
  paint(ctx, { rng }) {
    toRest(ctx);
    lacePanel(ctx, rng, BOUNDS.x0 - 10, 142);
    lacePanel(ctx, rng, 586, 716);
    // the right panel shades the wall a little
    softBlob(ctx, 736, 320, 40, 380, PAL.shadow, 0.1);
  },
});
