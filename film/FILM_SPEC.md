# 112Sim — Vanaema köögis: first-person film production plan & Fable prompts

Nov 13, 2026 · @Sander Pärn

> Converted to Markdown from the PDF export of the plan
> ("112Sim — Vanaema köögis: first-person film production plan & Fable prompts", 20 pages).
> If you export the original doc as Markdown yourself, replace this file with that export.

## Summary

We make one continuous, first-person, real-time film of about 4 minutes, "Vanaema köögis". Claude Fable 5 builds it as a 2.5D painted animation in code, then cuts it into the segments the app switches between live.

The caller sits across the kitchen table from grandma Helgi (78). Her stroke starts in front of them, worsens about 45 s into the call, and either holds (change reported) or progresses to collapse (not reported). The AI listens to the call and the director picks the next segment, so the film reacts to what the caller says.

**Decisions locked in this plan**

- **Point of view:** the grandchild's eyes, seated, across the table. Subtle breathing sway, no shaky-cam, no phone in shot.
- **Look:** 2.5D painted illustration, like a serious animated short. Layered depth with parallax, soft window light, film grain. Not cartoonish, not photoreal.
- **Built in code:** an HTML/SVG/Canvas scene with one parametric character rig and timelines, rendered frame by frame. This makes every segment match exactly at its cut points.
- **Silent:** no grandma voice, because her audio would leak into the caller's microphone and be transcribed. Her confusion reads visually.
- **Medically consistent:** stroke signs on HER RIGHT side, which is SCREEN LEFT in first person. Nothing graphic, no death.

**Deliverables**

| File | Plays | Length |
| --- | --- | --- |
| `intro.mp4` | once | 12 s |
| `s1.mp4` | loop | 24 s |
| `onset_s2.mp4` | once (optional upgrade) | 4 s |
| `s2.mp4` | loop | 24 s |
| `onset_s3.mp4` | once (optional upgrade) | 6 s |
| `s3.mp4` | loop | 30 s |
| `end_good.mp4` | once | 8 s |
| `master_worst_case.mp4` | linear, for pitch and backup video | 4:00 |
| `*.jpg` | poster frame per clip | — |

All clips are 1920×1080, 30 fps, H.264, no audio, under 8 MB each, in `public/clips/vanaema/`.

## How the film fits the app

The film is authored as one continuous scene but rendered as segments. The app plays them live and crossfades in 0.5 s, and the director (KNOWLEDGE.md 9.3) chooses the next segment from what the caller has said. Because every segment comes from the same rig, the pose at each cut point is identical, so the joins are invisible.

**Real-time timeline (worst-case path = the master film)**

| Film time | Call time | Segment | Trigger |
| --- | --- | --- | --- |
| 0:00–0:12 | — | intro | user clicks "Alusta" |
| 0:12–~0:45 | before call | s1 loop | user reads the card, presses "Helista 112" (variable length) |
| ~0:45 | 0:00 | s1 continues | dispatcher: "Häirekeskus kuuleb, mis juhtus?" |
| ~1:30 | 0:45 | onset_s2 → s2 loop | `call_elapsed 45000` |
| ~2:00 | 1:15 | onset_s3 → s3 loop | change not reported within 30 s, or address incomplete at 2:00 |
| ~3:45 | 3:00 | ending | hard stop `maxCallMs` |
| ~3:53 | — | end_good or black text | outcome good / delayed / bad |

**Typical paths**

- **Good call (~2:20 of film):** intro → s1 → s2 → end_good. S3 never plays.
- **Change not reported (~2:50):** intro → s1 → s2 → s3 → text ending.
- **Address incomplete (~4:00):** intro → s1 → s2 → s3 until the 3:00 cut-off → text ending.

**Onset clips need a small contract change.** Today `ScenarioState` has no field for a play-once clip before a loop. To use `onset_s2` and `onset_s3`, Rocco adds `onsetClipUrl?: string` to `types.ts` and the scenario JSON, and Aaron's `VideoStage` plays it once before the loop. Without it, the app crossfades straight from s1 to s2, and the plan still works.

## Technical system

Fable builds a small offline film studio: one deterministic drawing function `renderFrame(segmentId, frameIndex)` on a 1920×1080 Canvas 2D, a browser preview to review it, and a Node script that captures frames and pipes them into ffmpeg.

### Stack

