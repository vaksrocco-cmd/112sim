// Layer 6: the caller (parallax 1.0, blurred 6 px). Their forearms and hands
// rest at the near edge of the table in the bottom corners, with the far rim
// of their own cup between them. Out of focus: shapes and values only.

import { defineLayer } from './index.js';
import { toRest } from '../layout.js';
import { PAL } from '../palette.js';
import { softBlob, taperStroke, fillSmooth, linearGradient, rgba, mix, ellipse, mottle } from '../paint.js';

function forearm(ctx, side) {
  // Designed for the left arm; the right arm is mirrored and nudged so the
  // two do not look like a reflection of each other.
  ctx.save();
  if (side > 0) {
    ctx.translate(1920 - 36, 16);
    ctx.scale(-1, 1);
    ctx.rotate(-0.04);
  }
  // contact shadow on the cloth
  softBlob(ctx, 270, 1092, 350, 44, PAL.shadow, 0.4);
  // sleeve
  fillSmooth(ctx, [
    [-80, 980], [60, 968], [210, 978], [318, 1004], [340, 1040], [322, 1078], [220, 1118], [60, 1180], [-80, 1200],
  ], linearGradient(ctx, 0, 960, 60, 1150, [
    [0, PAL.sleeveLight],
    [0.35, PAL.sleeve],
    [1, PAL.sleeveShade],
  ]));
  // ribbed cuff
  fillSmooth(ctx, [[296, 998], [330, 1004], [348, 1040], [330, 1080], [300, 1090], [286, 1044]], mix(PAL.sleeve, PAL.sleeveShade, 0.5));
  const skinFill = linearGradient(ctx, 330, 990, 380, 1090, [
    [0, mix(PAL.youngSkin, '#ffffff', 0.2)],
    [0.5, PAL.youngSkin],
    [1, PAL.youngSkinShade],
  ]);
  // fingers lying loosely on the table, a little apart
  const fingers = [[1016, 528, 992], [1036, 548, 1022], [1056, 540, 1052], [1072, 516, 1076]];
  for (const [y0, x1, y1] of fingers) {
    ctx.beginPath();
    ctx.lineCap = 'round';
    ctx.strokeStyle = skinFill;
    ctx.lineWidth = 27;
    ctx.moveTo(430, y0);
    ctx.quadraticCurveTo(480, (y0 + y1) / 2 - 8, x1, y1);
    ctx.stroke();
  }
  // back of the hand
  fillSmooth(ctx, [[330, 1010], [392, 998], [444, 1002], [460, 1040], [446, 1080], [400, 1090], [350, 1084], [334, 1046]], skinFill);
  // thumb
  ctx.beginPath();
  ctx.lineCap = 'round';
  ctx.strokeStyle = mix(PAL.youngSkin, '#ffffff', 0.15);
  ctx.lineWidth = 28;
  ctx.moveTo(366, 1004);
  ctx.quadraticCurveTo(420, 980, 468, 968);
  ctx.stroke();
  // shade between the fingers
  for (const [y0, x1, y1] of fingers.slice(0, 3)) {
    taperStroke(ctx, [[440, y0 + 15], [(440 + x1) / 2, (y0 + y1) / 2 + 12], [x1 - 6, y1 + 15]], 7, PAL.youngSkinShade, 0.6);
  }
  ctx.restore();
}

defineLayer({
  id: 'foreground',
  parallax: 1.0,
  blur: 6,
  paint(ctx) {
    toRest(ctx);
    ctx.translate(0, -34);
    // the caller's own cup: only the far rim and the shaded inside reach into the frame
    softBlob(ctx, 1040, 1076, 250, 40, PAL.shadow, 0.32);
    ellipse(ctx, 1004, 1124, 178, 70);
    ctx.fillStyle = linearGradient(ctx, 826, 0, 1182, 0, [
      [0, '#f8f5eb'],
      [0.5, PAL.ceramic],
      [1, PAL.ceramicShade],
    ]);
    ctx.fill();
    ellipse(ctx, 1004, 1132, 160, 60);
    ctx.fillStyle = linearGradient(ctx, 844, 0, 1164, 0, [
      [0, PAL.ceramicDeep],
      [0.6, PAL.ceramicShade],
      [1, '#d9d3c4'],
    ]);
    ctx.fill();
    ellipse(ctx, 1004, 1176, 150, 50);
    ctx.fillStyle = rgba(PAL.tea, 0.9);
    ctx.fill();

    forearm(ctx, -1);
    forearm(ctx, 1);
    mottle(ctx, 'foreground', 0.2);
  },
});
