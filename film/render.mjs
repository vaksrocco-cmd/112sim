#!/usr/bin/env node
// Render a film segment to video, or selected frames to PNG stills.
//
//   node film/render.mjs --segment s1                 → film/out/s1.mp4
//   node film/render.mjs --segment s1 --from 0 --to 89 → film/out/s1_0-89.mp4 (frames 0…89)
//   node film/render.mjs --segment s1 --stills 0,120,240
//                                                      → film/out/stills/s1_0000.png, …
//   node film/render.mjs --list                        → the segments and their lengths
//
// Options:
//   --no-post          skip post effects (bloom, grade, vignette, paper, grain)
//   --no-check         skip the picture checks (loop closure, first/last frame poses)
// Stills only:
//   --crop x,y,w,h     save only this part of the frame, at 100 %
//   --scale 640x360    save the still scaled down to this size
//   --tag face         add a label to the file name: s1_0000_face.png
//   --pan 600          turn the camera right by this many pixels (to look at the hallway door)
//   --pose POSE_S2     draw the rig in a named pose instead of the segment's timeline
//   --set a=1,b=-0.5   override single rig parameters (on top of --pose, if given)
//
// How it works: scene.html is opened in headless Chromium at 1920×1080
// (deviceScaleFactor 1). For each frame the page draws
// window.renderFrame(segment, i), the canvas is read as JPEG (quality 0.92)
// and the bytes are written to ffmpeg's stdin. The video is written to
// <name>.tmp.mp4 and renamed only when ffmpeg exits 0, so a failed render
// never leaves a broken file under the final name.

import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdir, rename, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { startServer } from './serve.mjs';

const FILM_DIR = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(FILM_DIR, 'out');
const STILLS_DIR = path.join(OUT_DIR, 'stills');
const FPS = 30;
const WIDTH = 1920;
const HEIGHT = 1080;
const JPEG_QUALITY = 0.92;
const FFMPEG = process.env.FFMPEG || 'ffmpeg';

class UsageError extends Error {}

function parseArgs(argv) {
  const args = { segment: null, from: null, to: null, stills: null, post: true, list: false, crop: null, scale: null, tag: null, pan: null, pose: null, set: null, check: true };
  const wholeNumber = (flag, value) => {
    if (value === undefined || !/^\d+$/.test(value)) throw new UsageError(`${flag} needs a whole number, got "${value}"`);
    return Number(value);
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--segment') args.segment = argv[++i];
    else if (a === '--from') args.from = wholeNumber('--from', argv[++i]);
    else if (a === '--to') args.to = wholeNumber('--to', argv[++i]);
    else if (a === '--stills') {
      const value = argv[++i];
      if (!value) throw new UsageError('--stills needs a list of frames, e.g. --stills 0,120,240');
      args.stills = value.split(',').map((s) => wholeNumber('--stills', s.trim()));
    } else if (a === '--no-post') args.post = false;
    else if (a === '--no-check') args.check = false;
    else if (a === '--crop') {
      const parts = String(argv[++i] || '').split(',').map(Number);
      if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) throw new UsageError('--crop needs x,y,w,h');
      args.crop = parts;
    } else if (a === '--scale') {
      const parts = String(argv[++i] || '').split('x').map(Number);
      if (parts.length !== 2 || parts.some((n) => !(n > 0))) throw new UsageError('--scale needs WIDTHxHEIGHT, e.g. 640x360');
      args.scale = parts;
    } else if (a === '--tag') {
      args.tag = argv[++i];
      if (!args.tag || !/^[\w-]+$/.test(args.tag)) throw new UsageError('--tag needs a short name (letters, digits, - and _)');
    } else if (a === '--pose') {
      args.pose = argv[++i];
      if (!args.pose) throw new UsageError('--pose needs a pose name, e.g. POSE_S2');
    } else if (a === '--set') {
      args.set = {};
      for (const pair of String(argv[++i] || '').split(',')) {
        const [k, v] = pair.split('=');
        if (!k || v === undefined || !Number.isFinite(Number(v))) throw new UsageError('--set needs name=value pairs, e.g. --set mouthCornerR=-1,cheekSagR=1');
        args.set[k.trim()] = Number(v);
      }
    } else if (a === '--pan') {
      args.pan = Number(argv[++i]);
      if (!Number.isFinite(args.pan)) throw new UsageError('--pan needs a number of pixels');
    }
    else if (a === '--list') args.list = true;
    else if (a === '--help' || a === '-h') throw new UsageError('');
    else throw new UsageError(`Unknown option "${a}"`);
  }
  if (!args.list && !args.segment) throw new UsageError('--segment <id> is required');
  if (args.stills && (args.from !== null || args.to !== null)) {
    throw new UsageError('Use either --stills or --from/--to, not both');
  }
  if (!args.stills && (args.crop || args.scale || args.tag || args.pan !== null || args.pose || args.set)) {
    throw new UsageError('--crop, --scale, --tag, --pan, --pose and --set only work with --stills');
  }
  return args;
}