| Part | Choice | Why |
| --- | --- | --- |
| Drawing | Canvas 2D in one page (`film/scene.html` + ES modules) | Gradients, soft shadows, `ctx.filter = 'blur()'` for depth of field: enough for a painted look |
| Static layers | painted once into offscreen canvases | Kitchen background is drawn once, so per-frame cost is only the character and effects |
| Randomness | seeded PRNG (mulberry32), seed per segment | Same input = same frame, every time. No `Math.random`, no `Date.now` |
| Preview | `film/preview.html`: segment picker, scrubber, play, sliders for every rig parameter | Sander reviews and tunes without rendering |
| Capture | Node + Playwright (Chromium): for each frame call `window.renderFrame`, read `canvas.toDataURL('image/jpeg', 0.92)` | Fast, deterministic, no screen recording |
| Encode | frames piped into ffmpeg (`-f image2pipe`), one file per segment | Matches the video workflow: one encode per scene |

The film tooling lives in its own folder, `film/`, outside `src/`, so it adds no dependencies to the app. Only the finished `.mp4` and `.jpg` files go into `public/clips/vanaema/`. Confirm with Rocco whether `film/` goes in the repo or a separate one (the ownership table has no row for it).

### Scene (world space 2600×1200, camera frame 1920×1080)

The world is wider than the frame so the camera can turn right toward the hallway door in the good ending. Depth layers, back to front, each with a parallax factor:

1. **Window and outside** (0.2): overcast Nordic daylight, birch branches, slightly blurred.
2. **Kitchen back wall** (0.4): pale painted wood panelling, a wall clock, shelf with jars, lace curtain, potted geranium on the sill.
3. **Hallway door** (0.4, right side, off-frame at rest): half-open, coat hooks, the doorway the paramedics will come through.
4. **Helgi and her chair** (0.7): the character rig.
5. **Table** (0.9): pale wood, an oilcloth runner, teapot, her cup and saucer, a sugar bowl, the white envelope with her address facing the camera.
6. **Foreground** (1.0): the caller's own forearms and hands resting on the table edge, out of focus, plus the near edge of the caller's own cup.
7. **Post effects:** subtle warm grade, vignette, animated film grain (seeded per frame), soft bloom on the window.

### Character rig

Helgi is built from layered painted shapes with a transform hierarchy (torso → neck → head → face parts; torso → shoulders → arms → hands). Each frame is drawn from this parameter set; nothing is drawn "by hand" per frame.

| Parameter | Range | Used in |
| --- | --- | --- |
| `breath` | 0–1 (chest rise, shoulder lift) | every segment; key in s3 |
| `torsoLean`, `torsoSlump` | lean −/+, slump 0–1 | s3 collapse |
| `headYaw`, `headPitch`, `headRoll` | ±30° / ±20° / ±25° | glances, s3 head tilt |
| `gazeX`, `gazeY` | −1–1 | confusion, looking at the caller |
| `lidL`, `lidR` | 0 open – 1 closed | blinks, s3 eyes closed |
| `browKnit`, `browRaise` | 0–1 | confusion, fear |
| `mouthOpen` | 0–1 | word-searching lip movement |
| `mouthCornerL`, `mouthCornerR` | −1 down – +1 up, **independent** | S2 droop on HER right corner |
| `cheekSagR` | 0–1 | S2 subtle right-cheek flattening |
| `armR` (shoulder, elbow, wrist, grip) | angles + 0–1 grip | intro sets cup down, S2 failed lift |
| `armL` | angles | fidgeting, steadying on the table |
| `cupAttach` | table / right hand | intro, S2 |

**Left/right rule (write it into the code as a constant):** `PATIENT_RIGHT = SCREEN_LEFT`. All S2 symptoms (mouth corner, cheek, arm) use her right side, which appears on the left of the frame.

### POV camera

- Seated eye height, about 1.2 m from Helgi, slightly above her eye line, 40 mm-equivalent framing: she fills the middle third from chest up.
- Idle motion: breathing sway (period 4 s, about 3 px vertical, 0.15° roll) and a very slow drift. Every camera motion period divides the segment length.
- Depth of field: layers 1–3 blurred 2–4 px, the foreground hands blurred 6 px, Helgi sharp.
- Good ending only: an eased turn of about 25° to the right toward the hallway door over 1.5 s, the way someone turns their head at a doorbell.

