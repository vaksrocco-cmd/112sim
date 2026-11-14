// The arrival in the good ending, drawn at the hallway's depth (parallax 0.4):
// a blue light pulsing on the hallway wall, as if from an ambulance outside,
// and a paramedic who steps into the doorway.
//
// The paramedic is a simple figure: dark green and high-vis yellow, plain
// reflective bands, a bag. No logos, no text, no insignia, no face.
//
// Scene values used (all optional, all from the segment's sceneTracks):
//   blueLight   0…1 brightness of the blue light
//   medicX      where the paramedic stands, px right of the doorway's left edge
//   medicStep   walking phase in radians (legs together at multiples of π)

import { DOORWAY, BOUNDS } from '../layout.js';
import { softBlob, fillSmooth, linearGradient, makeCanvas, mix } from '../paint.js';

const BLUE = '#5c8fe6';
const GREEN = '#2d4638';
const GREEN_DARK = '#1f3128';
const HIVIS = '#c6cc52';
const HIVIS_SHADE = '#9aa23c';
const BAND = '#c9ccc2';

function blueLight(ctx, amount) {
  if (!(amount > 0.003)) return;
  const { x0, leafX } = DOORWAY;
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  // a little of it reaches the kitchen wall beside the doorway
  softBlob(ctx, x0 - 60, 380, 190, 440, BLUE, 0.16 * amount);
  // inside the hallway
  ctx.beginPath();
  ctx.rect(x0, BOUNDS.y0, DOORWAY.x1 - x0, BOUNDS.y1 - BOUNDS.y0);
  ctx.clip();
  softBlob(ctx, x0 + 150, 330, 300, 460, BLUE, 0.6 * amount);
  softBlob(ctx, x0 + 120, 880, 280, 130, BLUE, 0.3 * amount);
  softBlob(ctx, leafX + 40, 330, 70, 460, BLUE, 0.25 * amount);
  ctx.restore();
}

const FIG_W = 440;
const FIG_H = 960;
let figure = null;

