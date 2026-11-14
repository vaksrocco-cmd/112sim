// Painting helpers shared by the layers and the rig: colour maths, soft
// blobs for shading, smooth and tapered strokes, cloud noise for mottling.
// Everything is deterministic; randomness always comes from a seeded rng.

import { mulberry32, hashString } from './rng.js';

const TAU = Math.PI * 2;

export function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}

// ---------- colour ----------

export function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

export function rgba(hex, a = 1) {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}

/** Blend two hex colours; t = 0 gives a, t = 1 gives b. */
export function mix(a, b, t) {
  const p = hexToRgb(a);
  const q = hexToRgb(b);
  return '#' + p.map((v, i) => Math.round(v + (q[i] - v) * t).toString(16).padStart(2, '0')).join('');
}

export const lerp = (a, b, t) => a + (b - a) * t;
export const clamp = (v, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));

// ---------- soft shading ----------

/**
 * A soft elliptical patch of colour that fades to nothing at its edge.
 * The basic tool for form shading, blush, contact shadows and glows.
 */
export function softBlob(ctx, x, y, rx, ry, color, alpha = 1, rot = 0) {
  if (alpha <= 0 || rx <= 0 || ry <= 0) return;
  ctx.save();
  ctx.translate(x, y);
  if (rot) ctx.rotate(rot);
  ctx.scale(rx, ry);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
  g.addColorStop(0, rgba(color, alpha));
  g.addColorStop(0.35, rgba(color, alpha * 0.78));
  g.addColorStop(0.7, rgba(color, alpha * 0.26));
  g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, 1, 0, TAU);
  ctx.fill();
  ctx.restore();
}

export function linearGradient(ctx, x0, y0, x1, y1, stops) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  for (const [t, c] of stops) g.addColorStop(t, c);
  return g;
}

export function radialGradient(ctx, x, y, r0, r1, stops) {
  const g = ctx.createRadialGradient(x, y, r0, x, y, r1);
  for (const [t, c] of stops) g.addColorStop(t, c);
  return g;
}

// ---------- curves ----------

/** Add a smooth curve through `pts` ([x, y] pairs) to the current path. */
export function tracePath(ctx, pts, closed = false) {
  const n = pts.length;
  if (n < 2) return;
  const at = (i) => (closed ? pts[((i % n) + n) % n] : pts[Math.min(n - 1, Math.max(0, i))]);
  ctx.moveTo(pts[0][0], pts[0][1]);
  const segs = closed ? n : n - 1;
  for (let i = 0; i < segs; i++) {
    const p0 = at(i - 1);
    const p1 = at(i);
    const p2 = at(i + 1);
    const p3 = at(i + 2);
    ctx.bezierCurveTo(
      p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6,
      p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6,
      p2[0], p2[1],
    );
  }
  if (closed) ctx.closePath();
}

/** Fill a smooth closed shape through `pts`. */
export function fillSmooth(ctx, pts, fill) {
  ctx.beginPath();
  tracePath(ctx, pts, true);
  ctx.fillStyle = fill;
  ctx.fill();
}

/** Points along the smooth curve through `pts`. */
export function splinePoints(pts, closed = false, perSeg = 10) {
  const n = pts.length;
  const at = (i) => (closed ? pts[((i % n) + n) % n] : pts[Math.min(n - 1, Math.max(0, i))]);
  const out = [];
  const segs = closed ? n : n - 1;
  for (let i = 0; i < segs; i++) {
    const p0 = at(i - 1);
    const p1 = at(i);
    const p2 = at(i + 1);
    const p3 = at(i + 2);
    for (let s = 0; s < perSeg; s++) {
      const t = s / perSeg;
      const t2 = t * t;
      const t3 = t2 * t;
      out.push([
        0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
        0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3),
      ]);
    }
  }
  if (!closed) out.push(pts[n - 1]);
  return out;
}

const TAPERS = {
  both: (u) => Math.sin(Math.PI * u) ** 0.65,
  end: (u) => (1 - u) ** 0.6,
  start: (u) => u ** 0.6,
  none: () => 1,
  // full width for most of the stroke, quick taper at both tips
  soft: (u) => Math.min(1, Math.min(u, 1 - u) * 6) ** 0.7,
};

/**
 * A brush stroke: a smooth line through `pts` whose width tapers.
 * Painted as a filled shape, so it has no hard line ends.
 */
export function taperStroke(ctx, pts, width, color, alpha = 1, taper = 'both', perSeg = 8) {
  const sp = pts.length > 2 ? splinePoints(pts, false, perSeg) : pts;
  const n = sp.length;
  if (n < 2 || alpha <= 0) return;
  const prof = TAPERS[taper] || TAPERS.both;
  const left = [];
  const right = [];
  for (let i = 0; i < n; i++) {
    const a = sp[Math.max(0, i - 1)];
    const b = sp[Math.min(n - 1, i + 1)];
    let dx = b[0] - a[0];
    let dy = b[1] - a[1];
    const len = Math.hypot(dx, dy) || 1;
    dx /= len;
    dy /= len;
    const w = (width / 2) * prof(i / (n - 1));
    left.push([sp[i][0] - dy * w, sp[i][1] + dx * w]);
    right.push([sp[i][0] + dy * w, sp[i][1] - dx * w]);
  }
  ctx.beginPath();
  ctx.moveTo(left[0][0], left[0][1]);
  for (let i = 1; i < n; i++) ctx.lineTo(left[i][0], left[i][1]);
  for (let i = n - 1; i >= 0; i--) ctx.lineTo(right[i][0], right[i][1]);
  ctx.closePath();
  ctx.fillStyle = rgba(color, alpha);
  ctx.fill();
}

