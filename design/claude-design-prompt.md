# 112Sim: brand system and full platform design

Design a brand system and every screen of **112Sim**, an Estonian web app where a person practises an emergency call. They watch a short video of an accident, press "call 112" in the browser, and talk out loud in Estonian with an AI dispatcher. The scene in the video **changes during the call** (the grandmother's face droops at about 0:45) and the caller has to notice and say so. Afterwards they get a report where every point is tied to a sentence they actually said.

The product already works end to end in code (Next.js App Router, TypeScript, Tailwind v4). What it lacks is a real identity and finished screens: today it is a single 430 px phone column in a generic dark theme, the report is a stub, and there is no layout for a big screen. Your output will be handed to a coding agent that implements it against the existing codebase, so the last section of this brief lists the constraints that make that handoff mechanical. Please read it before you start.

## Who looks at this, and where

Two very different viewing situations, and both matter equally:

1. **A student alone on a phone or school laptop** (age 15–19, also driving-school and first-aid course students). Portrait phone, headphones, slightly nervous. The screen must behave like a phone call, because that is the thing being rehearsed.
2. **A hall of people watching a projector** while one person makes the call. This is a hackathon final tomorrow (jury from a research agency and a technical university) and later a classroom. People at the back must be able to read the live transcript, see the video change, and watch the "AI brain" checklist fill in. Assume a 1920×1080 projector with washed-out contrast.

So every call screen needs a **phone layout (360–430 px)** and a **stage layout (≥1024 px)**. They are the same components rearranged, not two designs.

## The feeling

Serious and calm. This is a rehearsal for one of the worst minutes of someone's life, used by minors, so it must never look like a game, a horror film, or an official government service. Closest references in spirit: a flight-simulator debrief, a good sports-timing app, a control room at night. Nothing playful, no mascots, no gradients for their own sake, no confetti on a good score.

Three ideas should carry the identity:

- **Seconds are the brand.** The whole product is about how fast information reaches the dispatcher. Timestamps (0:03, 0:42, 0:45) are the recurring visual motif: large tabular numerals, a timeline as the signature graphic that appears small in the call screen and large in the report. Use proportional type with tabular figures; the team deliberately removed monospace, do not bring it back.
- **Evidence, not judgement.** A score is always next to the quote that earned it. Quotes use Estonian quotation marks „…“ and get their own consistent visual treatment across the brain panel, the report and the landing page.
- **One thing changes.** The moment the scene changes is the heart of the product. Design a single, restrained "something changed" signal language (for the stage layout and for the report timeline). During practice it must not give the answer away; see the brain panel note below.

## Brand system deliverables

- **Logo and wordmark** for "112Sim", app icon / favicon, and a social share image. Current mark is a handset in a rounded square with a red dot; you may keep, refine or replace it. Do not use or imitate the Estonian Emergency Response Centre (Häirekeskus) identity, the EU 112 star emblem, ambulance crosses or any official insignia: the product must not look official.
- **Colour.** Dark-first. Keep a warm near-black canvas with tonal surface steps rather than outlines. Exactly two saturated colours exist in the product and both come from the phone metaphor: the **green dial button** and the **red hang-up button**; that same red is the single brand accent for urgency. Everything else (success, warning, info) is muted and tinted. Check all text pairs for WCAG AA and make sure the status colours survive a bad projector and colour-blind viewers (never colour alone: pair with an icon or word).
- **Type.** One family that renders Estonian correctly (õ ä ö ü š ž) and is available on Google Fonts, since fonts load through `next/font`. Geist is in use now; keep it unless you have a clearly better reason. Define a scale with two extremes done well: a hall-readable display size for scores and timers, and a comfortable 15–17 px body for phone.
- **Shape and motion.** Soft radii, pill buttons, one primary button per view. Motion only where it explains something: the 500 ms video cross-fade between states, a checklist row filling in, the score appearing, audio level bars. Opacity and colour transitions only; honour reduced motion.
- **Iconography**: one small consistent set (phone, phone-down, keyboard, check, pending, warning, location, clock, retry).
- **The safety note.** Every page must visibly carry exactly this text: „Treeningsimulatsioon. Päris hädaolukorras helista 112.“ Today it is a mustard strip that looks bolted on. Make it a designed, permanent part of the frame that is always visible but never competes with the call. It must never be a link, and nothing in the product is ever a `tel:` link.
- **Components**, each with states: Button (primary, secondary, ghost, danger; sm/md/lg), round call buttons (dial, hang-up, small labelled toggle), Badge (neutral, ok, warn, danger, accent), Card, Panel (titled), Progress bar, text input with send, quote block, stat tile, timestamp chip, timeline, transcript bubble (caller / dispatcher / in-progress), toggle, segmented control, empty/error/loading states.

## Screens

All user-facing copy is Estonian and is given verbatim where it exists; keep it, and write any missing microcopy in plain, calm Estonian (informal "sina"). Use the realistic data below, not lorem ipsum.

**1. Landing page `/`.** Problem-first story for a first-time visitor and for the jury. Hero: „Hädaabikõnes loeb iga sekund. Keegi pole seda kunagi harjutanud.“ with primary action „Proovi kõnet“ and the line „2 minutit · eesti keeles · tasuta · päris kõnet ei tehta“. Sections: Problem (stats „3000 kõnet päevas“, „~70% puudutab tervisemuret“, each with a small source link), Pain (poolik aadress; ei ütle, mis juhtus; ei märka, et olukord muutus; callout „Insuldi puhul on ravi võimalik ainult 4,5 tunni jooksul.“), Solution in four steps (näed olukorda → helistad ja räägid päriselt → olukord muutub kõne ajal → saad ausa tagasiside), Why it works (Norway is building the same thing; transparent scoring; for schools, driving schools, first-aid trainers), closing CTA and a small-print disclaimer that this is not an official Häirekeskus product and teaches calling, not first aid. Needs a real desktop layout, not a stretched phone column. A product visual here should be the actual call screen and report, not illustration.

**2. Scenario picker.** Scenario cards: „Vanaema köögis“ (available) and „Jalgrattur kooli ees“ (coming soon). Difficulty switch: „Vihjetega“ (a caption under the video describes what you see) vs „Ilma vihjeteta“. Optional class-code field „Klassi kood“ for teacher groups. No name, no email, anywhere.

**3. Briefing.** Title „Vanaema köögis“, headline „Oled vanaema Helgi juures külas.“, card „Mida sa tead“: „Vanaema Helgi on 78-aastane.“ / „Jõite köögis teed, kui ta hakkas äkki segaselt rääkima.“ / „Laual on ümbrik tema aadressiga.“ The **envelope** is a key prop, design it as a recognisable object: „Helgi Tamm / Männikäbi tee 14 / Haabneeme, 74001 Viimsi vald“. Instruction: „Kohe helistad 112-le. Räägi nii, nagu räägiksid päriselt. Olukord võib kõne ajal muutuda: kui midagi muutub, ütle seda.“ Button „Olen valmis“. Then the intro clip plays once, full-bleed, with the single caption line.

**4. Before the call.** Looping 16:9 video of the scene, the envelope reachable, and a dial pad moment: large „112“, label „Hädaabi · simulatsioon“, green round dial button. Include the microphone-permission moment and a "connecting" state („helistan…“).

**5. In call (the main screen; design it most carefully).**
- Header like a phone call: „Häirekeskus“, running timer, activity word (kuulab sind / sa räägid / saab aru… / räägib), five-bar audio level.
- **Video stage**, 16:9, with optional caption labelled „Mida sa näed“. States: S1 „Vanaema istub laua taga, otsib sõnu ja vaatab segaduses ringi.“ → S2 „Vanaema parem suunurk on alla vajunud. Ta üritab tassi võtta, aga parem käsi ei tõuse.“ → S3 „Vanaema on toolil külili vajunud, silmad kinni. Ta ei vasta, aga rind liigub: ta hingab.“ Also the fallback when a clip fails to load: poster image plus caption.
- **Live transcript**: bubbles labelled „Sina“ and „Päästekorraldaja“, the in-progress utterance shown fainter. Sample: „Häirekeskus kuuleb, mis juhtus?“ / „Tere, mu vanaema hakkas äkki segaselt rääkima, ta ei leia sõnu.“ / „Mis aadressil te olete?“ / „Männikäbi tee 14, Haabneeme, Viimsi vald.“ / „Kordan: Männikäbi tee 14, Haabneeme. Kas õige?“
- **AI brain panel** („AI aju: mida süsteem on aru saanud“): a live checklist showing what the system has understood so far. Rows: Mis juhtus (öeldud 0:03 + quote), Asukoht (ootab / poolik „puudub: asula“ / täielik 0:11), Teadvusel, Hingab (jah / ei / teadmata), Sümptomid (kõnehäire · segasus), Seisundi muutus (muutust pole / teatamata „muutus 0:45, ootab teadet 0:12“ / teatatud 0:52 + quote), Abi (ootab / välja saadetud 0:38 „Männikäbi tee 14, Haabneeme“). This panel is what makes the AI visible to an audience, so on the stage layout it is the second most prominent thing after the video. In solo practice it is off by default because it is a cheat sheet; design the toggle.
- Controls: red hang-up in the centre, small round toggles for „klaviatuur“ (text mode input „Või kirjuta siia“ for when the microphone fails or the room is loud) and „AI aju“, plus the collapsed „Mida sa tead · ümbrik“.
- **Phone layout**: header, video, transcript, controls in one column, fixed height, only the transcript scrolls. **Stage layout**: video large on the left, transcript and brain panel side by side or stacked on the right, timer large, type sized for the back row. Show the stage layout at three moments: early call (panel mostly empty), the S2 change with the report window counting, and help dispatched.
- Error states: microphone denied (offer text mode), connection lost, dispatcher silent.

**6. Endings.** Good: the arrival clip („Uksekell heliseb. Kiirabi on kohal.“). Delayed/bad: black screen, one sentence fading in, calm and never mentioning death, e.g. „Kiirabi sõitis välja, aga otsis õiget maja 7 minutit, sest aadress jäi poolikuks.“ Under both, a quiet „Analüüsin kõnet…“ state; the ending is the loading screen.

**7. Report `/report/[id]`.** The payoff, and currently the weakest screen. Structure:
1. Header: big score out of 100, outcome label (Abi jõudis õigel ajal / Abi jõudis hilinemisega / Abi ei jõudnud õigel ajal), one sentence on what this call would have meant in reality.
2. Three key times: „Mis juhtus“ öeldud · Aadress täielik · Reaktsioon muutusele. A missing value reads „ei öelnud“, never 0.
3. **Timeline**: caller and dispatcher utterances on a time axis, with markers for scene changes and ambulance dispatch. This is the signature graphic; the gap between "scene changed" and "caller reported it" should be visible at a glance.
4. Rubric table: label, points/max, code-generated reason, and the caller's quote as evidence. Rows and maximums: Ütles, mis juhtus 20 · Täpne asukoht 25 · Abivajaja seisund 15 · Teatas muutusest 15 · Vastas küsimustele 10 · Selgus 10 · Jäi liinile kuni loani 5. A row can be "not applicable".
5. „Mis jäi ütlemata“ (up to four short lines) and „Kolm soovitust“ (e.g. „Ütle aadress kohe koos asulaga: tänav, maja, linn.“).
6. „Proovi uuesti“, and when there is an earlier attempt, a before → now comparison of score and the three times.

Design it with two data sets: a perfect call (100, good; times 0:03 / 0:11 / 7 s) and a flawed one (77, delayed; 0:03 / 0:42 / „ei teatanud“; rubric 20, 21, 13, 0, 10, 8, 5; ending „Kiirabi jõudis kohale, aga ei teadnud, et seisund vahepeal halvenes, ja valmistus kergemaks juhtumiks.“). Also the degraded state where the AI text failed and only scores, times and reasons exist: the report must still look complete. Phone and desktop layouts; desktop should work on the projector.

**8. Teacher view `/teacher`.** Enter a class code, see aggregates only: number of attempts, average score, the most commonly lost rubric row („kümnest õpilasest kuus ei öelnud asulat“), average time to full address, score distribution. No names, no individual rows. Empty state for a new code.

**9. System pages.** 404, generic error, unsupported browser / no microphone.

## Handoff constraints (the implementer is a coding agent working in an existing repo)

- **Token names are fixed, values are yours.** The code reads colours only through these names, so deliver your palette as values for them (add new tokens if you need, do not rename): `bg`, `surface`, `surface-2`, `border`, `border-strong`, `fg`, `muted`, `subtle`, `primary`, `primary-fg`, `accent`, `accent-fg`, `accent-soft`, `ok`, `ok-soft`, `warn`, `warn-soft`, `danger`, `danger-soft`, `info`, `info-soft`, `call`, `end`; radii `inner`, `card`, `shell`; shadows `sm`, `md`. Deliver one token table (name, hex, usage, contrast pair). Components must use tokens only, never raw hex.
- **Component names map to existing files**, so keep them: UI primitives `Button`, `Card`, `Badge`, `Panel`, `Stack`, `Heading`, `Text`, `Progress`, `Logo`, `SimBanner`; simulation `ScenarioIntro`, `KnownCard`, `VideoStage`, `DialButton`, `HangUpButton`, `RoundButton`, `CallHud`, `LiveTranscript`, `AiBrainPanel`, `TextFallback`; report `ScoreHeader`, `KeyTimes`, `Timeline`, `RubricTable`, `Tips`, `RetryCompare`. New components are fine; name them in the same style and list them.
- **No new libraries.** Everything must be buildable with Tailwind utility classes, inline SVG and CSS transitions. Charts (timeline, distribution) are hand-drawn SVG, so keep them simple enough for that.
- **Do not design anything that needs data the app does not have**: no user accounts, names, avatars, audio playback or recordings, leaderboards, streaks, or medical instructions beyond the copy above. The video is silent; the only sound is the dispatcher.
- For each screen give: phone and ≥1024 px layouts, every state listed above, spacing and type specs, and a short note of what changed from the current build so the implementer can diff.
- Output order: brand system first (logo, tokens, type, components), then screens in the numbered order above, then a one-page handoff summary.