const USAGE = `Usage:
  node film/render.mjs --segment <id> [--from N --to M] [--no-post]
  node film/render.mjs --segment <id> --stills 0,120,240 [--no-post] [--crop x,y,w,h] [--scale WxH] [--tag name] [--pan px] [--pose NAME] [--set a=1,b=2]
  node film/render.mjs --list`;

async function loadPlaywright() {
  try {
    return await import('playwright');
  } catch {
    throw new Error('Playwright is not installed. Run once:\n  cd film && npm install && npx playwright install chromium');
  }
}

function dataUrlToBuffer(dataUrl) {
  return Buffer.from(dataUrl.slice(dataUrl.indexOf(',') + 1), 'base64');
}

/** Draw one frame in the page and read the canvas back as an image. */
function capture(page, segmentId, frameIndex, { mime, quality, post, crop = null, scale = null, pan = null, pose = null, set = null }) {
  return page.evaluate(
    ([id, i, type, q, withPost, cropBox, size, panX, poseName, sets]) => {
      const t0 = performance.now();
      const options = { post: withPost };
      if (panX !== null) options.camera = { panX };
      if (poseName || sets) options.overrides = { ...(poseName ? window.poseParams(poseName) : {}), ...(sets || {}) };
      window.renderFrame(id, i, options);
      const t1 = performance.now();
      let source = document.getElementById('frame');
      if (cropBox || size) {
        const [x, y, w, h] = cropBox || [0, 0, source.width, source.height];
        const out = document.createElement('canvas');
        out.width = size ? size[0] : w;
        out.height = size ? size[1] : h;
        const g = out.getContext('2d');
        g.imageSmoothingQuality = 'high';
        g.drawImage(source, x, y, w, h, 0, 0, out.width, out.height);
        source = out;
      }
      const url = source.toDataURL(type, q);
      return { url, drawMs: t1 - t0, encodeMs: performance.now() - t1 };
    },
    [segmentId, frameIndex, mime, quality, post, crop, scale, pan, pose, set],
  );
}

async function renderStills(page, segmentId, frameList, { post, crop, scale, tag, pan, pose, set }) {
  await mkdir(STILLS_DIR, { recursive: true });
  const written = [];
  for (const f of frameList) {
    const { url, drawMs } = await capture(page, segmentId, f, { mime: 'image/png', quality: undefined, post, crop, scale, pan, pose, set });
    const file = path.join(STILLS_DIR, `${segmentId}_${String(f).padStart(4, '0')}${tag ? `_${tag}` : ''}.png`);
    await writeFile(file, dataUrlToBuffer(url));
    written.push(file);
    console.log(`still  ${path.relative(process.cwd(), file)}  (drawn in ${drawMs.toFixed(0)} ms)`);
  }
  return written;
}

