# film/audio — soundtrack for "Vanaema köögis"

`make_audio.py` synthesizes one stereo track per segment (48 kHz), exactly as long as its clip, from the same timings as the animation. Needs Python 3 with numpy and scipy, and ffmpeg. It is deterministic: two runs give identical files.

```sh
python3 film/audio/make_audio.py     # writes film/out/audio/
```

| Folder in `film/out/audio/` | What |
| --- | --- |
| `with_voice/` | Room, clock, actions, breathing and Helgi's wordless voice |
| `without_voice/` | The same without the voice |
| `voice_only/` | The voice alone (`intro`, `s1`, `onset_s2`, `s2`) |

Each track comes as `.wav` and `.m4a`. Use the `.wav` for the loops (`s1`, `s2`, `s3`): AAC adds a few milliseconds of padding, which is audible at a loop point.

## What is in each track

| Segment | Sound |
| --- | --- |
| all | Quiet room tone and a wall clock, continuous across every join and loop |
| `intro` | She chats, sips, sets the cup down on the saucer at 8.5 s, then starts losing her words |
| `s1` | Word-searching murmurs, a long questioning "aah?", fingers pushing the envelope |
| `onset_s2` | Sleeve as the arm lifts, a soft thump as it drops at 2.85 s |
| `s2` | Slightly faster breathing, an effortful breath, rubbing the weak arm, slow slurred speech at 15–18.5 s |
| `onset_s3` | A long breath out, sleeve dragging off the table, the chair creaking as it takes her weight |
| `s3` | Slow breathing in step with the picture, one breath every 5 s |
| `end_good` | Doorbell, an engine idling outside, the front door, footsteps into the doorway |

## Playing it

Keep the video clips silent and muted. Start a segment's track together with its clip, on the audio context the app unlocks at the call tap, loop it when the clip loops, and turn it down while the dispatcher speaks. The room tone and the clock line up at every clip boundary, so tracks can be cut from one to the next at a clip's end without a fade; when switching in the middle of a loop, crossfade over about 0.3 s.

Levels are deliberately low (the whole 4:00 measures about -29 LUFS): this sits under a phone call.