### Timelines and loops

- Each segment is a file `film/segments/<id>.js` exporting `{ id, durationS, from: 'POSE_X', to: 'POSE_Y', tracks }`. Tracks are keyframes per rig parameter with easing (`easeInOutSine`, `easeOutCubic`) plus idle layers.
- **Named poses are the contract between segments.** `POSE_S1` = last frame of intro = first and last frame of s1 = first frame of onset_s2. `POSE_S2` = last frame of onset_s2 = first and last frame of s2 = first frame of onset_s3. `POSE_S3` = last frame of onset_s3 = first and last frame of s3. The renderer asserts these at render time.
- **Seamless loops by construction:** in a loop of length L, every idle motion is periodic with a period of L/k (k a whole number), and every keyframe track starts and ends at the same value. Frame L is never rendered, so frame L−1 flows straight into frame 0.
- **Blinks** come from a fixed list of times per segment (irregular-looking, but deterministic), never random.
- **Avoiding a visible repeat:** s3 (which can loop 4–5 times) uses three breathing cycles of slightly different depth, a slow light drift and curtain motion with periods 30, 15 and 10 s, so no single cue repeats obviously.

### Rendering pipeline

1. `node film/render.mjs --segment s1` opens `scene.html` in headless Chromium at 1920×1080 with `deviceScaleFactor: 1`.
2. For frame 0…N−1: `await page.evaluate(i => window.renderFrame('s1', i), i)`, read the JPEG data URL, write the bytes to ffmpeg's stdin.
3. ffmpeg writes a high-quality master, `-f image2pipe -framerate 30 -i - -c:v libx264 -crf 18 -preset veryfast -pix_fmt yuv420p film/out/s1.tmp.mp4`, renamed to `s1.mp4` only when ffmpeg exits 0.
4. Web export: `ffmpeg -i film/out/s1.mp4 -an -c:v libx264 -crf 28 -preset veryfast -pix_fmt yuv420p -movflags +faststart public/clips/vanaema/s1.mp4`, then `-frames:v 1` for `s1.jpg`.
5. Master film: a concat list of the high-quality segments (s1 and s3 repeated to fill the real-time durations), joined with `-f concat -c copy`. No crossfades are needed because poses match exactly.

Render cost: about 3,300 unique frames for all segments. That's a few minutes per full render on a laptop.

## Shot list

Every segment is one static POV shot of Helgi across the table. Times are seconds within the segment. "Right" always means HER right, which is SCREEN LEFT.

### Named poses (the joins)

| Pose | Body | Face | Hands and props |
| --- | --- | --- | --- |
| `POSE_S1` | upright, slightly hunched, head tilted 5° | symmetric, brows knit, lips slightly parted, gaze toward the caller but unfocused | right hand resting on the table beside the cup, left hand in lap |
| `POSE_S2` | same, shoulders a little higher (tense) | her right mouth corner and cheek dropped clearly, left side normal, eyes on her right hand | right hand limp on the table, palm down, left hand holding her right forearm |
| `POSE_S3` | slumped to her right against the chair back, head resting toward her right shoulder | eyes closed, mouth slightly open, face relaxed and asymmetric | right arm hanging beside the chair, left hand loose in lap; cup untouched |

### intro (12 s, plays once)

| Time | Action |
| --- | --- |
| 0–3 | Mid-conversation. Helgi smiles, talks to the caller, holds the cup at chest height in her right hand. Steam rises. |
| 3–5 | She sips and lowers the cup. |
| 5–7 | She starts a sentence. Her lips keep moving, then falter. A small frown, her gaze loses focus. |
| 7–9.5 | She sets the cup down clumsily: it tilts and clatters onto the saucer. Her hand slides off it. |
| 9.5–12 | She looks at the caller, confused, lips searching for words. Ends exactly on `POSE_S1`. |

### s1 (24 s loop, before and early in the call)

Her face stays symmetric for the whole segment. The S2 signs must not appear early.

| Time | Action |
| --- | --- |
| 0–4 | Lips move in fragments, stop, try again. |
| 4–8 | She frowns and turns her head slowly toward the window, as if looking for something. |
| 8–12 | She looks back toward the caller, opens her mouth, closes it. |
| 12–16 | She looks down. Her left hand fidgets with the edge of the envelope. |
| 16–20 | A small frustrated shake of the head, brows knit. |
| 20–24 | She settles back into `POSE_S1`. |

