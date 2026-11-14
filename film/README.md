# film/ — offline animation studio for "Vanaema köögis"

Renders the 112Sim first-person film frame by frame. It is separate from the app: nothing here is imported by `src/`, and the app's `package.json` is untouched. `FILM_SPEC.md` is the source of truth.

## Setup (once)

Needs Node 20+ and ffmpeg (`ffmpeg -version`).

```sh
cd film
npm install
npx playwright install chromium
```

## Preview and tune

```sh
node film/serve.mjs        # then open http://127.0.0.1:4173/preview.html
```

Segment picker, frame scrubber, play/pause at 30 fps (Space, ←/→, Shift for 10 frames) and a slider for every rig parameter. Dragging a slider overrides that parameter on every frame; untick it to follow the timeline again. "Copy" puts the ticked overrides on the clipboard as JSON.

## Render

```sh
node film/render.mjs --list
node film/render.mjs --segment test                     # film/out/test.mp4
node film/render.mjs --segment test --from 10 --to 19   # film/out/test_10-19.mp4 (frames 10…19)
node film/render.mjs --segment test --stills 0,30,59    # film/out/stills/test_0000.png …
```

Options for stills: `--crop x,y,w,h` (part of the frame at 100 %), `--scale 640x360`, `--tag face` (adds a label to the file name) and `--pan 600` (turns the camera right by that many pixels, to look at the hallway door). The style-frame stills:

```sh
node film/render.mjs --segment style --stills 0
node film/render.mjs --segment style --stills 0 --tag face --crop 720,150,400,440
node film/render.mjs --segment style --stills 0 --tag nopost --no-post
```

Rig stills: `--pose POSE_S2` draws a named pose, and `--set mouthCornerR=-1,cheekSagR=1` overrides single parameters. `node film/contact.mjs` writes two contact sheets (`contact_face.png`, `contact_body.png`) showing every parameter at its minimum and maximum.

`--no-post` skips the post effects (bloom, grade, vignette, paper, grain). The video is written to `<name>.tmp.mp4` and renamed only when ffmpeg exits 0. Before drawing, the renderer checks the segment's contract (known parameters and poses, `from`/`to` poses, loop closure) and then the pictures themselves: a loop's frame 0 must equal the frame after its last, and the first and last frames must equal the declared poses. Any failure stops the render. `--no-check` skips the picture checks.

## Layout

| Path | What |
| --- | --- |
| `scene.html` | The 1920×1080 canvas. Exposes `window.renderFrame(segmentId, frameIndex)` and `window.segments` |
| `preview.html` | Review and tuning tool |
| `render.mjs` | Playwright capture piped into ffmpeg |
| `contact.mjs` | Contact sheets of the rig parameters |
| `serve.mjs` | Static server (ES modules do not load from `file://`) |
| `src/scene.js` | `renderFrame`, segment checks |
| `src/config.js` | Frame size, fps, world size |
| `src/layout.js` | Where things are, in rest coordinates; the table's perspective |
| `src/palette.js` | The film's colours |
| `src/paint.js` | Painting helpers: soft blobs, tapered strokes, cloud noise, mottling |
| `src/rng.js` | mulberry32, seeded per segment and frame |
| `src/tracks.js` | Keyframes, easing, periodic idle helpers, blinks |
| `src/poses.js` | `POSE_S1`, `POSE_S2`, `POSE_S3`. Neutral parameters are the approved style frame, so `POSE_S1` lists nothing |
| `src/camera.js` | POV camera, parallax, idle sway. The frame rests at the left of the world |
| `src/post.js` | Grade, vignette, paper texture, grain |
| `src/layers/` | Static painted layers cached in offscreen canvases: `window`, `backWall` (with the curtain), `hallwayDoor`, `table`, `foreground`, `bloom`. `arrival.js` draws the blue light and the paramedic of `end_good`. `stack.js` draws them in order with the rig |
| `src/rig/` | Timeline helpers that turn a hand position into arm angles (`reach.js`), parameters (`params.js`), `PATIENT_RIGHT = SCREEN_LEFT` (`sides.js`), joints and arm maths (`solve.js`), body, head and face (`helgi.js`), arms, hands and cup (`arms.js`) |
| `src/segments/` | One file per segment, registered in `index.js`: `intro`, `s1`, `onset_s2`, `s2`, `onset_s3`, `s3`, `end_good`, plus `style` (the still pose reference) and `test` |

## Determinism

A frame depends only on `(segmentId, frameIndex)`. There is no `Math.random`, `Date.now` or `requestAnimationFrame` under `src/`; the preview's playback clock is the only real-time code. Rendering the same segment twice on the same machine gives byte-identical files.

## Segments

| Segment | Length | Plays | Starts on | Ends on |
| --- | --- | --- | --- | --- |
| `intro` | 12 s | once | | `POSE_S1` |
| `s1` | 24 s | loop | `POSE_S1` | `POSE_S1` |
| `onset_s2` | 4 s | once | `POSE_S1` | `POSE_S2` |
| `s2` | 24 s | loop | `POSE_S2` | `POSE_S2` |
| `onset_s3` | 6 s | once | `POSE_S2` | `POSE_S3` |
| `s3` | 30 s | loop | `POSE_S3` | `POSE_S3` |
| `end_good` | 8 s | once | `POSE_S2` | |

## Export

Render every segment, then from the repository root:

```sh
for id in intro s1 onset_s2 s2 onset_s3 s3 end_good; do
  node film/render.mjs --segment $id
  ffmpeg -y -i film/out/$id.mp4 -an -c:v libx264 -crf 28 -preset veryfast -pix_fmt yuv420p -movflags +faststart public/clips/vanaema/$id.mp4
  ffmpeg -y -i film/out/$id.mp4 -frames:v 1 public/clips/vanaema/$id.jpg
done
```

The worst-case master joins the masters without re-encoding. `film/out/master_worst_case.txt` lists `intro`, `s1` ×3, `onset_s2`, `s2`, `onset_s3`, `s3` ×4 and `black_2s.mp4` (2 s of black, made with `ffmpeg -f lavfi -i color=black:s=1920x1080:r=30 -t 2 -c:v libx264 -crf 18 -preset veryfast -pix_fmt yuv420p film/out/black_2s.mp4`):

```sh
cd film/out && ffmpeg -y -f concat -safe 0 -i master_worst_case.txt -c copy master_worst_case.mp4
```
