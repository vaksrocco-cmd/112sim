// Layer 1: what is seen through the window. Overcast Nordic daylight, a pale
// field with a distant treeline, two birches and their hanging twigs.
// Furthest layer (parallax 0.2), the most blurred.

import { defineLayer } from './index.js';
import { toRest, BOUNDS } from '../layout.js';
import { PAL } from '../palette.js';
import { softBlob, taperStroke, fillSmooth, linearGradient, rgba, mix } from '../paint.js';

function birchTrunk(ctx, rng, x0, x1, w0, w1) {
  const top = BOUNDS.y0 - 20;
  const bottom = 720;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x0 - w0 / 2, bottom);
  ctx.bezierCurveTo(x0 - w0 / 2, 420, x1 - w1 / 2 - 6, 200, x1 - w1 / 2, top);
  ctx.lineTo(x1 + w1 / 2, top);
  ctx.bezierCurveTo(x1 + w1 / 2 - 6, 200, x0 + w0 / 2, 420, x0 + w0 / 2, bottom);
  ctx.closePath();
  ctx.fillStyle = linearGradient(ctx, x0 - w0 / 2, 0, x0 + w0 / 2, 0, [
    [0, PAL.birch],
    [0.55, mix(PAL.birch, PAL.skyLow, 0.35)],
    [1, mix(PAL.birch, PAL.twig, 0.35)],
  ]);
  ctx.fill();
  ctx.clip();
  // dark horizontal marks
  for (let i = 0; i < 46; i++) {
    const t = rng.next();
    const y = top + t * (bottom - top);
    const cx = x1 + (x0 - x1) * t + rng.range(-w0 / 2, w0 / 2);
    const len = rng.range(5, w0 * 0.55);
    taperStroke(ctx, [[cx - len / 2, y], [cx, y + rng.range(-1.5, 1.5)], [cx + len / 2, y]], rng.range(1.5, 4.5), PAL.birchMark, rng.range(0.35, 0.8));
  }
  // rougher, darker bark low down
  for (let i = 0; i < 9; i++) {
    softBlob(ctx, x0 + rng.range(-w0 / 2, w0 / 2), rng.range(520, 700), rng.range(6, 16), rng.range(10, 30), PAL.birchMark, rng.range(0.3, 0.6));
  }
  ctx.restore();
}

defineLayer({
  id: 'window',
  parallax: 0.2,
  blur: 4,
  paint(ctx, { width, height, rng }) {
    // sky
    ctx.fillStyle = linearGradient(ctx, 0, 0, 0, height, [
      [0, PAL.sky],
      [0.45, mix(PAL.sky, PAL.skyLow, 0.6)],
      [1, PAL.skyLow],
    ]);
    ctx.fillRect(0, 0, width, height);
    toRest(ctx);

    // soft cloud banks
    for (let i = 0; i < 14; i++) {
      softBlob(ctx, rng.range(-60, 820), rng.range(-40, 330), rng.range(140, 320), rng.range(30, 70), i % 3 ? '#ffffff' : '#c3cccd', rng.range(0.18, 0.4));
    }

    // far treeline and the field in front of it
    const tree = [];
    for (let x = -80; x <= 860; x += 34) tree.push([x, 418 + rng.range(-26, 14)]);
    fillSmooth(ctx, [...tree, [900, 520], [-120, 520]], rgba(PAL.treeline, 0.9));
    ctx.fillStyle = linearGradient(ctx, 0, 455, 0, 720, [
      [0, mix(PAL.ground, PAL.skyLow, 0.45)],
      [0.5, PAL.ground],
      [1, mix(PAL.ground, PAL.twig, 0.25)],
    ]);
    ctx.fillRect(-120, 455, 1020, 300);
    // pale frost patches and a few fence posts
    for (let i = 0; i < 10; i++) softBlob(ctx, rng.range(-40, 800), rng.range(480, 640), rng.range(60, 150), rng.range(8, 18), '#e6e8e0', rng.range(0.2, 0.45));
    for (let x = 60; x < 820; x += 118) {
      taperStroke(ctx, [[x, 548], [x + 2, 500]], 7, PAL.twig, 0.42, 'none');
    }
    taperStroke(ctx, [[-60, 516], [400, 512], [860, 517]], 3.5, PAL.twig, 0.3, 'none');
    taperStroke(ctx, [[-60, 534], [400, 530], [860, 535]], 3.5, PAL.twig, 0.3, 'none');

    // birches
    birchTrunk(ctx, rng, 236, 205, 52, 38);
    birchTrunk(ctx, rng, 598, 622, 26, 18);

    // side branches
    const branch = (x0, y0, x1, y1, w) =>
      taperStroke(ctx, [[x0, y0], [(x0 + x1) / 2 + rng.range(-14, 14), (y0 + y1) / 2 - 22], [x1, y1]], w, PAL.twig, 0.75, 'end');
    branch(222, 300, 60, 150, 9);
    branch(214, 190, 380, 40, 8);
    branch(226, 420, 420, 300, 7);
    branch(610, 240, 480, 120, 6);
    branch(614, 150, 760, 30, 6);

    // hanging twigs with the last yellow leaves
    for (let i = 0; i < 64; i++) {
      const x = rng.range(-30, 790);
      const y = rng.range(-60, 190);
      const len = rng.range(110, 330);
      const drift = rng.range(-26, 26);
      const pts = [[x, y], [x + drift * 0.3, y + len * 0.5], [x + drift, y + len]];
      taperStroke(ctx, pts, rng.range(1.6, 3), PAL.twig, rng.range(0.4, 0.75), 'end');
      const leaves = rng.int(0, 5);
      for (let k = 0; k < leaves; k++) {
        const t = rng.range(0.25, 1);
        softBlob(ctx, x + drift * t * t + rng.range(-7, 7), y + len * t, rng.range(3.5, 6), rng.range(4.5, 8), rng.pick([PAL.leaf, '#b8923f', '#cdb469']), rng.range(0.7, 0.95));
      }
    }
  },
});
