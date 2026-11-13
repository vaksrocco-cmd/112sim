# Bystander

First-aid training demo. A man collapses, you react, call 112 and follow the dispatcher until the ambulance arrives. One scenario for now: cardiac arrest with gasping.

## Layout

| File | What it is |
| --- | --- |
| `index.html`, `styles.css` | Landing page and the simulation screen |
| `app.js` | The run: scene, 112 call, compressions, debrief |
| `scenarios.js` | Scenario and variant data. One variant is picked at random per run |
| `api/dispatcher.js` | Vercel function. The dispatcher, played by Grok |
| `dispatcher-local.js` | Scripted dispatcher, used when the function is missing or fails |
| `serve.ps1` | Local preview on Windows without Node |

No build step. Vercel serves the static files and `api/` as a function.

## Environment (Vercel)

- `XAI_API_KEY`: xAI key. Without it the function returns 503 and the app uses the scripted dispatcher.
- `XAI_MODEL`: optional, defaults to `grok-4`. Check the current model name in the xAI console.

## Videos

Drop clips into `videos/`. Until a file exists the drawn placeholder shows instead.

`collapse.mp4`, `unresponsive.mp4`, `gasping.mp4`, `cpr.mp4`, `ambulance.mp4`

## Local preview

```
powershell -ExecutionPolicy Bypass -File serve.ps1
```

Then open http://localhost:5173/. There is no `/api` locally, so this always runs the scripted dispatcher.

## Not done yet

- The Grok function has not been run against the real API.
- Nothing is saved to Supabase.
- More variants (bleeding, breathing normally, and so on) go into `scenarios.js`, with matching rules in `dispatcher-local.js`.
