#!/usr/bin/env node
// Contact sheets of the rig: every parameter at its minimum and maximum,
// with everything else neutral (the approved style frame).
//
//   node film/contact.mjs      → film/out/stills/contact_face.png
//                                film/out/stills/contact_body.png
//
// Face parameters are shown as a close crop of the head, body and arm
// parameters as a wider crop. Each tile is labelled with its value.

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { startServer } from './serve.mjs';

const FILM_DIR = path.dirname(fileURLToPath(import.meta.url));
const STILLS_DIR = path.join(FILM_DIR, 'out', 'stills');

const SHEETS = [
  {
    file: 'contact_face.png',
    title: 'Face and head: each parameter at min and max (others neutral)',
    crop: [690, 130, 460, 470],
    tile: [322, 329],
    columns: 8,
    groups: ['Head', 'Eyes and brows', 'Mouth and cheek'],
  },
  {
    file: 'contact_body.png',
    title: 'Body, arms and cup: each parameter at min and max (others neutral)',
    crop: [300, 120, 1140, 830],
    tile: [426, 310],
    columns: 6,
    groups: ['Torso', 'Right arm (screen left)', 'Left arm (screen right)', 'Props'],
  },
];

async function main() {
  let chromium;
  try {
    ({ chromium } = await import('playwright'));
  } catch {
    throw new Error('Playwright is not installed. Run once:\n  cd film && npm install && npx playwright install chromium');
  }
  const { server, url } = await startServer({ port: 0 });
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(`${url}/scene.html`);
    await page.waitForFunction(() => window.sceneReady === true, null, { timeout: 30000 });
    await mkdir(STILLS_DIR, { recursive: true });

    for (const sheet of SHEETS) {
      const dataUrl = await page.evaluate((sh) => {
        const params = window.rigParams.filter((p) => sh.groups.includes(p.group));
        const tiles = [{ label: 'neutral (style frame)', overrides: {} }];
        for (const p of params) {
          for (const v of [p.min, p.max]) tiles.push({ label: `${p.name} = ${v}${p.unit || ''}`, overrides: { [p.name]: v } });
        }
        const [tw, th] = sh.tile;
        const pad = 10;
        const labelH = 30;
        const head = 54;
        const rows = Math.ceil(tiles.length / sh.columns);
        const sheet = document.createElement('canvas');
        sheet.width = pad + sh.columns * (tw + pad);
        sheet.height = head + rows * (th + labelH + pad) + pad;
        const g = sheet.getContext('2d');
        g.fillStyle = '#15171a';
        g.fillRect(0, 0, sheet.width, sheet.height);
        g.fillStyle = '#e6e3dc';
        g.font = '600 24px system-ui, sans-serif';
        g.textBaseline = 'middle';
        g.fillText(sh.title, pad, head / 2);
        g.imageSmoothingQuality = 'high';
        const src = document.getElementById('frame');
        tiles.forEach((t, i) => {
          window.renderFrame('style', 0, { post: false, overrides: t.overrides });
          const x = pad + (i % sh.columns) * (tw + pad);
          const y = head + Math.floor(i / sh.columns) * (th + labelH + pad);
          g.drawImage(src, sh.crop[0], sh.crop[1], sh.crop[2], sh.crop[3], x, y, tw, th);
          g.fillStyle = i === 0 ? '#e8a05a' : '#e6e3dc';
          g.font = '500 18px ui-monospace, Menlo, Consolas, monospace';
          g.fillText(t.label, x + 2, y + th + labelH / 2 + 1);
        });
        return sheet.toDataURL('image/png');
      }, sheet);
      const file = path.join(STILLS_DIR, sheet.file);
      await writeFile(file, Buffer.from(dataUrl.slice(dataUrl.indexOf(',') + 1), 'base64'));
      console.log(`sheet  ${path.relative(process.cwd(), file)}`);
    }
    if (errors.length) throw new Error(`The page reported errors:\n${errors.join('\n')}`);
  } finally {
    await browser.close();
    server.close();
  }
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
