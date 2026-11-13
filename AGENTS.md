# AGENTS.md: reeglid kõigile agentidele selles repos (sama sisu mis CLAUDE.md)

**Enne mis tahes muudatust loe `KNOWLEDGE.md` peatükid 1–8 ja oma mooduli alapeatükk peatükis 9.** See on projekti ainus tõeallikas.

## Projekt
112Sim on veebirakendus hädaabikõne harjutamiseks: videostseen, mis kõne ajal muutub, eestikeelne häälkõne AI-päästekorraldajaga ja tõenditega analüüs. Viimsi AI-häkaton, 13.–14.11.2026. Kogu voog peab töötama **laupäeval kell 11:00**.

## Kelle heaks sa töötad
Kontrolli `git branch --show-current`. Kui haru ei ole üks allolevatest, küsi inimeselt, mis on tema moodul. Failide omanikud on `KNOWLEDGE.md` peatükis 15.1:

| Haru | Kes | Moodul | Failid |
|---|---|---|---|
| `feat/sim` | Rocco | integraator | karkass, ühised failid, `lib/sim/**`, simulatsioonileht, `components/sim/**` (v.a `VideoStage`, `ScenarioIntro`), `/api/scenarios`, `/api/sessions`, `lib/db/**` |
| `feat/voice` | Sander | hääl | `lib/voice/**`, `/api/realtime/session`, `prompts/dispatcher.et.md` |
| `feat/brain` | Ats | aju | `lib/agents/**` (v.a `dispatcher.et.md`), `lib/director/**`, `/api/extract`, `/api/analyze`, `fixtures/**` |
| `feat/stage` | Aaron | lava ja raport | `public/clips/**`, `components/sim/VideoStage.tsx`, `ScenarioIntro.tsx`, `components/report/**`, raportileht |

## Git: kõvad reeglid
1. **Tööta ainult oma harus.** Ära kunagi commit'i ega push'i `main`-i.
2. **Keelatud käsud:** `git push --force` (ka `--force-with-lease`), `git rebase`, `git reset --hard`, `git add -A`, `git add .`, `git commit -a`, `git checkout main -- <fail>`, `git stash drop`, harude kustutamine.
3. **Lisa commit'i failid nimepidi** ja ainult oma mooduli omad. Enne commit'i näita inimesele `git status` ja küsi luba.
4. **Ära commit'i kunagi** `.env*` faile (v.a `.env.example`), võtmeid ega `node_modules`-it.
5. Värske `main`-i saad käsuga `git pull origin main` (tavaline merge). Kui tekib konflikt failis, mis ei ole sinu oma, peatu ja ütle inimesele.
6. Enne igat commit'i: `npm run typecheck && npm run test && npm run lint`. Punasega ei commit'i.
7. Commit'i sõnum inglise keeles, üks rida, käskivas kõneviisis.

## Kood: kõvad reeglid
1. **Muuda ainult oma mooduli faile.** Ühiseid faile muudab ainult integraator: `src/lib/types.ts`, `src/lib/facts.ts`, `src/lib/scenarios/**`, `src/components/ui/**`, `package.json`, lukufail, `supabase/**`, `.github/**`, `CLAUDE.md`, `AGENTS.md`, `KNOWLEDGE.md`, `CONTRIBUTING.md`, `ROCCO.md`. Kui vajad seal muudatust, **peatu ja ütle inimesele**, mida ja miks.
2. **Lepingud on siduvad.** Kasuta täpselt `src/lib/types.ts` tüüpe. Ära loo paralleelseid ega „ajutisi“ tüüpe.
3. **Võtmed ja stsenaariumi tõde (`truth`) ei lahku serverist.** Ükski saladus ei kanna `NEXT_PUBLIC_` eesliidet.
4. **Režissöör on puhas deterministlik funktsioon:** ei võrku, ei `Date.now()`-i, ei juhuslikkust, ei LLM-i.
5. **Punktid arvutab kood** (`scoring.ts`). LLM leiab tõendid ja kirjutab tekstid; kood kontrollib, et tsitaat on transkriptis olemas.
6. **AI ei mõtle stsenaariumi fakte ega meditsiinilisi juhiseid välja.** Päästekorraldaja juhised tulevad ainult stsenaariumi `dispatcherWhitelist`-ist.
7. **Iga moodul töötab `mockVoice`-i ja fixture'itega** ilma teiste mooduliteta.
8. **UI:** ainult `src/components/ui/` primitiivid ja tokenid. Kõvakodeeritud värve ja fonte ei kasutata. Välimuse lihvib integraator.
9. **Keel:** kasutajale nähtav tekst eesti keeles; kood, muutujad ja commitid inglise keeles.
10. **API-de nimed võta dokumentatsioonist, mitte mälust** (OpenAI Realtime: https://developers.openai.com/api/docs/guides/realtime-webrtc).
11. **Uusi sõltuvusi ega migratsioone ei lisa.** Kui vajad paketti, peatu ja ütle inimesele.
12. Kui see fail või `KNOWLEDGE.md` tundub vale või puudulik, **ära improviseeri**: kirjelda probleemi inimesele.

## Ohutus
- Igal lehel on nähtav märge: „Treeningsimulatsioon. Päris hädaolukorras helista 112.“
- Rakendus ei helista kunagi päris numbrile (ei ühtegi `tel:` linki).
- Heli ei salvestata; nimesid ega kontakte ei koguta.

## Käsud
```
npm run dev         # kohalik arendus
npm run test        # vitest, ilma võrguta
npm run test:live   # testid päris mudeliga
npm run typecheck
npm run lint
```