### onset_s2 (4 s, plays once at call 0:45)

| Time | Action |
| --- | --- |
| 0–2 | Her right mouth corner sinks steadily and her right cheek flattens. |
| 1.5–3 | She reaches for the cup with her right hand. The arm rises about 5 cm, wavers and drops back onto the table. |
| 3–4 | She looks down at the hand and grips her right forearm with her left hand. Ends on `POSE_S2`. |

### s2 (24 s loop, the change the caller must report)

The asymmetry is constant and clearly readable from the back of a room. Breathing is slightly faster than in s1.

| Time | Action |
| --- | --- |
| 0–6 | She stares at her right hand. The fingers twitch slightly, but the hand does not lift. |
| 6–10 | She tries again. Her right shoulder hitches up, the arm stays on the table. |
| 10–14 | Her left hand rubs her right forearm. |
| 14–19 | She looks up at the caller, frightened. Her lips move, but only the left side of her mouth moves properly. |
| 19–24 | Gaze drops back to her hand. Returns to `POSE_S2`. |

### onset_s3 (6 s, plays once if the change went unreported)

| Time | Action |
| --- | --- |
| 0–2 | Her eyelids become heavy and her head nods forward. |
| 2–4.5 | Her torso sinks sideways to her right against the chair back. Her head rolls toward her right shoulder and her right arm slides off the table and hangs. |
| 4.5–6 | She settles, eyes closed. Ends on `POSE_S3`. She stays in the chair and the cup stays on the table: no fall, no spill. |

### s3 (30 s loop, unresponsive but breathing)

Nothing moves except breathing, light and the curtain. **The breathing must be clearly visible**, because the dispatcher will ask "Kas ta hingab?" and the caller has to be able to answer from the picture.

| Time | Action |
| --- | --- |
| 0–30 | Six slow breaths (5 s each). Chest and shoulders rise and fall visibly; depth varies slightly between breaths. |
| 0–30 | Window light drifts slowly; the curtain moves gently (periods 30, 15, 10 s). |
| 0–30 | Eyes stay closed, no other movement. Camera breathing sway continues. |

### end_good (8 s, plays once)

The clips are silent, so the arrival reads visually. The app can play a doorbell sound effect after the call ends, when the microphone is already off.

| Time | Action |
| --- | --- |
| 0–1 | Starts on `POSE_S2`. A faint pulsing blue light begins on the hallway wall, from outside. |
| 1–2.5 | The camera turns right toward the hallway door, like a head turning at the doorbell. |
| 2.5–6 | A paramedic silhouette steps into the doorway: green and high-vis yellow uniform, no logos or text, face not detailed. |
| 6–8 | Hold on the doorway, blue light pulsing. |

## Fable prompts

Run these in order in one Claude Code session on Fable 5, inside the project folder. Each prompt ends at a checkpoint where Fable stops and shows you stills. Don't move on until you approve.

**Before prompt 0:** export this doc as Markdown and save it as `film/FILM_SPEC.md`. The prompts refer to it as the source of truth. Make sure Node 20+ and ffmpeg are installed (`ffmpeg -version`).

### Prompt 0: set up the film studio

```text
You are building an offline animation studio that renders a short first-
person film for 112Sim, an Estonian emergency-call training app. Read
film/FILM_SPEC.md completely before writing code. It is the source of truth;
if anything is unclear or contradictory, stop and ask me.

Build the tooling only (no artwork yet):

1. film/package.json with one dependency: playwright (Chromium only). Do not
touch the app's root package.json or anything in src/.
2. film/scene.html: a 1920x1080 <canvas>, loads ES modules from film/src/. It
exposes window.renderFrame(segmentId, frameIndex) and window.segments (id ->
durationS). Rendering must be deterministic: no Math.random, no Date.now, no
requestAnimationFrame timing. Add film/src/rng.js (mulberry32, seeded per
segment and frame).
3. film/src/ structure: layers/ (static painted layers, cached in offscreen
canvases), rig/ (character), camera.js, post.js (grade, vignette, grain),
segments/<id>.js (timelines), poses.js (named poses), tracks.js (keyframes +
easing + periodic idle helpers).
4. film/preview.html: segment dropdown, frame scrubber, play/pause at 30 fps,
and a panel of sliders for every rig parameter (live override for tuning).
5. film/render.mjs: node film/render.mjs --segment <id> [--from N --to M] [--
stills 0,120,240]. Launch headless Chromium at 1920x1080, deviceScaleFactor
1. For each frame: page.evaluate(renderFrame), read
canvas.toDataURL('image/jpeg', 0.92), write the bytes to ffmpeg stdin: ffmpeg
-y -f image2pipe -framerate 30 -i - -c:v libx264 -crf 18 -preset veryfast -
pix_fmt yuv420p film/out/<id>.tmp.mp4. Rename to film/out/<id>.mp4 only when
ffmpeg exits 0. --stills writes PNGs to film/out/stills/<id>_<frame>.png
instead of a video.
6. A test segment 'test' (2 s): a gradient with a moving circle. Render it
and its stills to prove the pipeline.

Checkpoint: show me the test stills and tell me the render speed in frames
per second. Stop there.
```

