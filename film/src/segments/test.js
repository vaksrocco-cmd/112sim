// Pipeline test segment (2 s, 60 frames): a gradient with a moving circle.
// It is a loop on purpose, so it exercises the same checks as s1/s2/s3:
// a keyframe track that returns to its start, periodic idle motion, the
// cached static layer, camera parallax, seeded grain. Not part of the film.

import { keys, periodic } from '../tracks.js';
import { idleCamera, applyLayerTransform, REST_ORIGIN } from '../camera.js';
import { drawLayer } from '../layers/index.js';
import { TEST_GRADIENT } from '../layers/test-gradient.js';
import { FRAME_W, FRAME_H } from '../config.js';

const durationS = 2;

export default {
  id: 'test',
  durationS,
  loop: true,
  from: null, // no rig in this segment, so no named poses
  to: null,
  tracks: {}, // rig parameter tracks (none)

  // Scene tracks: anything that is not a rig parameter.
  sceneTracks: {
    circleX: keys([
      [0, 360],
      [1, 1560, 'easeInOutSine'],
      [2, 360, 'easeInOutSine'],
    ]),
    circleY: periodic({ lengthS: durationS, cycles: 2, amp: 70, offset: 540 }),
    circleR: periodic({ lengthS: durationS, cycles: 1, amp: 12, offset: 90, shape: 'breath' }),
  },

  camera: idleCamera(durationS, { swayPeriodS: 2, swayPx: 6, rollDeg: 0.3, driftPx: 10 }),

  draw({ ctx, camera, scene, t, frameIndex, frames }) {
    drawLayer(ctx, TEST_GRADIENT, camera);

    // The circle lives in world space on the nearest plane (parallax 1).
    ctx.save();
    applyLayerTransform(ctx, camera, 1);
    const x = REST_ORIGIN.x + scene.circleX;
    const y = REST_ORIGIN.y + scene.circleY;
    ctx.shadowColor = 'rgba(10, 20, 30, 0.35)';
    ctx.shadowBlur = 40;
    ctx.shadowOffsetY = 18;
    const fill = ctx.createRadialGradient(x - 28, y - 30, 8, x, y, scene.circleR);
    fill.addColorStop(0, '#fff3dc');
    fill.addColorStop(1, '#e0703c');
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.arc(x, y, scene.circleR, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Screen-space label, so each still shows which frame it is.
    ctx.save();
    ctx.font = '600 34px ui-monospace, Menlo, Consolas, monospace';
    ctx.textBaseline = 'top';
    const label = `test  frame ${String(frameIndex).padStart(3, '0')} / ${frames}  t = ${t.toFixed(3)} s`;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.fillRect(40, 40, ctx.measureText(label).width + 40, 62);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(label, 60, 54);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.fillRect(0, FRAME_H - 8, (FRAME_W * frameIndex) / frames, 8);
    ctx.restore();
  },
};
