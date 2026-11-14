// Static layer for the pipeline test segment: a gradient with a faint grid,
// painted once in world space. Not part of the film.

import { defineLayer } from './index.js';

export const TEST_GRADIENT = defineLayer({
  id: 'test-gradient',
  parallax: 0.4,
  blur: 0,
  paint(ctx, { width, height, rng }) {
    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, '#22344a');
    grad.addColorStop(0.5, '#6f8a96');
    grad.addColorStop(1, '#e6d3b1');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Grid every 100 world px, so camera sway and parallax are visible.
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.10)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= width; x += 100) {
      ctx.moveTo(x + 0.5, 0);
      ctx.lineTo(x + 0.5, height);
    }
    for (let y = 0; y <= height; y += 100) {
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(width, y + 0.5);
    }
    ctx.stroke();

    // Seeded specks: the same on every run, because rng is seeded by the layer id.
    for (let i = 0; i < 160; i++) {
      ctx.fillStyle = `rgba(255, 255, 255, ${rng.range(0.08, 0.3).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(rng.range(0, width), rng.range(0, height), rng.range(1.5, 5), 0, Math.PI * 2);
      ctx.fill();
    }
  },
});
