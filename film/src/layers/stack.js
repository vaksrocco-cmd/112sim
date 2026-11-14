// The kitchen's depth layers, back to front (FILM_SPEC.md, "Scene"):
//
//   1  window        0.2  blur 4   outside: overcast daylight, birches
//   2  backWall      0.4  blur 3   panelling, window frame, clock, shelf, geranium
//      curtain       0.4  blur 3   lace curtain (own canvas so it can move later)
//   3  hallwayDoor   0.4  blur 2   doorway on the right, off-frame at rest
//   4  Helgi         0.7  sharp    the rig: chair, body, head
//   5  table         0.9  sharp    table, runner, teapot, sugar bowl, saucer, envelope
//      Helgi (front) 0.7  sharp    her right arm and hand on the table, and her cup
//   6  foreground    1.0  blur 6   the caller's forearms, hands and cup rim
//   7  post                        window bloom here; grade, vignette, paper, grain in post.js
//
// The rig is drawn in two passes because the table hides her lap but her
// right hand lies on top of it.

import { drawLayer, layerInfo, getLayerCanvas } from './index.js';
import { applyLayerTransform } from '../camera.js';
import { drawRigBack, drawRigFront } from '../rig/index.js';
import './window.js';
import './backWall.js';
import './hallwayDoor.js';
import './table.js';
import './foreground.js';
import { WINDOW_BLOOM } from './bloom.js';
import { drawArrival } from './arrival.js';
import { toRest } from '../layout.js';

export const RIG_PARALLAX = 0.7;

// The two lace panels in world coordinates: [x0, x1].
const CURTAIN_PANELS = [[0, 240], [580, 880]];
const CURTAIN_HEIGHT = 820;
const CURTAIN_STRIP = 14;

/**
 * The lace curtain. It hangs from above the frame, so it sways more toward
 * its hem. scene.curtainA and scene.curtainB (−1…1) are two slow motions; the
 * panels mix them differently so they do not move as one sheet.
 */
function drawCurtain(ctx, camera, scene) {
  const a = scene.curtainA;
  const b = scene.curtainB;
  if (a === undefined && b === undefined) {
    drawLayer(ctx, 'curtain', camera);
    return;
  }
  const img = getLayerCanvas('curtain');
  const mix = [(a || 0) * 7 + (b || 0) * 3, (b || 0) * 6 + (a || 0) * 3.5];
  ctx.save();
  applyLayerTransform(ctx, camera, layerInfo('curtain').parallax);
  CURTAIN_PANELS.forEach(([x0, x1], i) => {
    for (let y = 0; y < CURTAIN_HEIGHT; y += CURTAIN_STRIP) {
      const hang = ((y + CURTAIN_STRIP / 2) / CURTAIN_HEIGHT) ** 1.5;
      ctx.drawImage(img, x0, y, x1 - x0, CURTAIN_STRIP, x0 + mix[i] * hang, y, x1 - x0, CURTAIN_STRIP);
    }
  });
  ctx.restore();
}

/** Default drawing for a film segment: the whole kitchen through the camera. */
export function drawKitchen({ ctx, camera, params, scene = {}, t = 0, options = {} }) {
  // scene values the rig understands: cupTilt (radians), steam (0…1); plus the time, for the steam's drift
  const extras = { ...scene, time: t };
  drawLayer(ctx, 'window', camera);
  drawLayer(ctx, 'backWall', camera);
  drawCurtain(ctx, camera, scene);
  drawLayer(ctx, 'hallwayDoor', camera);
  // the good ending: blue light and the paramedic, at the hallway's depth
  ctx.save();
  applyLayerTransform(ctx, camera, layerInfo('hallwayDoor').parallax);
  toRest(ctx);
  drawArrival(ctx, scene);
  ctx.restore();

  ctx.save();
  applyLayerTransform(ctx, camera, RIG_PARALLAX);
  drawRigBack(ctx, params, extras);
  ctx.restore();

  drawLayer(ctx, 'table', camera);

  ctx.save();
  applyLayerTransform(ctx, camera, RIG_PARALLAX);
  drawRigFront(ctx, params, extras);
  ctx.restore();

  drawLayer(ctx, 'foreground', camera);
  // the daylight drifts a little as clouds pass (scene.light, −1…1)
  const light = scene.light || 0;
  if (light) {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'soft-light';
    ctx.fillStyle = light > 0 ? `rgba(255,252,240,${(0.07 * light).toFixed(5)})` : `rgba(20,24,30,${(-0.07 * light).toFixed(5)})`;
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.restore();
  }
  if (options.post !== false) drawLayer(ctx, WINDOW_BLOOM, camera, { composite: 'screen', alpha: 0.24 * (1 + 0.3 * light) });
}
