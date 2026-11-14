// Soft bloom on the window (part of layer 7, the post effects). A blurred
// copy of the bright panes, added over the finished picture with 'screen',
// so the daylight spills a little over the frame, the curtain and Helgi's
// shoulder. It sits at the back wall's depth so it stays on the window.

import { defineLayer } from './index.js';
import { toRest, WINDOW } from '../layout.js';
import { PAL } from '../palette.js';

export const WINDOW_BLOOM = defineLayer({
  id: 'windowBloom',
  parallax: 0.4,
  blur: 42,
  paint(ctx) {
    toRest(ctx);
    ctx.fillStyle = PAL.windowGlow;
    for (const [a, b, c, d] of WINDOW.panes) ctx.fillRect(a, b, c - a, d - b);
  },
});
