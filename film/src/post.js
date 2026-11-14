// Post effects, applied to the finished frame in screen space:
// warm grade → vignette → paper texture (fixed) → animated film grain
// (seeded per segment and frame). The window bloom is drawn with the layers
// (layers/bloom.js), because it has to stay on the window when the camera moves.

import { FRAME_W, FRAME_H } from './config.js';
import { frameRng, mulberry32, hashString } from './rng.js';
import { cloudCanvas } from './paint.js';

export const POST_DEFAULTS = {
  grade: 0.1, // strength of the warm tint, 0 = off
  gradeColor: '#ffb070',
  vignette: 0.32, // darkness at the corners, 0 = off
  paper: 0.2, // paper tooth and wash unevenness, 0 = off
  grain: 0.07, // grain strength, 0 = off
  grainSize: 2, // grain size in px; larger grain costs far fewer bits in H.264
};

const GRAIN_TILE = 256;
let grainCanvas = null;
let grainCtx = null;
let grainImage = null;

const vignetteCache = new Map();

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function vignetteCanvas() {
  const key = `${FRAME_W}x${FRAME_H}`;
  if (vignetteCache.has(key)) return vignetteCache.get(key);
  const c = makeCanvas(FRAME_W, FRAME_H);
  const g = c.getContext('2d');
  const cx = FRAME_W / 2;
  const cy = FRAME_H / 2;
  const outer = Math.hypot(cx, cy);
  const grad = g.createRadialGradient(cx, cy, outer * 0.45, cx, cy, outer);
  grad.addColorStop(0, 'rgba(24, 16, 10, 0)');
  grad.addColorStop(0.6, 'rgba(24, 16, 10, 0.35)');
  grad.addColorStop(1, 'rgba(24, 16, 10, 1)');
  g.fillStyle = grad;
  g.fillRect(0, 0, FRAME_W, FRAME_H);
  vignetteCache.set(key, c);
  return c;
}

let paperCanvas = null;

/** Paper: soft uneven wash plus fine fibres. Fixed in the frame, like the sheet a film is painted on. */
function paper() {
  if (paperCanvas) return paperCanvas;
  const c = makeCanvas(FRAME_W, FRAME_H);
  const g = c.getContext('2d');
  g.drawImage(cloudCanvas(FRAME_W, FRAME_H, 'paper', [7, 17, 41, 97, 211]), 0, 0);
  const rng = mulberry32(hashString('paper-fibres'));
  for (let i = 0; i < 5200; i++) {
    const x = rng() * FRAME_W;
    const y = rng() * FRAME_H;
    const a = rng() * Math.PI;
    const len = 5 + rng() * 22;
    g.strokeStyle = rng() < 0.5 ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.07)';
    g.lineWidth = 0.7 + rng() * 0.9;
    g.beginPath();
    g.moveTo(x, y);
    g.quadraticCurveTo(x + Math.cos(a) * len * 0.5 + (rng() - 0.5) * 6, y + Math.sin(a) * len * 0.5 + (rng() - 0.5) * 6, x + Math.cos(a) * len, y + Math.sin(a) * len);
    g.stroke();
  }
  paperCanvas = c;
  return c;
}

function drawGrain(ctx, segmentId, frameIndex, strength, size) {
  if (!grainCanvas) {
    grainCanvas = makeCanvas(GRAIN_TILE, GRAIN_TILE);
    grainCtx = grainCanvas.getContext('2d');
    grainImage = grainCtx.createImageData(GRAIN_TILE, GRAIN_TILE);
  }
  const rng = frameRng(segmentId, frameIndex, 'grain');
  const data = grainImage.data;
  for (let i = 0; i < data.length; i += 4) {
    // Mid-grey ± noise. Mid-grey is neutral under the 'overlay' blend.
    const v = 128 + (rng() + rng() - 1) * 110;
    data[i] = v;
    data[i + 1] = v;
    data[i + 2] = v;
    data[i + 3] = 255;
  }
  grainCtx.putImageData(grainImage, 0, 0);

  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  ctx.globalAlpha = strength;
  ctx.imageSmoothingEnabled = true;
  ctx.scale(size, size);
  ctx.fillStyle = ctx.createPattern(grainCanvas, 'repeat');
  ctx.fillRect(0, 0, Math.ceil(FRAME_W / size), Math.ceil(FRAME_H / size));
  ctx.restore();
}

/**
 * Apply post effects to the frame already drawn on `ctx`.
 * `frameIndex` must already be wrapped for loops (frame N uses frame 0's grain).
 */
export function applyPost(ctx, { segmentId, frameIndex, settings = {} }) {
  const s = { ...POST_DEFAULTS, ...settings };
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.filter = 'none';

  if (s.grade > 0) {
    ctx.globalCompositeOperation = 'soft-light';
    ctx.globalAlpha = s.grade;
    ctx.fillStyle = s.gradeColor;
    ctx.fillRect(0, 0, FRAME_W, FRAME_H);
  }

  if (s.vignette > 0) {
    // A dark, slightly warm overlay that is transparent in the middle.
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = s.vignette;
    ctx.drawImage(vignetteCanvas(), 0, 0);
  }

  if (s.paper > 0) {
    ctx.globalCompositeOperation = 'soft-light';
    ctx.globalAlpha = s.paper;
    ctx.drawImage(paper(), 0, 0);
  }

  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  if (s.grain > 0) drawGrain(ctx, segmentId, frameIndex, s.grain, s.grainSize);

  ctx.restore();
}