### Prompt 1: style frame (scene and Helgi, not animated)

```text
Read film/FILM_SPEC.md sections "Summary", "Technical system > Scene" and
"Shot list > Named poses" again.

Paint the static world and a still Helgi in POSE_S1. This frame sets the look
of the whole film, so take your time on quality.

Look: a 2.5D painted illustration, like a serious European animated short
film. Soft, natural, muted colours; overcast Nordic daylight from the window
behind her; soft shadows; no thick outlines; subtle paper texture and film
grain; gentle warm grade; vignette. Calm and serious, never cartoonish or
cute, never uncanny-photoreal.

World: 2600x1200 world space, camera frame 1920x1080, seated POV across a
kitchen table. Build the seven depth layers exactly as the spec lists them
(window/outside, back wall, hallway door off-frame right, Helgi + chair,
table with teapot, her cup and saucer, sugar bowl and the white envelope,
foreground with the caller's blurred forearms and hands and the edge of their
own cup, post effects). Apply depth-of-field blur per layer as specified. The
envelope shows handwriting-like marks, not readable text.

Helgi: 78-year-old Estonian woman. Short grey hair, soft wrinkles, reading
glasses on a cord, light blouse with a dark-green knitted cardigan. Medium
close-up: she fills the middle third of the frame, chest up, slightly left of
centre so her right side (SCREEN LEFT) and the cup on that side are clearly
visible. Pose POSE_S1: symmetric face, brows slightly knit, lips parted, gaze
toward the camera but unfocused, right hand resting beside the cup.

Put the constant PATIENT_RIGHT = SCREEN_LEFT in film/src/rig/sides.js and use
it everywhere.

Checkpoint: render stills of (a) the full frame, (b) a 100% crop of her face,
(c) the full frame without post effects. Show them to me, list what you would
improve, and stop.
```

### Prompt 2: character rig

```text
Read film/FILM_SPEC.md "Technical system > Character rig" again. The style
frame is approved; keep its look exactly.

Turn Helgi into a rig driven only by the parameters in the spec table
(breath, torsoLean, torsoSlump, headYaw/Pitch/Roll, gazeX/Y, lidL/lidR,
browKnit, browRaise, mouthOpen, mouthCornerL and mouthCornerR independent,
cheekSagR, armR shoulder/elbow/wrist/grip, armL, cupAttach). Use a transform
hierarchy (torso > neck > head > face parts; torso > shoulders > arms >
hands). Every parameter at its neutral value must reproduce the approved
style frame.

Rules:
- All S2 signs act on her RIGHT side via PATIENT_RIGHT (screen left).
- The S2 mouth droop must be readable at a distance: at full value, her right
mouth corner sits clearly lower, the right nasolabial fold flattens and the
right cheek sags, while the left side stays normal.
- Torso slump must keep her in the chair; the chair back supports her.
- Wire every parameter to a slider in preview.html.
- Define POSE_S1, POSE_S2 and POSE_S3 in poses.js exactly as the spec's pose
table describes.

Checkpoint: render stills of POSE_S1, POSE_S2 and POSE_S3, plus a contact
sheet showing each parameter at its minimum and maximum. Show them to me and
stop.
```

### Prompt 3: intro and s1