/** Many loose strokes over an area: paint streaks, wood grain, knit rows. */
export function strokeField(ctx, rng, { x, y, w, h, count, length, width, angle = 0, spread = 0.15, colors, alpha, bend = 0.08 }) {
  for (let i = 0; i < count; i++) {
    const cx = x + rng.next() * w;
    const cy = y + rng.next() * h;
    const len = rng.range(length[0], length[1]);
    const a = angle + (rng.next() - 0.5) * spread;
    const dx = Math.cos(a) * len * 0.5;
    const dy = Math.sin(a) * len * 0.5;
    const b = (rng.next() - 0.5) * len * bend;
    taperStroke(
      ctx,
      [[cx - dx, cy - dy], [cx - dy / len * b * 2, cy + dx / len * b * 2], [cx + dx, cy + dy]],
      rng.range(width[0], width[1]),
      rng.pick(colors),
      rng.range(alpha[0], alpha[1]),
    );
  }
}

// ---------- texture ----------

const cloudCache = new Map();

/**
 * Soft grey cloud noise (mid-grey on average), for mottling paint and paper.
 * Cached by size and seed.
 */
export function cloudCanvas(w, h, seedName, octaves = [5, 11, 23, 47, 95]) {
  const key = `${w}x${h}|${seedName}|${octaves.join(',')}`;
  if (cloudCache.has(key)) return cloudCache.get(key);
  const rng = mulberry32(hashString(`cloud|${seedName}`));
  const c = makeCanvas(w, h);
  const g = c.getContext('2d');
  g.fillStyle = '#808080';
  g.fillRect(0, 0, w, h);
  g.imageSmoothingEnabled = true;
  g.imageSmoothingQuality = 'high';
  octaves.forEach((n, i) => {
    const nh = Math.max(2, Math.round((n * h) / w));
    const small = makeCanvas(n, nh);
    const sg = small.getContext('2d');
    const img = sg.createImageData(n, nh);
    for (let p = 0; p < img.data.length; p += 4) {
      const v = Math.floor(rng() * 256);
      img.data[p] = v;
      img.data[p + 1] = v;
      img.data[p + 2] = v;
      img.data[p + 3] = 255;
    }
    sg.putImageData(img, 0, 0);
    g.globalAlpha = 0.5 / (1 + i * 0.35);
    g.drawImage(small, 0, 0, w, h);
  });
  cloudCache.set(key, c);
  return c;
}

/**
 * Mottle whatever is already painted on `ctx`'s canvas with cloud noise,
 * keeping transparent areas transparent. Gives flat fills a gouache unevenness.
 */
export function mottle(ctx, seedName, alpha = 0.3, mode = 'soft-light', octaves) {
  const { width, height } = ctx.canvas;
  const tmp = makeCanvas(width, height);
  const g = tmp.getContext('2d');
  g.drawImage(cloudCanvas(width, height, seedName, octaves), 0, 0);
  g.globalCompositeOperation = 'destination-in';
  g.drawImage(ctx.canvas, 0, 0);
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = mode;
  ctx.globalAlpha = alpha;
  ctx.drawImage(tmp, 0, 0);
  ctx.restore();
}

/** Ellipse path helper. */
export function ellipse(ctx, x, y, rx, ry, rot = 0, a0 = 0, a1 = TAU) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, rot, a0, a1);
}

const overlayCache = new Map();

/**
 * Cloud noise as a transparent overlay: white where the noise is light, dark
 * where it is dark. Drawn with 'source-atop' it mottles only what is already
 * painted. Used to give the moving character the same gouache unevenness as
 * the static layers.
 */
export function mottleOverlay(w, h, seedName, strength = 0.6) {
  const key = `${w}x${h}|${seedName}|${strength}`;
  if (overlayCache.has(key)) return overlayCache.get(key);
  const src = cloudCanvas(w, h, seedName, [5, 11, 23, 51]);
  const c = makeCanvas(w, h);
  const g = c.getContext('2d');
  g.drawImage(src, 0, 0);
  const img = g.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const v = (d[i] - 128) / 128;
    const a = Math.min(1, Math.abs(v) * strength);
    if (v > 0) {
      d[i] = 255; d[i + 1] = 250; d[i + 2] = 240;
    } else {
      d[i] = 40; d[i + 1] = 32; d[i + 2] = 30;
    }
    d[i + 3] = a * 255;
  }
  g.putImageData(img, 0, 0);
  overlayCache.set(key, c);
  return c;
}