async function renderVideo(page, segmentId, first, last, totalFrames, post) {
  await mkdir(OUT_DIR, { recursive: true });
  const whole = first === 0 && last === totalFrames - 1;
  const base = whole ? segmentId : `${segmentId}_${first}-${last}`;
  const tmpFile = path.join(OUT_DIR, `${base}.tmp.mp4`);
  const outFile = path.join(OUT_DIR, `${base}.mp4`);

  const ffmpeg = spawn(
    FFMPEG,
    [
      '-hide_banner', '-loglevel', 'error',
      '-y', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-',
      '-c:v', 'libx264', '-crf', '18', '-preset', 'veryfast', '-pix_fmt', 'yuv420p',
      tmpFile,
    ],
    { stdio: ['pipe', 'ignore', 'pipe'] },
  );
  let ffmpegLog = '';
  ffmpeg.stderr.on('data', (d) => { ffmpegLog += d; });
  let spawnError = null;
  ffmpeg.on('error', (e) => { spawnError = e; });
  ffmpeg.stdin.on('error', () => {}); // EPIPE is reported through the exit code
  const exited = new Promise((resolve) => ffmpeg.on('close', (code) => resolve(code)));
  let ffmpegGone = false;
  exited.then(() => { ffmpegGone = true; });

  const count = last - first + 1;
  let drawMs = 0;
  let encodeMs = 0;
  const started = process.hrtime.bigint();
  let failure = null;

  try {
    for (let f = first; f <= last; f++) {
      if (ffmpegGone || spawnError) break;
      const shot = await capture(page, segmentId, f, { mime: 'image/jpeg', quality: JPEG_QUALITY, post });
      drawMs += shot.drawMs;
      encodeMs += shot.encodeMs;
      if (!ffmpeg.stdin.write(dataUrlToBuffer(shot.url))) {
        await Promise.race([once(ffmpeg.stdin, 'drain'), exited]);
      }
      const done = f - first + 1;
      if (process.stdout.isTTY) {
        process.stdout.write(`\rframe ${done}/${count}`);
      } else if (done % 150 === 0) {
        console.log(`frame ${done}/${count}`);
      }
    }
  } catch (e) {
    failure = e;
  }
  if (process.stdout.isTTY) process.stdout.write('\n');

  ffmpeg.stdin.end();
  const code = await exited;
  const seconds = Number(process.hrtime.bigint() - started) / 1e9;

  if (spawnError && spawnError.code === 'ENOENT') {
    throw new Error(`ffmpeg was not found ("${FFMPEG}"). Install it (macOS: brew install ffmpeg) or set FFMPEG=/path/to/ffmpeg.`);
  }
  if (failure || spawnError || code !== 0) {
    await rm(tmpFile, { force: true });
    if (failure) throw failure;
    throw new Error(`ffmpeg failed (exit code ${code}).\n${ffmpegLog.trim()}`);
  }

  await rename(tmpFile, outFile);
  const { size } = await stat(outFile);
  return { outFile, count, seconds, fps: count / seconds, drawMs: drawMs / count, encodeMs: encodeMs / count, size };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const { chromium } = await loadPlaywright();
  const { server, url } = await startServer({ port: 0 });
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: WIDTH, height: HEIGHT },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();
    const pageErrors = [];
    page.on('pageerror', (e) => pageErrors.push(e.message));
    page.on('console', (m) => { if (m.type() === 'error') pageErrors.push(m.text()); });

    await page.goto(`${url}/scene.html`);
    try {
      await page.waitForFunction(() => window.sceneReady === true, null, { timeout: 30000 });
    } catch {
      throw new Error(`scene.html did not load.\n${pageErrors.join('\n')}`);
    }

    const info = await page.evaluate(() => window.segmentInfo);
    if (args.list) {
      for (const [id, s] of Object.entries(info)) {
        console.log(`${id.padEnd(12)} ${String(s.durationS).padStart(4)} s  ${String(s.frames).padStart(4)} frames  ${s.loop ? 'loop' : 'once'}`);
      }
      return;
    }
    const seg = info[args.segment];
    if (!seg) throw new UsageError(`Unknown segment "${args.segment}". Known: ${Object.keys(info).join(', ')}`);

    // Contract checks before any frame is drawn.
    const check = await page.evaluate((id) => window.validateSegment(id), args.segment);
    for (const w of check.warnings) console.warn(`warning: ${w}`);
    if (!check.ok) throw new Error(`Segment "${args.segment}" failed its checks:\n  - ${check.errors.join('\n  - ')}`);

    // Picture checks: loops must close, and the first and last frames must be
    // the declared poses. A failed check stops the render.
    if (args.check) {
      const pictures = await page.evaluate((id) => window.checkSegment(id), args.segment);
      for (const r of pictures) {
        console.log(`check  ${r.ok ? 'pass' : 'FAIL'}  ${r.name}  (largest difference ${r.max}/255, ${r.count} pixels differ)`);
      }
      const failed = pictures.filter((r) => !r.ok);
      if (failed.length) throw new Error(`Segment "${args.segment}" failed ${failed.length} picture check(s). Nothing was rendered.`);
    }

    const lastFrame = seg.frames - 1;
    if (args.stills) {
      const bad = args.stills.filter((f) => f > lastFrame);
      if (bad.length) throw new UsageError(`Frame(s) ${bad.join(', ')} are outside "${args.segment}" (0…${lastFrame})`);
      await renderStills(page, args.segment, args.stills, args);
    } else {
      const first = args.from ?? 0;
      const last = args.to ?? lastFrame;
      if (first > last || last > lastFrame) {
        throw new UsageError(`--from ${first} --to ${last} is outside "${args.segment}" (0…${lastFrame})`);
      }
      const r = await renderVideo(page, args.segment, first, last, seg.frames, args.post);
      console.log(`video  ${path.relative(process.cwd(), r.outFile)}  (${(r.size / 1e6).toFixed(2)} MB)`);
      console.log(
        `${r.count} frames in ${r.seconds.toFixed(2)} s = ${r.fps.toFixed(1)} frames per second ` +
          `(draw ${r.drawMs.toFixed(1)} ms, JPEG ${r.encodeMs.toFixed(1)} ms per frame; the rest is transfer and ffmpeg)`,
      );
    }
    if (pageErrors.length) throw new Error(`The page reported errors:\n${pageErrors.join('\n')}`);
  } finally {
    if (browser) await browser.close();
    server.close();
  }
}

main().catch((e) => {
  if (e instanceof UsageError) {
    if (e.message) console.error(`${e.message}\n`);
    console.error(USAGE);
    process.exit(2);
  }
  console.error(e.message || e);
  process.exit(1);
});