```text
Read film/FILM_SPEC.md "Technical system > Timelines and loops", "Technical
system > POV camera" and "Shot list" sections intro and s1.

Implement the POV camera (breathing sway, slow drift, parallax per layer) and
the segments intro (12 s, plays once, ends exactly on POSE_S1) and s1 (24 s
seamless loop, starts and ends on POSE_S1), following the shot-list timings
second by second.

Rules:
- Loops: every idle and camera motion in s1 has a period that divides 24 s;
every keyframe track starts and ends at the same value; never render frame N,
so frame N-1 flows into frame 0.
- Blinks come from a fixed list of times, irregular-looking, never random.
- Her face stays symmetric throughout intro and s1.
- Mouth movement while she talks or searches for words is natural (irregular
open/close shapes), not a metronome.
- Add an automatic check in render.mjs: for loop segments, render frame 0 and
a virtual frame N and fail if they differ by more than a tiny threshold; for
every segment, assert its first and last frames match its declared from/to
poses.

Checkpoint 1: render stills at intro frames 0, 150, 240, 359 and s1 frames 0,
180, 420, 600. Show them and stop.
After I approve: render both segments fully, play them back, and tell me if
anything pops or jitters. Stop.
```

### Prompt 4: onset_s2 and s2

```text
Read film/FILM_SPEC.md "Shot list" sections onset_s2 and s2.

Implement onset_s2 (4 s, plays once, POSE_S1 -> POSE_S2) and s2 (24 s
seamless loop on POSE_S2). This is the moment the trainee must notice and
report, so it must be unmistakable on a projector but stay realistic.

Rules:
- The droop, cheek sag and arm weakness are on her RIGHT side (PATIENT_RIGHT
= screen left). Double-check this in every still.
- In onset_s2 the droop develops over about 2 s; the failed arm lift rises
about 5 cm, wavers and falls.
- In s2 the asymmetry is constant; when her lips move, only the left side of
her mouth moves properly. Breathing slightly faster than s1.
- Same loop and pose checks as before.

Checkpoint 1: stills at onset_s2 frames 0, 60, 90, 119 and s2 frames 0, 240,
480, 600, plus one still of s2 scaled down to 640x360 to prove the droop
reads small. Show them and stop.
After I approve: render both fully and stop.
```

### Prompt 5: onset_s3 and s3

```text
Read film/FILM_SPEC.md "Shot list" sections onset_s3 and s3.

Implement onset_s3 (6 s, plays once, POSE_S2 -> POSE_S3) and s3 (30 s
seamless loop on POSE_S3).

Rules:
- She slumps sideways to her right against the chair back and stays in the
chair. Her right arm slides off the table and hangs. The cup stays put. No
fall, no spill, nothing graphic.
- In s3 the only motion is breathing, light and curtain. Breathing must be
clearly visible (six breaths of about 5 s, slightly varying depth, chest and
shoulders rising), because the trainee must be able to say she is breathing.
- s3 can loop four or five times in a row, so avoid any obvious repeating
cue: curtain and light periods of 30, 15 and 10 s, breath depth modulated
over the full 30 s.
- Same loop and pose checks.

Checkpoint 1: stills at onset_s3 frames 0, 60, 135, 179 and s3 frames 0, 300,
600, 899. Show them and stop.
After I approve: render both fully and stop.
```

### Prompt 6: end_good

```text
Read film/FILM_SPEC.md "Technical system > POV camera" and "Shot list"
section end_good.

Implement end_good (8 s, plays once, starts on POSE_S2). The clip is silent,
so the arrival reads visually:
- From 0 s a faint blue light pulses on the hallway wall (about 1.5 pulses
per second), as if from an ambulance outside.
- From 1 s to 2.5 s the camera turns right about 25 degrees toward the
hallway door with natural easing, like a head turning at the doorbell.
Parallax must be correct across all layers.
- From 2.5 s a paramedic silhouette steps into the doorway: green and high-
vis yellow uniform, no logos, no text, no detailed face.
- 6 to 8 s: hold.

Checkpoint 1: stills at frames 0, 45, 75, 150, 239. Show them and stop.
After I approve: render fully and stop.
```

### Prompt 7: export, master film, QA

