// Layer 3: the doorway to the hallway (parallax 0.4, blurred 2 px).
// It is off-frame to the right at rest and comes into view when the camera
// turns in the good ending. Through the opening: a dimmer hallway with coats
// on hooks, boots and a rag rug. The door leaf stands half-open at the right.
// The hallway's far wall is drawn further away than the kitchen wall, so a
// standing figure fits in the frame from head to foot.

import { defineLayer } from './index.js';
import { toRest, BOUNDS, DOORWAY, HORIZON_Y } from '../layout.js';
import { PAL } from '../palette.js';
import { softBlob, taperStroke, fillSmooth, linearGradient, rgba, mix, mottle } from '../paint.js';

function coat(ctx, x, top, w, len, color, flare = 1.25) {
  const hw = w / 2;
  fillSmooth(ctx, [
    [x - hw * 0.35, top], [x + hw * 0.35, top], [x + hw, top + 46], [x + hw * 1.02, top + len * 0.5],
    [x + hw * flare, top + len], [x - hw * flare, top + len], [x - hw * 1.02, top + len * 0.5], [x - hw, top + 46],
  ], linearGradient(ctx, x - hw, 0, x + hw, 0, [
    [0, mix(color, '#ffffff', 0.12)],
    [0.5, color],
    [1, mix(color, '#000000', 0.3)],
  ]));
  // folds
  for (const fx of [-0.45, 0.05, 0.5]) {
    taperStroke(ctx, [[x + hw * fx, top + 60], [x + hw * fx * 1.1, top + len * 0.6], [x + hw * fx * 1.25, top + len - 6]], 7, '#000000', 0.16);
  }
}