/** The paramedic, drawn with feet at (0, 0) and about 800 px tall. */
function paintParamedic(g, step, blue) {
  const swing = Math.sin(step);
  const bob = -Math.abs(swing) * 7;
  g.save();
  g.translate(0, bob);

  // ---- legs: dark green trousers, plain reflective band, black boots
  for (const side of [-1, 1]) {
    const dx = side * 36 + side * swing * 26;
    const lift = Math.max(0, side * swing) * 14;
    fillSmooth(g, [[side * 40 - 34, -410], [side * 40 + 34, -410], [dx + 30, -60 - lift], [dx + 28, -18 - lift], [dx - 28, -18 - lift], [dx - 30, -60 - lift]], side < 0 ? GREEN : GREEN_DARK);
    g.fillStyle = BAND;
    g.fillRect(dx - 31, -128 - lift, 62, 20);
    fillSmooth(g, [[dx - 30, -26 - lift], [dx + 30, -26 - lift], [dx + 42, -4 - lift], [dx + 40, 6 - lift], [dx - 32, 6 - lift]], '#1c1d1f');
  }

  // ---- the far arm, behind the body
  const armSwing = -swing * 22;
  fillSmooth(g, [[96, -668], [128, -640], [136 - armSwing, -470], [142 - armSwing, -402], [100 - armSwing, -398], [92 - armSwing * 0.5, -520]], HIVIS_SHADE);

  // ---- jacket: high-vis yellow with dark green shoulders and hem
  fillSmooth(g, [[-112, -672], [-60, -700], [60, -700], [112, -672], [124, -520], [116, -380], [-116, -380], [-124, -520]],
    linearGradient(g, -124, 0, 124, 0, [[0, mix(HIVIS, '#ffffff', 0.12)], [0.55, HIVIS], [1, HIVIS_SHADE]]));
  fillSmooth(g, [[-112, -672], [-60, -700], [60, -700], [112, -672], [116, -630], [0, -612], [-116, -630]], GREEN);
  g.fillStyle = GREEN;
  g.fillRect(-118, -418, 236, 40);
  g.fillStyle = BAND;
  g.fillRect(-122, -548, 244, 22);
  g.fillRect(-120, -452, 240, 22);
  g.fillStyle = 'rgba(20, 30, 24, 0.5)';
  g.fillRect(-3, -612, 6, 232); // the zip

  // ---- the near arm, carrying a bag
  const ax = armSwing;
  fillSmooth(g, [[-128, -640], [-96, -668], [-90 + ax * 0.5, -520], [-98 + ax, -398], [-142 + ax, -402], [-136 + ax, -470]], HIVIS);
  g.fillStyle = BAND;
  g.save();
  g.translate(-120 + ax * 0.9, -440);
  g.fillRect(-24, -8, 50, 18);
  g.restore();
  softBlob(g, -120 + ax, -378, 26, 28, '#b9967f', 1); // hand: a plain shape
  // bag
  const bx = -128 + ax;
  g.fillStyle = GREEN_DARK;
  g.beginPath();
  g.roundRect(bx - 72, -350, 130, 150, 16);
  g.fill();
  g.fillStyle = BAND;
  g.fillRect(bx - 72, -292, 130, 14);
  g.strokeStyle = GREEN_DARK;
  g.lineWidth = 9;
  g.beginPath();
  g.moveTo(bx - 34, -348);
  g.quadraticCurveTo(bx - 6, -398, bx + 22, -348);
  g.stroke();

  // ---- head: no face, only light and shade
  fillSmooth(g, [[-30, -706], [30, -706], [34, -690], [-34, -690]], '#b08e79');
  g.beginPath();
  g.ellipse(0, -752, 46, 57, 0, 0, Math.PI * 2);
  g.fillStyle = linearGradient(g, -46, 0, 46, 0, [[0, '#c7a590'], [0.6, '#b3917c'], [1, '#93745f']]);
  g.fill();
  fillSmooth(g, [[-48, -762], [-40, -800], [0, -816], [40, -800], [48, -762], [30, -786], [0, -794], [-30, -786]], '#3a3531'); // short dark hair

  // ---- the hallway is dim, and the blue light catches one side
  g.globalCompositeOperation = 'source-atop';
  g.fillStyle = 'rgba(30, 28, 30, 0.34)';
  g.fillRect(-220, -860, 440, 900);
  if (blue > 0.003) softBlob(g, -150, -480, 150, 420, BLUE, 0.55 * blue);
  g.restore();
}

function paramedic(ctx, scene) {
  if (scene.medicX === undefined) return;
  const { x0, leafX, floorY } = DOORWAY;
  const x = x0 + scene.medicX;
  if (x < x0 - 150) return; // still out of sight behind the wall
  if (!figure) figure = makeCanvas(FIG_W, FIG_H);
  const g = figure.getContext('2d');
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalCompositeOperation = 'source-over';
  g.clearRect(0, 0, FIG_W, FIG_H);
  g.translate(FIG_W / 2, FIG_H - 70);
  paintParamedic(g, scene.medicStep || 0, scene.blueLight || 0);

  ctx.save();
  // only what stands in the opening can be seen: the wall and the door leaf hide the rest
  ctx.beginPath();
  ctx.rect(x0, BOUNDS.y0, leafX - x0, BOUNDS.y1 - BOUNDS.y0);
  ctx.clip();
  softBlob(ctx, x + 10, floorY + 92, 150, 22, '#000000', 0.4); // shadow on the floor
  ctx.filter = 'blur(1.6px)'; // the same soft focus as the hallway
  ctx.drawImage(figure, x - FIG_W / 2, floorY + 90 - (FIG_H - 70));
  ctx.restore();
}

/** Draw the arrival. Call inside the hallway layer's camera transform, in rest coordinates. */
export function drawArrival(ctx, scene) {
  if (scene.blueLight === undefined && scene.medicX === undefined) return;
  blueLight(ctx, scene.blueLight || 0);
  paramedic(ctx, scene);
}