```text
Read film/FILM_SPEC.md "Summary > Deliverables", "Technical system >
Rendering pipeline" and "QA checklist".

1. For each segment (intro, s1, onset_s2, s2, onset_s3, s3, end_good): export
the web version from film/out/<id>.mp4 with ffmpeg -i film/out/<id>.mp4 -an -
c:v libx264 -crf 28 -preset veryfast -pix_fmt yuv420p -movflags +faststart
public/clips/vanaema/<id>.mp4, and a poster with -frames:v 1
public/clips/vanaema/<id>.jpg. Each file must be under 8 MB; if one is not,
raise the CRF for that file only and report it.
2. Build film/out/master_worst_case.mp4 with the concat demuxer and -c copy:
intro, s1 x3 (about 30 s before the call plus the first 45 s of it),
onset_s2, s2 x1 (to call 1:15), onset_s3, s3 x4 (to the 3:00 cut-off), then 2
s of black. That is 4:00. Report its exact length.
3. Run every item in the QA checklist and report pass/fail for each with
evidence (stills or numbers).
4. Print the scenario JSON fields Rocco needs if we use onset clips:
onsetClipUrl for S2 and S3, plus the s3 clip length (30 s). Do not edit src/
yourself.
```

### Fix-up prompt (use any time)

```text
In segment <id>, at frames <from>-<to>: <what looks wrong>. Change only what
is needed to fix it. Keep every other frame, pose and loop check identical.
Show me stills at <frames> before you re-render.
```

## QA checklist

The film is done when every box below is ticked. Prompt 7 asks Fable to check each one and show evidence.

**Technical**

- [ ] Every clip is 1920×1080, 30 fps, H.264, yuv420p, no audio track, under 8 MB, with `+faststart`.
- [ ] Loop clips (s1, s2, s3): frame 0 and the frame after the last are identical, and there's no visible jump when looping in the browser for 2 minutes.
- [ ] Every join matches its named pose: intro→s1, s1→onset_s2→s2, s2→onset_s3→s3, s2→end_good.
- [ ] Rendering the same segment twice gives identical files (deterministic).
- [ ] Each clip has a poster `.jpg`.
- [ ] On `/dev/stage`, switching states shows no black frame.

**Content and medical**

- [ ] Her face is symmetric in intro and s1; nothing from S2 appears early.
- [ ] Every S2 sign (mouth corner, cheek, arm) is on HER right side = SCREEN LEFT.
- [ ] The S2 droop is readable at 640×360 and from the back of a room on a projector.
- [ ] S3 breathing is clearly visible: someone who has never seen the film can answer "is she breathing?" correctly.
- [ ] Nothing graphic, no fall to the floor, no spilled liquid, no death.
- [ ] The paramedic has no logos, text or real-service insignia. The envelope has no readable text.

**Experience**

- [ ] Three people outside the team watch s1 → s2 without context, and at least two notice the change within 15 s.
- [ ] s3 looping four times doesn't feel obviously repetitive.
- [ ] The look stays consistent from intro to end_good: same light, colour grade and character.

## Risks, fallbacks and open decisions

The biggest risk is the face: a painted elderly face built from code can look stiff or uncanny. Prompts 1 and 2 stop for approval so this gets fixed before any animation is built.

| Risk | Fallback |
| --- | --- |
| The face looks stiff or uncanny | Soften the style (more painterly, less detail); keep the camera slightly further back |
| The S2 droop doesn't read on a projector | Move the camera closer for s2 only, keeping the join pose; make the cheek sag stronger |
| Running out of time before Saturday 10:30 (P1 deadline) | Ship s1, s2, s3 first as plain loops with crossfades; intro, onsets and end_good are extras. The app already falls back to poster + caption |
| Rendering is slow | Render at 1280×720 and upscale with ffmpeg; crop the world |
| Clips over 8 MB | Raise CRF per clip; s3 has little motion and compresses well |
| Fable drifts from the spec over a long session | Each prompt re-reads `film/FILM_SPEC.md`; use the fix-up prompt for small changes |

**Open decisions**

- [ ] Onset clips: Rocco adds `onsetClipUrl` to `types.ts` and the scenario JSON, and Aaron supports it in `VideoStage`. Without it, the app crossfades s1→s2.
- [ ] Where `film/` lives: in the 112sim repo or its own repo (Rocco).
- [ ] Doorbell sound effect, played by the app after the call ends (Rocco and Aaron).
- [ ] Tell Aaron that the clips in `public/clips/vanaema/` are coming from this pipeline.
- [ ] Someone with first-aid training checks the symptoms and the dispatcher whitelist before the demo (KNOWLEDGE.md open question 8).