defineLayer({
  id: 'hallwayDoor',
  parallax: 0.4,
  blur: 2,
  paint(ctx, { rng }) {
    toRest(ctx);
    const { x0, x1, floorY, leafX } = DOORWAY;
    const top = BOUNDS.y0 - 10;
    const bottom = BOUNDS.y1 + 10;
    const vpX = x0 + 170;

    ctx.save();
    ctx.beginPath();
    ctx.rect(x0, top, x1 - x0, bottom - top);
    ctx.clip();

    // far wall of the hallway: dim, warm, faintly striped paper
    ctx.fillStyle = linearGradient(ctx, 0, top, 0, floorY, [
      [0, '#7c7466'],
      [0.6, '#9a907e'],
      [1, '#a39986'],
    ]);
    ctx.fillRect(x0, top, x1 - x0, floorY - top);
    for (let x = x0; x < x1; x += 30) {
      ctx.fillStyle = 'rgba(255,255,255,0.05)';
      ctx.fillRect(x, top, 9, floorY - top);
    }
    // floor: boards running away from us
    ctx.fillStyle = linearGradient(ctx, 0, floorY, 0, bottom, [
      [0, '#6f5a47'],
      [1, '#927659'],
    ]);
    ctx.fillRect(x0, floorY, x1 - x0, bottom - floorY);
    for (let i = -8; i <= 12; i++) {
      const fx = vpX + i * 34;
      const nx = vpX + i * 34 * ((bottom - HORIZON_Y) / (floorY - HORIZON_Y));
      taperStroke(ctx, [[fx, floorY], [nx, bottom]], 2.5, '#4c3c30', 0.45, 'none');
    }
    // skirting board
    ctx.fillStyle = '#b3ad9f';
    ctx.fillRect(x0, floorY - 16, x1 - x0, 16);
    ctx.fillStyle = 'rgba(40,30,25,0.35)';
    ctx.fillRect(x0, floorY - 2, x1 - x0, 5);

    // rag rug with muted stripes
    const rug = (y) => {
      const k = (y - HORIZON_Y) / (floorY - HORIZON_Y);
      return [vpX - 96 * k, vpX + 96 * k];
    };
    const stripeColors = ['#8d4a44', '#c9bfa6', '#55697a', '#b08f4e', '#c9bfa6', '#6d7a5c'];
    let y = floorY + 26;
    let n = 0;
    while (y < bottom) {
      const h = 9 * ((y - HORIZON_Y) / (floorY - HORIZON_Y)) ** 1.2;
      const [a0, a1] = rug(y);
      const [b0, b1] = rug(y + h);
      ctx.beginPath();
      ctx.moveTo(a0, y);
      ctx.lineTo(a1, y);
      ctx.lineTo(b1, y + h);
      ctx.lineTo(b0, y + h);
      ctx.closePath();
      ctx.fillStyle = stripeColors[n % stripeColors.length];
      ctx.fill();
      y += h;
      n++;
    }

    // coat rail, coats, scarf
    softBlob(ctx, x0 + 170, 330, 190, 300, PAL.shadow, 0.16);
    coat(ctx, x0 + 78, 132, 124, 430, '#3c4651');
    coat(ctx, x0 + 176, 132, 116, 330, '#6b5d47', 1.12);
    // scarf
    fillSmooth(ctx, [[x0 + 246, 132], [x0 + 268, 132], [x0 + 276, 300], [x0 + 284, 420], [x0 + 250, 424], [x0 + 248, 300]], '#8a4a45');
    for (let i = 0; i < 6; i++) taperStroke(ctx, [[x0 + 252 + i * 6, 420], [x0 + 251 + i * 6.4, 446]], 2.5, '#8a4a45', 0.9, 'end');
    ctx.fillStyle = '#54433a';
    ctx.beginPath();
    ctx.roundRect(x0 + 26, 118, 300, 16, 4);
    ctx.fill();
    for (const px of [78, 176, 258, 306]) {
      softBlob(ctx, x0 + px, 126, 9, 9, '#2f2622', 0.9);
    }
    // rubber boots by the wall
    for (const bx of [x0 + 262, x0 + 296]) {
      fillSmooth(ctx, [[bx - 13, floorY - 78], [bx + 13, floorY - 78], [bx + 14, floorY - 14], [bx + 34, floorY + 2], [bx + 30, floorY + 14], [bx - 14, floorY + 14]], '#37453c');
      softBlob(ctx, bx + 8, floorY + 16, 30, 6, '#000000', 0.3);
    }

    // the hallway is darker toward the top and beside the door leaf
    ctx.fillStyle = linearGradient(ctx, 0, top, 0, bottom, [
      [0, 'rgba(30,26,24,0.42)'],
      [0.35, 'rgba(30,26,24,0.12)'],
      [1, 'rgba(30,26,24,0.0)'],
    ]);
    ctx.fillRect(x0, top, x1 - x0, bottom - top);
    ctx.fillStyle = linearGradient(ctx, leafX - 90, 0, leafX, 0, [
      [0, 'rgba(30,26,24,0)'],
      [1, 'rgba(30,26,24,0.4)'],
    ]);
    ctx.fillRect(leafX - 90, top, 90, bottom - top);
    // the reveal on the left casts a soft shade into the opening
    ctx.fillStyle = linearGradient(ctx, x0, 0, x0 + 46, 0, [
      [0, 'rgba(30,26,24,0.38)'],
      [1, 'rgba(30,26,24,0)'],
    ]);
    ctx.fillRect(x0, top, 46, bottom - top);

    // door leaf, half-open, hinged on the right
    ctx.fillStyle = linearGradient(ctx, leafX, 0, x1, 0, [
      [0, '#c4c2b6'],
      [0.12, '#b3b2a7'],
      [1, '#97988f'],
    ]);
    ctx.fillRect(leafX, top, x1 - leafX, bottom - top);
    ctx.fillStyle = '#d6d4c8';
    ctx.fillRect(leafX, top, 6, bottom - top); // the leaf's edge
    const panel = (py0, py1) => {
      ctx.fillStyle = 'rgba(60,58,52,0.28)';
      ctx.fillRect(leafX + 24, py0, x1 - leafX - 44, py1 - py0);
      ctx.fillStyle = '#a9a99f';
      ctx.fillRect(leafX + 29, py0 + 5, x1 - leafX - 54, py1 - py0 - 10);
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.fillRect(leafX + 29, py1 - 9, x1 - leafX - 54, 4);
    };
    panel(top, 360);
    panel(500, bottom);
    // handle
    softBlob(ctx, leafX + 30, 440, 16, 26, '#3a3530', 0.3);
    ctx.fillStyle = '#8e7646';
    ctx.beginPath();
    ctx.roundRect(leafX + 16, 408, 12, 52, 5);
    ctx.fill();
    ctx.beginPath();
    ctx.roundRect(leafX + 18, 426, 42, 9, 4);
    ctx.fillStyle = '#b39a61';
    ctx.fill();
    ctx.restore();

    // casing around the opening
    for (const [a, b] of [[x0 - 36, x0], [x1, x1 + 36]]) {
      ctx.fillStyle = linearGradient(ctx, a, 0, b, 0, [
        [0, mix(PAL.trim, PAL.trimShade, 0.3)],
        [0.5, PAL.trim],
        [1, mix(PAL.trim, PAL.trimShade, 0.55)],
      ]);
      ctx.fillRect(a, top, b - a, bottom - top);
      ctx.fillStyle = rgba(PAL.seam, 0.45);
      ctx.fillRect(a, top, 2.5, bottom - top);
      ctx.fillRect(b - 2.5, top, 2.5, bottom - top);
      ctx.fillStyle = rgba(PAL.trimLight, 0.5);
      ctx.fillRect(a + 9, top, 3, bottom - top);
    }
    mottle(ctx, 'hallway', 0.25);
    // unused: rng keeps the signature uniform with other painters
    void rng;
  },
});
