# 112Sim: projekti teadmusfail (KNOWLEDGE.md)

**Versioon 2.4 · 13.11.2026 · omanik: Rocco (integraator) · repo: https://github.com/vaksrocco-cmd/112sim**

> **2.4:** kõik AI käib **OpenAI API** kaudu (D-7, D-13), sest tiimil on OpenAI krediit olemas. Hääle põhivalik on jälle **OpenAI Realtime (WebRTC)**, kaskaad jääb varuks. Ühine tekstimudeli klient on `src/lib/llm/openai.ts` (impordi `@/lib/llm`). Versiooni 2.3 Claude'i-põhine plaan on tühistatud.
>
> **2.3 (tühistatud):** kõik AI käib **Claude API** kaudu (D-7, D-13). Hääl on kaskaad: brauseri kõnetuvastus (et-EE) → `/api/voice/turn` (Claude, voog, tööriistad) → `/api/voice/tts` → kõlar. Ühine klient `src/lib/llm/claude.ts`. Karkass on olemas (23.1).
>
> **2.2:** viis inimest: Rocco, Sander, Ats ja Aaron ehitavad, Otto teeb pitchi ja sisu (15.1). Avalik repo ja merge commit'id ilma rebase'ita (15.2, D-11, D-12), arenduslehed ja CI karkassis (23.1). Ehitajate juhend on `CONTRIBUTING.md`, integraatori juhend `ROCCO.md`.

> **Agentidele ja inimestele.** See fail on projekti ainus tõeallikas. Enne koodi kirjutamist loe läbi peatükid 1–8 ja oma mooduli alapeatükk peatükis 9. Kui see fail ja sinu oletus lähevad vastuollu, kehtib see fail. Kui fail on vale või puudulik, ära tee vaikselt teisiti: ütle integraatorile ja fail uuendatakse.
>
> **Mis muutus võrreldes versiooniga 1:** nimi on 112Sim; lisandus sissejuhatav klipp (õnnetus toimub üks kord, siis jääb olukord kordusena mängima); režissöör on andmepõhine (üleminekud on stsenaariumi JSON-is), nii et uus stsenaarium ei nõua uut koodi; hindamisjuhend on ühendatud kahe varasema versiooni põhjal; ajakava arvestab, et ehitada saab ka öösel; lisatud konkurendid (Norra CallerSim), prioriteedid P0–P2 ja agentide käivituspromptid.

---

## Sisukord

1. Kokkuvõte ühel lehel
2. Üritus, žürii ja hindamine
3. Toode: probleem, sihtrühm, eristus, numbrid
4. Kasutajakogemus sekund-sekundilt
5. Stsenaarium 01: „Vanaema köögis“
6. Stsenaarium 02 (P2): „Jalgrattur kooli ees“
7. Arhitektuur ja otsuste register
8. Andmelepingud (`src/lib/types.ts`)
9. Moodulite spetsifikatsioonid
10. Promptid (täistekstid)
11. Fixture'id ja testid
12. Supabase
13. API marsruudid
14. Kaustastruktuur
15. Töökorraldus: omanikud, Git, disainisüsteem
16. Keskkonnamuutujad
17. Prioriteedid ja verstapostid
18. Riskid ja varuplaanid
19. Valmisoleku kriteeriumid
20. Demo ja pitch
21. Ohutus, eetika, privaatsus
22. Avatud küsimused
23. Agentide käivituspromptid
24. Allikad

---

## 1. Kokkuvõte ühel lehel

**112Sim** on veebirakendus, kus inimene harjutab hädaabikõnet. Ta näeb videost õnnetust, helistab brauseris „112-le“ ja räägib häälega eesti keeles AI-päästekorraldajaga. Olukord videos **muutub kõne ajal** ja helistaja peab seda märkama ning ütlema. Kõne lõpus saab ta tõenditega analüüsi: mis sai öeldud, mis jäi ütlemata ja kui kiiresti.

**Mida õpetame:** kuidas olla kõnes adekvaatne ja anda info kiiresti edasi. **Mida ei õpeta:** esmaabivõtteid.

**Kolm AI rolli ja üks mitte-AI:**

| Roll | Mis see on | Teab stsenaariumi tõde? |
|---|---|---|
| Päästekorraldaja | reaalajas häälemudel | **ei** (nagu päriselus) |
| Kohtunik | kiire tekstimudel, mis loeb transkripti ja täidab `CallFacts` | jah |
| Analüütik | tekstimudel, mis kirjutab tagasiside tekstid | jah |
| Režissöör | **deterministlik kood**, mis otsustab, millal video seisund muutub ja kuidas kõne lõpeb | ei vaja |

**Kaks põhimõtet, mida ei rikuta:**
1. **Punktid arvutab kood, mitte LLM.** LLM leiab transkriptist tõendid ja kirjutab soovitused.
2. **Stsenaariumi faktid on fikseeritud.** AI võib muuta sõnastust ja küsimuste järjekorda, aga ei mõtle fakte ega meditsiinilisi juhiseid välja.

**Pakk:** Next.js (App Router) + TypeScript + Tailwind, Vercel, Supabase, OpenAI API kõigile kolmele AI rollile: päästekorraldaja on OpenAI Realtime (WebRTC, kõne otse kõneks), kohtunik on kiire tekstimudel struktureeritud väljundiga, analüütik on tark tekstimudel.

**Tähtajad, mida ei saa nihutada:** laupäeval **11:00** töötab kogu voog ja varuvideo on salvestatud; **15:45** koodi külmutamine; **16:30** finaal.

---

## 2. Üritus, žürii ja hindamine

- **Viimsi Teaduskooli AI-häkaton**, 9.–12. klass, **13.–14.11.2026, Viimsi Artium**. Ülesanne: „Loo tiimiga oma AI-tööriist“.
- **Reede:** 17:30 kogunemine, 18:00 avasõnad, 18:30 koolitus, 19:30 ideed ja tiimid, 20:30–22:00 kavandamine.
- **Laupäev:** 09:00 kogunemine, 09:30–11:00 ehitamine, 11:30–13:00 pitchimise töötuba, 13:00 lõuna, 13:45–16:30 esitluste ettevalmistus, 16:30–18:30 finaal.
- Tiimis 3–5 inimest. Plakati järgi on arvutid kohapeal, seega **kõik peab töötama brauseris Verceli URL-ilt** ja kaasas peavad olema oma mikrofoniga kõrvaklapid.
- **Žürii:** Eesti Teadusagentuuri esindaja, TalTechi esindaja, korraldaja, veel üks liige.
- **Hindamine korraldaja sõnul** (täpsed kategooriad öeldakse reedel, kirjutage need üles ja lisage siia):
  1. kas lahendus on **päriselt olemas ja töötab** („strategy is king, implementation is king kong“);
  2. kas ja kuidas see **probleemi lahendab**;
  3. **pitchi** ülesehitus ja arusaadavus;
  4. **jätkusuutlikkus**: kui ülalpidamine maksab, siis kust raha tuleb. Kasumit teenima ei pea.
- Live-demo on kõige mõjusam. Salvestatud video on lubatud varuplaanina.

**Järeldus:** keerukus on kapoti all, demo on 10 sekundiga arusaadav. Laval katki minev lahendus kaotab lihtsamale, mis töötab.

---

## 3. Toode: probleem, sihtrühm, eristus, numbrid

### 3.1 Probleem
Hädaabikõnet ei harjuta keegi enne, kui seda päriselt vaja on. Stressis jäävad olulised asjad ütlemata: täpne aadress koos asulaga, mis täpselt juhtus, ja see, et olukord vahepeal muutus.

### 3.2 Sihtrühm ja maksja
- **Kasutaja:** õpilane, autokooli õppur, esmaabikoolitusel osaleja.
- **Maksja:** kool (liikumisõpetus, inimeseõpetus, esmaabi), esmaabikoolitaja, autokool, omavalitsus.

### 3.3 Konkurendid ja eristus (ütle pitchis ausalt)

| Lahendus | Mida teeb | Meie erinevus |
|---|---|---|
| **CallerSim** (Norra; Helse Stavanger/RAKOS, Sklls, Norra Punane Rist) | Rakendus hädaabikõne harjutamiseks, suunatud noortele, plaanis koolide ja autokoolide esmaabiõppesse | Sama suund, mis kinnitab vajadust. Norra keeles ja Norra süsteemile. **Eestis sellist ei ole** (otsingus ei leidnud; ära väida, et kindlasti ei eksisteeri). |
| **Sklls AMK Simulator** (Norra), **Sim911** (USA uurimisprojekt) | Treenib **päästekorraldajaid**: AI mängib helistajat | Meie treenime **helistajat** |
| ChatGPT häälrežiim | Üldine vestlus | Meil on fikseeritud stsenaarium, muutuv videostseen, deterministlik hindamine tõenditega ja õpetaja vaade |

**Meie eristuse lause:** „Esimene eestikeelne hädaabikõne simulaator, kus olukord muutub kõne ajal ja hindamine on läbipaistev: iga punkt on seotud lausega, mille sa ütlesid.“

Häirekeskus soovitab lastele helistamist õpetada rollimängu kaudu. 112Sim teeb sellest rollimängust asja, mida saab üksi ja korduvalt harjutada.

### 3.4 Numbrid pitchi jaoks (allikad peatükis 24)
- 112-le tuleb päevas keskmiselt **3000 kõnet**, aastas umbes **miljon**; **ligi 70%** puudutab tervisemuresid (Häirekeskuse peadirektor, ERR).
- **26%** Eesti elanikest oli viimase 12 kuu jooksul 112-le helistanud (Emor, 2019; ütle aasta juurde).
- Päästekorraldajate sõnul oskab enamik inimesi kõnet hästi teha, aga tüüpiline viga on poolik aadress: öeldakse „Pikk tänav“ ja solvutakse, kui küsitakse, mis linnas (Postimees).
- Insuldi korral piisab kiirabi kutsumiseks **ühest** tunnusest (näopoole halvatus, kehapoole tuimus, kõnehäire) (Kliinikum). Verehüüvet lahustav ravi on võimalik **4,5 tunni** jooksul (Postimees).
- Päris kõne algab sõnadega **„Häirekeskus kuuleb, mis juhtus?“** (ERR). Kasutame sama avalauset.

---

## 4. Kasutajakogemus sekund-sekundilt

| Faas | Mis toimub | Ekraanil |
|---|---|---|
| **Avaleht** | Stsenaariumi valik, raskusaste (vihjed sees/väljas), nupp „Alusta“ | Püsiv märge: „Treeningsimulatsioon. Päris hädaolukorras helista 112.“ |
| **Intro** (5–10 s) | Klikk „Alusta“ käivitab **sissejuhatava klipi**: sündmus toimub **üks kord** (vanaema paneb tassi käest ja hakkab segaselt rääkima) | Video täisekraanil, all üks rida: „Oled vanaema Helgi juures külas.“ |
| **Enne kõnet** | Intro lõpeb, käivitub seisundi `S1` kordusklipp. Ilmub punane nupp **„Helista 112“** ja kaart „Mida sa tead“ (sh ümbrik aadressiga) | — |
| **Kõne** `t=0` | Klikk „Helista 112“: mikrofoni luba, ühendus, päästekorraldaja: **„Häirekeskus kuuleb, mis juhtus?“** | Video + live-transkript + (demos) **„AI aju“ paneel**, kus kontrollnimekiri täitub reaalajas |
| `t≈45 s` | Režissöör vahetab seisundi: **`S2`** (suunurk vajub, käsi ei tõuse) | Helistaja peab seda märkama ja ütlema |
| kuni 30 s pärast | Kui helistaja teatas: „Muutusest teatatud ✅“. Kui ei teatanud: **`S3`** (vajub kokku) | — |
| pärast abi saatmist | Režissöör annab päästekorraldajale märguande: „Kiirabi on kohal, lõpeta kõne.“ Päästekorraldaja ütleb lõpulause ja lõpetab | — |
| **Lõpp** | **Hea:** uksekella ja saabumise klipp. **Hilinenud või halb:** must ekraan ja tagajärje tekst, nt „Kiirabi otsis õiget maja 7 minutit, sest asula jäi ütlemata.“ | — |
| **Raport** | Skoor 0–100, kolm põhiaega, ajajoon, hindamistabel tõenditega, mis jäi ütlemata, kolm soovitust, „Proovi uuesti“ | Korduskatsel võrdlus eelmisega |

Helistaja saab kõne igal ajal punase nupuga katkestada. See on lubatud, aga hindamises loeb (vt 9.6).

---

## 5. Stsenaarium 01: „Vanaema köögis“

Stsenaarium elab failis `src/lib/scenarios/vanaema-insult.json`. **Tõde (`truth`) ei lähe kunagi brauserisse**: klient saab `getPublicScenario()` kaudu versiooni ilma selleta.

### 5.1 Lugu
Helistaja on lapselaps, külas vanaema Helgil (78). Köögis teed juues hakkab vanaema äkki segaselt rääkima. Tegemist on insuldiga. Kõne ajal lisandub suunurga vajumine ja käe nõrkus. Kui helistaja sellest ei teata, vajub vanaema kokku (hingab, aga ei reageeri).

### 5.2 Täielik stsenaariumifail

```json
{
  "id": "vanaema-insult",
  "version": 1,
  "title": "Vanaema köögis",
  "locale": "et-EE",
  "brief": {
    "headline": "Oled vanaema Helgi juures külas.",
    "known": [
      "Vanaema Helgi on 78-aastane.",
      "Jõite köögis teed, kui ta hakkas äkki segaselt rääkima.",
      "Laual on ümbrik tema aadressiga."
    ],
    "envelope": ["Helgi Tamm", "Männikäbi tee 14", "Haabneeme, 74001 Viimsi vald"]
  },
  "truth": {
    "patient": { "name": "Helgi", "age": 78, "sex": "female", "relation": "vanaema" },
    "address": { "street": "Männikäbi tee", "house": "14", "settlement": "Haabneeme", "municipality": "Viimsi vald" },
    "condition": "insult",
    "onsetNote": "sümptomid algasid umbes 5 minutit enne kõnet"
  },
  "symptoms": [
    { "id": "confusion",      "label": "segasus",                 "hints": ["segane", "ei saa aru", "ei tunne ära"] },
    { "id": "speech_problem", "label": "kõnehäire",               "hints": ["räägib segaselt", "ei leia sõnu", "pudistab", "jutt on imelik"] },
    { "id": "face_droop",     "label": "näopoole vajumine",       "hints": ["suunurk vajus", "nägu viltu", "üks pool näost"] },
    { "id": "arm_weakness",   "label": "käe nõrkus",              "hints": ["ei saa kätt tõsta", "käsi ei liigu", "tass kukkus"] },
    { "id": "collapse",       "label": "kokkuvajumine",           "hints": ["vajus kokku", "kukkus", "vajus külili"] },
    { "id": "unresponsive",   "label": "ei reageeri",             "hints": ["ei vasta", "ei reageeri", "silmad kinni", "teadvuseta"] }
  ],
  "states": [
    {
      "id": "INTRO", "kind": "intro", "clipUrl": "/clips/vanaema/intro.mp4", "posterUrl": "/clips/vanaema/intro.jpg",
      "caption": "Vanaema paneb tassi käest ja hakkab segaselt rääkima.",
      "observable": ["confusion", "speech_problem"], "vitals": { "conscious": "yes", "breathing": "yes" },
      "requiresReport": false
    },
    {
      "id": "S1", "kind": "loop", "clipUrl": "/clips/vanaema/s1.mp4", "posterUrl": "/clips/vanaema/s1.jpg",
      "caption": "Vanaema istub laua taga, otsib sõnu ja vaatab segaduses ringi.",
      "observable": ["confusion", "speech_problem"], "vitals": { "conscious": "yes", "breathing": "yes" },
      "requiresReport": false
    },
    {
      "id": "S2", "kind": "loop", "clipUrl": "/clips/vanaema/s2.mp4", "posterUrl": "/clips/vanaema/s2.jpg",
      "caption": "Vanaema parem suunurk on alla vajunud. Ta üritab tassi võtta, aga parem käsi ei tõuse.",
      "observable": ["face_droop", "arm_weakness", "speech_problem"], "vitals": { "conscious": "yes", "breathing": "yes" },
      "requiresReport": true, "reportWindowMs": 30000
    },
    {
      "id": "S3", "kind": "loop", "clipUrl": "/clips/vanaema/s3.mp4", "posterUrl": "/clips/vanaema/s3.jpg",
      "caption": "Vanaema on toolil külili vajunud, silmad kinni. Ta ei vasta, aga rind liigub: ta hingab.",
      "observable": ["collapse", "unresponsive"], "vitals": { "conscious": "no", "breathing": "yes" },
      "requiresReport": true, "reportWindowMs": 20000
    },
    {
      "id": "END_GOOD", "kind": "ending", "clipUrl": "/clips/vanaema/end_good.mp4", "posterUrl": "/clips/vanaema/end_good.jpg",
      "caption": "Uksekell heliseb. Kiirabi on kohal.",
      "observable": [], "vitals": { "conscious": "yes", "breathing": "yes" }, "requiresReport": false
    }
  ],
  "transitions": [
    { "from": "S1", "to": "S2", "when": [{ "type": "call_elapsed", "ms": 45000 }], "reason": "sümptomid süvenevad" },
    { "from": "S2", "to": "S3",
      "when": [{ "type": "change_unreported" }, { "type": "location_incomplete_after", "ms": 120000 }],
      "reason": "seisund halveneb, sest info ei jõudnud päästekorraldajani" }
  ],
  "rules": {
    "addressDeadlineMs": 120000,
    "arrivalAfterDispatchMs": 30000,
    "wrapUpGraceMs": 15000,
    "maxCallMs": 180000,
    "wrapUpCue": "[SÜSTEEM] Kiirabi jõudis just helistaja juurde. Ütle ühe lühikese lausega, et kiirabi on kohal ja helistaja võib kõne lõpetada. Seejärel kutsu end_call."
  },
  "dispatcherWhitelist": [
    "Jääge tema juurde, ärge jätke teda üksi.",
    "Ärge andke talle süüa, juua ega ravimeid.",
    "Tehke välisuks lahti, et kiirabi saaks sisse.",
    "Jätke meelde, mis kell sümptomid algasid.",
    "Öelge mulle kohe, kui midagi muutub.",
    "Vaadake, kas ta rind liigub. Kas ta hingab?"
  ]
}
```

Aadress on väljamõeldud. **Enne kasutamist kontrolli kaardilt, et sellist aadressi päriselt ei ole; kui on, vaheta tänavanimi.** Ümbrikul on asula eraldi real, sest testime, kas helistaja ütleb **terve** aadressi.

### 5.3 Klipid

| Fail | Pikkus | Kordus | Sisu |
|---|---|---|---|
| `intro.mp4` | 5–10 s | ei | Rahulik teejoomine → tass käest → segane jutt. **Sündmus toimub ainult siin.** |
| `s1.mp4` | 20–40 s | jah | Istub, otsib sõnu, vaatab segaduses ringi |
| `s2.mp4` | 20–40 s | jah | Parem suunurk all, üritab tassi võtta, käsi ei tõuse |
| `s3.mp4` | 20–40 s | jah | Külili toolil, silmad kinni, rindkere liikumine nähtav |
| `end_good.mp4` | 5–8 s | ei | Uksekell, pilk ukse poole (kiirabi ei pea kaadris olema) |

**Tootmisreeglid (kehtivad nii filmitud kui AI-genereeritud klippidele):**
- **Sama kaameranurk, sama valgus, sama inimene ja ruum** kõigis klippides. Muidu ei ole üleminek usutav.
- Kordusklipi algus- ja lõpukaader peavad olema peaaegu samas poosis.
- **Ilma helita.** Heli tuleb ainult päästekorraldajalt.
- Horisontaalne 16:9, 1080p, H.264, kuni 8 MB klipi kohta (`ffmpeg -crf 28 -preset veryfast -an`). Igast klipist üks kaader `.jpg`-na varupildiks.
- Verd ega graafilist sisu ei ole. Näitlejal on nõusolek.
- Failid lähevad kausta `public/clips/vanaema/` (ja soovi korral Supabase Storage'isse).

**Klippide allikas on lahtine otsus (D-9):** päris filmitud või AI-videogeneraatoriga tehtud. Kood on selle suhtes ükskõikne. Kui kasutate generaatorit, testige enne, kas see hoiab sama tegelast ja ruumi kõigis viies klipis ning suudab näidata suunurga vajumist; kui ei, filmige ise (statiiv, üks tund).

### 5.4 Raskusaste
- **Vihjetega:** video all on seisundi `caption` tekstina. Sobib esimeseks katseks ja ligipääsetavuseks.
- **Ilma vihjeteta (vaikimisi demos):** ainult video. Muutust peab ise märkama.

---

## 6. Stsenaarium 02 (P2): „Jalgrattur kooli ees“

Eesmärk: näidata demos, et süsteem ei ole ühe vestluse jaoks ette programmeeritud. **Ehitatakse alles siis, kui stsenaarium 01 töötab laitmatult.** Uus stsenaarium on ainult uus JSON ja klipid, koodi ei muudeta.

- **Lugu:** helistaja näeb kooli peavärava ees kukkunud jalgratturit. Teadvusel, tugev valu jalas. Aadressi ei ole: asukohta tuleb kirjeldada (kooli nimi, peavärav, tänav).
- **Seisundid:** `INTRO` (kukkumine üks kord), `S1` (istub maas, hoiab jalga), `S2` (muutub kahvatuks ja uimaseks, `requiresReport: true`), `END_GOOD`.
- **Mida see testib:** asukoha kirjeldamist ilma aadressita ja kõrvalseisja rolli.

---

## 7. Arhitektuur ja otsuste register

### 7.1 Skeem

```
 Brauser: /sim/[scenarioId]
 ┌─────────────────────────────────────────────────────────────────────┐
 │ Mikrofon ─► VoiceProvider ─► kõlar                                   │
 │               │ onSegment / onToolCall                               │
 │               ▼                                                      │
 │        useSimulation (orkestreerija)                                 │
 │          │                 │                    │                    │
 │          │ helistaja lause │ iga 500 ms         │ olek               │
 │          ▼                 ▼                    ▼                    │
 │   POST /api/extract   directorStep()     VideoStage, LiveTranscript, │
 │   → CallFacts         → DirectorAction[] AiBrainPanel                │
 │          │                 │                                         │
 │          │                 ├─ transition → VideoStage                │
 │          │                 ├─ wrap_up    → voice.sendCue()           │
 │          │                 └─ finish     → lõpuekraan                │
 │          ▼                                                           │
 │   POST /api/sessions → POST /api/analyze → /report/[sessionId]       │
 └─────────────────────────────────────────────────────────────────────┘
        │ ajutine võti                         │ service role
        ▼                                      ▼
  /api/realtime/session, /api/extract,  Supabase: call_sessions
  /api/analyze ─► OpenAI API
```

### 7.2 Otsuste register

| # | Otsus | Põhjus | Staatus |
|---|---|---|---|
| D-1 | Päästekorraldaja **ei tea tõde** | Realistlik; ei saa kogemata vastust ette öelda („kas aadress on Männikäbi 14?“) | kinnitatud |
| D-2 | Režissöör on **puhas deterministlik funktsioon**, üleminekud on stsenaariumi andmetes | Ennustatav, testitav, kiire; uus stsenaarium ilma koodita | kinnitatud |
| D-3 | **Punktid arvutab kood**, LLM annab tõendid ja tekstid | Korratav ja põhjendatav hindamine | kinnitatud |
| D-4 | Tõde ja võtmed **ainult serveris** | Turvalisus; brauser saab ainult ajutise Realtime'i võtme; kõik muud päringud käivad meie API marsruutide kaudu | kinnitatud |
| D-5 | Stsenaariumid on **repo JSON-failides**, mitte andmebaasis | Üks migratsioon, ei mingit SQL-i kopeerimist | kinnitatud |
| D-6 | Päris telefonivõrku ei ühendata | Lihtsam, odavam, välistab ühenduse päris 112-ga | kinnitatud |
| D-7 | Hääl: **OpenAI Realtime (WebRTC)** põhivalikuna, varuks kaskaad (brauseri kõnetuvastus → tekstimudel → TTS), tekstirežiim ja `mockVoice` | Üks ühendus, madal viivitus, tööriistakutsed; valik on peidetud `VoiceProvider` taha | **ootab hääletesti** |
| D-8 | Moodulid ehitavad funktsionaalsuse `components/ui` primitiividega; visuaalse lihvi teeb integraator | Tiimi kokkulepe; väldib stiilikonflikte | kinnitatud |
| D-9 | Klipid: filmitud või AI-genereeritud | vt 5.3 | **lahtine** |
| D-10 | Stsenaarium 01 on vanaema insult, 02 jalgrattur | 01-s on seisundimuutus, mis on toote tuum | kinnitatud |
| D-13 | Kõik LLM-kutsed käivad **OpenAI API** kaudu. Tekstimudelitel üks klient `src/lib/llm/openai.ts` (fetch, ilma SDK-ta; impordi `@/lib/llm`): `llmText`, `llmJson`, `llmStream`. Mudelid `OPENAI_FAST_MODEL` ja `OPENAI_SMART_MODEL` | Üks võti, üks arve, üks koht vigade käsitlemiseks; pakkuja vahetus puudutab ainult seda faili | kinnitatud |
| D-11 | **Repo on avalik** | Tasuta GitHubis saab haru lukustada ainult avalikus repos; tasuta Vercel ei avalda privaatsest repost teiste autorite commit'e | kinnitatud |
| D-12 | **Merge commit'id, ei rebase'i ega squash'i**; igaüks jääb oma harusse | Kõige vähem kohti, kus algaja või agent saab ajaloo sassi ajada; force-push'i pole kunagi vaja | kinnitatud |

---

## 8. Andmelepingud (`src/lib/types.ts`)

**Seda faili muudab ainult integraator.** Kõik moodulid impordivad tüübid siit ega loo paralleelseid.

```ts
/** Millisekundid kõne algusest (klikk „Helista 112“ = 0). */
export type CallMs = number;
export type TriState = 'yes' | 'no' | 'unknown';
export type Speaker = 'caller' | 'dispatcher';

// ───────── Stsenaarium ─────────
export interface SymptomDef { id: string; label: string; hints: string[] }

export interface ScenarioState {
  id: string;                                   // 'INTRO' | 'S1' | ... | 'END_GOOD'
  kind: 'intro' | 'loop' | 'ending';
  clipUrl?: string;
  posterUrl?: string;
  caption: string;
  observable: string[];                         // SymptomDef.id-d, mida selles seisundis näha on
  vitals: { conscious: 'yes' | 'no'; breathing: 'yes' | 'no' };
  requiresReport: boolean;                      // kas sellesse seisundisse jõudmisest peab teatama
  reportWindowMs?: number;                      // kohustuslik, kui requiresReport = true
}

export type Condition =
  | { type: 'call_elapsed'; ms: CallMs }               // kõne algusest on möödas ≥ ms
  | { type: 'change_unreported' }                      // from-seisundi reportWindowMs möödas ja teadet pole
  | { type: 'location_incomplete_after'; ms: CallMs }; // ms möödas ja asukoht pole 'complete'

export interface Transition { from: string; to: string; when: Condition[]; reason: string } // when = VÕI

export interface ScenarioRules {
  addressDeadlineMs: CallMs;
  arrivalAfterDispatchMs: number;   // varaseim lõpp pärast abi saatmist
  wrapUpGraceMs: number;            // kui päästekorraldaja ei lõpeta ise, lõpetame selle aja järel
  maxCallMs: CallMs;
  wrapUpCue: string;
}

export interface ScenarioTruth {
  patient: { name: string; age: number; sex: 'female' | 'male'; relation: string };
  address: { street: string; house: string; apartment?: string; settlement: string; municipality: string };
  condition: string;
  onsetNote?: string;
}

export interface Scenario {
  id: string; version: number; title: string; locale: 'et-EE';
  brief: { headline: string; known: string[]; envelope?: string[] };
  truth: ScenarioTruth;                         // AINULT serveris
  symptoms: SymptomDef[];
  states: ScenarioState[];
  transitions: Transition[];
  rules: ScenarioRules;
  dispatcherWhitelist: string[];
}
export type PublicScenario = Omit<Scenario, 'truth'>;

// ───────── Transkript ─────────
export interface TranscriptSegment {
  id: string; speaker: Speaker; text: string; startMs: CallMs; endMs: CallMs;
}

// ───────── Kohtuniku väljund ─────────
export interface CallFacts {
  incident: { said: boolean; atMs?: CallMs; quote?: string; volunteered?: boolean };
  location: {
    street?: string; house?: string; apartment?: string; settlement?: string; municipality?: string;
    level: 'none' | 'partial' | 'complete';     // complete = tänav + maja + (asula VÕI vald) vastab tõele
    partialAtMs?: CallMs; completeAtMs?: CallMs;
    wrongParts: ('street' | 'house' | 'settlement')[];
    volunteered?: boolean;                      // öeldi enne, kui päästekorraldaja küsis
  };
  patient: { ageSaid: boolean; conscious: TriState; breathing: TriState };
  symptomsReported: { symptom: string; atMs: CallMs; quote: string }[];
  changeReports: { stateId: string; atMs: CallMs; quote: string }[];
  dialogue: { questionsAsked: number; questionsAnswered: number; contradictions: number; offTopicTurns: number };
}

// ───────── Sündmused ─────────
export type CallEndReason = 'dispatcher_ended' | 'caller_hangup' | 'timeout' | 'error';

export type CallEvent =
  | { type: 'call_started'; atMs: 0 }
  | { type: 'state_changed'; atMs: CallMs; from: string; to: string; reason: string }
  | { type: 'ambulance_dispatched'; atMs: CallMs; priority: 'A' | 'B' | 'C'; address: string; summary: string }
  | { type: 'wrap_up_requested'; atMs: CallMs }
  | { type: 'call_ended'; atMs: CallMs; reason: CallEndReason };

export interface StateVisit { stateId: string; enteredAtMs: CallMs }

// ───────── Režissöör ─────────
export type Outcome = 'good' | 'delayed' | 'bad';

export interface DirectorInput {
  nowMs: CallMs;
  scenario: PublicScenario;
  stateId: string;
  stateEnteredAtMs: CallMs;
  facts: CallFacts;
  events: CallEvent[];
}

export type DirectorAction =
  | { type: 'transition'; to: string; reason: string }
  | { type: 'wrap_up'; cue: string }
  | { type: 'finish'; outcome: Outcome; endingText: string };

// ───────── Analüüs ─────────
export type RubricId = 'incident' | 'location' | 'patient' | 'change' | 'answers' | 'clarity' | 'ending';

export interface RubricItemResult {
  id: RubricId; label: string; maxPoints: number; points: number;
  why: string;                                  // koodi genereeritud lühipõhjendus
  evidence?: string;                            // tsitaat transkriptist (LLM leiab, kood kontrollib, et see on transkriptis olemas)
  atMs?: CallMs;
  notApplicable?: boolean;
}

export interface AnalysisReport {
  sessionId: string;
  score: number;                                // 0–100, rubric.points summa
  outcome: Outcome;
  times: { incidentMs?: CallMs; locationMs?: CallMs; changeReactionMs?: number; durationMs: CallMs };
  rubric: RubricItemResult[];
  missed: string[];                             // kuni 4 lühikest lauset
  tips: [string, string, string];
  whatWouldHaveHappened: string;
}

// ───────── Sessioon ─────────
export interface CallSession {
  id: string; scenarioId: string; scenarioVersion: number; createdAt: string;
  clientId?: string; groupCode?: string;        // anonüümne seadme id; klassi kood (õpetaja vaade, P2)
  durationMs: CallMs;
  transcript: TranscriptSegment[];
  events: CallEvent[];
  stateHistory: StateVisit[];
  finalFacts: CallFacts;
  analysis?: AnalysisReport;
}
```

Fixture'ide tüübid (`FixtureToolCall`, `TranscriptFixture`) on samuti `types.ts`-is: fixture on transkript ilma segmendi `id`-deta, tööriistakutsed ajaga (`atMs`) ja valikuline `expect` testide jaoks.

`src/lib/facts.ts` ekspordib `emptyFacts(): CallFacts` (kõik `false` / `'unknown'` / `'none'` / tühjad massiivid / nullid).

---

## 9. Moodulite spetsifikatsioonid

### 9.1 Hääl: `src/lib/voice/`

```ts
export interface VoiceEvents {
  onSegment(seg: TranscriptSegment): void;                 // lõplik lause
  onPartial?(speaker: Speaker, text: string): void;        // jooksev tekst UI jaoks
  onToolCall(call:
    | { name: 'dispatch_ambulance'; args: { priority: 'A' | 'B' | 'C'; address: string; summary: string } }
    | { name: 'end_call' }): void;
  onLevel?(speaker: Speaker, level: number): void;         // 0..1, helinivoo animatsiooniks
  onError(err: Error): void;
}

export interface VoiceProvider {
  start(opts: { scenarioId: string; now: () => CallMs }, ev: VoiceEvents): Promise<void>;
  /** Süsteemi märguanne päästekorraldajale (nt „kiirabi on kohal“). Käivitab uue vastuse. */
  sendCue(text: string): void;
  stop(): Promise<void>;
}
```

**Implementatsioonid ja varujärjekord:**

1. **`openaiRealtime.ts` (põhivalik).** Voog OpenAI ametliku WebRTC juhendi järgi:
   - Server (`/api/realtime/session`) teeb `POST https://api.openai.com/v1/realtime/client_secrets` päris võtmega ja sessiooni seadistusega (mudel, hääl, juhised, tööriistad, sisendi transkriptsioon, VAD) ning tagastab ajutise võtme (`value`).
   - Brauser loob `RTCPeerConnection`'i, lisab mikrofoni raja, avab andmekanali, teeb SDP pakkumise ja saadab selle `POST https://api.openai.com/v1/realtime/calls` ajutise võtmega (`Content-Type: application/sdp`). Vastus on SDP answer.
   - Andmekanali sündmustest teeb adapter meie `TranscriptSegment`-id ja tööriistakutsed. **Sündmuste ja seadistusväljade täpsed nimed võta dokumentatsioonist, ära kirjuta mälu järgi**: https://developers.openai.com/api/docs/guides/realtime-webrtc
   - Lülita sisse **helistaja kõne transkriptsioon keelega `et`** ja serveripoolne kõnetuvastus (VAD).
   - `sendCue`: lisa vestlusesse süsteemisõnum ja küsi uus vastus.
   - `startMs` võetakse hetkest, mil kõne algus tuvastati; `endMs` hetkest, mil lause lõppes. Helistaja transkript võib saabuda hiljem kui päästekorraldaja vastus: **sorteeri alati `startMs` järgi**.
   - Mudel ja hääl tulevad muutujatest `REALTIME_MODEL` (vaikimisi `gpt-realtime-2.1`, odavam `gpt-realtime-2.1-mini`) ja `REALTIME_VOICE` (vaikimisi `marin`). Karkassis on `/api/realtime/session` juba olemas minimaalse seadistusega; juhised, tööriistad ja transkriptsioon lisab Sander.
2. **`cascade.ts` (varu 1).** Kui Realtime'i eesti keel ei sobi. Kolm lüli:
   - **Kõnetuvastus brauseris:** Web Speech API (`webkitSpeechRecognition`, `lang = 'et-EE'`, `interimResults = true`). Töötab Chrome'is. Uuendus: Soniox (`SONIOX_API_KEY`).
   - **Päästekorraldaja aju:** `POST /api/voice/turn` `{ scenarioId, messages }` → NDJSON voog (`text` / `tool` / `done` / `error`). **Olemas karkassis:** kiire tekstimudel (`llmStream`), prompt `dispatcher.et.md`, tööriistad `dispatch_ambulance` ja `end_call`. Helistaja laused on `user`, päästekorraldaja laused `assistant`, märguanne on `user` sõnum, mis algab `[SÜSTEEM]`.
   - **Kõnesüntees:** `POST /api/voice/tts` `{ text }` → heli. Pakkuja valib Sander (TartuNLP, ElevenLabs või brauseri `speechSynthesis`). **API kuju võta pakkuja dokumentatsioonist.**
   - Sama marsruut `/api/voice/turn` teenindab ka **tekstirežiimi** (`sendCallerText`): helistaja trükib, päästekorraldaja vastab tekstina.
3. **`elevenlabs` (varu 2).** ElevenLabs Agents'i SDK; sama liides. Ainult siis, kui eelmised ei tööta.
4. **`mockVoice.ts` (kohustuslik, valmis karkassis).** Mängib fixture'i (`fixtures/transcripts/*.json`) õigete ajastustega ette, ilma mikrofoni ja API-ta. Nii saab iga moodul areneda häälest sõltumata ja laval on hädavaru.

Valik tehakse `NEXT_PUBLIC_VOICE_PROVIDER` järgi (`openai` | `cascade` | `elevenlabs` | `mock`) ja URL-i parameetriga `?voice=mock`. Arendusleht: `/dev/voice`.

**Tööriistad päästekorraldajale:**
- `dispatch_ambulance({ priority, address, summary })`: kutsutakse kohe, kui on teada, mis juhtus ja kus. `address` on aadress nii, nagu päästekorraldaja sellest aru sai.
- `end_call()`: lõpetab kõne.

**Valmis, kui:** eestikeelne kõne toimib mõlemas suunas; saab vahele rääkida; `onSegment` tuleb mõlema kõneleja kohta õigete aegadega; mõlemad tööriistad jõuavad `onToolCall`-i; `sendCue` paneb päästekorraldaja kõne lõpetama; mikrofoni keelamisel on arusaadav veateade.

### 9.2 Kohtunik: `src/lib/agents/extract.ts`, `/api/extract`

- **Käivitub** pärast iga helistaja lõplikku lauset (debounce 300 ms). Korraga üks päring; kui vahepeal tuli uus lause, tehakse kohe pärast veel üks päring värskeima transkriptiga.
- **Sisend:** `{ scenarioId, transcript, prevFacts, stateHistory }`. Server laeb stsenaariumi koos tõega.
- **Väljund:** täielik uus `CallFacts` (struktureeritud väljund, JSON Schema), mitte delta.
- **Koodi järelkontroll pärast LLM-i (kohustuslik):**
  - **Monotoonsus:** mis oli kord tõene (`incident.said`, `location.level`, sümptomid, teated), jääb tõeseks; ajad ei muutu hilisemaks. Funktsioon `mergeFacts(prev, next)`.
  - `atMs` peab vastama mõne helistaja segmendi `startMs`-ile; muidu võetakse lähim.
  - `quote` peab esinema transkriptis (tühikuid ja suurtähti arvestamata); muidu jäetakse ära.
- **Tõlgendamisreeglid (promptis):**
  - Faktid tulevad ainult **helistaja** lausetest. Erand: kui päästekorraldaja kordab aadressi ja helistaja kinnitab („jah“, „õige“), loetakse aadress päästekorraldaja sõnastuse järgi. See kaitseb kõnetuvastuse vigade eest.
  - Aadressi võrdlus on leebe: „Männikäbi 14“, „Männi käbi tee neliteist“ = tänav + maja. „Haabneeme“ või „Viimsi“ = asula/vald.
  - `changeReports` lisatakse, kui helistaja kirjeldab **pärast** seisundi algust sümptomit, mis on selle seisundi `observable` hulgas ja mida eelmistes seisundites ei olnud.
  - `volunteered = true`, kui info öeldi enne, kui päästekorraldaja seda küsis. **Küsimusele vastamine ei ole viga.**
- **Kiirus:** eesmärk alla 1,5 s. `OPENAI_FAST_MODEL` (`llmJson` failist `@/lib/llm`). **Range skeem:** igal objektil `additionalProperties: false` ja kõik väljad `required` hulgas; valikulised väljad (`atMs`, `quote` jne) kirjelda nullitavana ja eemalda `null`-id koodis. Kui aeglane, saada ainult viimased 12 segmenti + `prevFacts`.

**Valmis, kui:** kolm fixture'it annavad oodatud `CallFacts` väärtused (vt 11) ja `mergeFacts` testid läbivad.

### 9.3 Režissöör: `src/lib/director/`

Puhas funktsioon: ei kasuta võrku, `Date.now()`-i ega juhuslikkust. Orkestreerija kutsub seda iga 500 ms tagant ja pärast iga `CallFacts` uuendust või sündmust.

```ts
export function directorStep(i: DirectorInput): DirectorAction[] {
  const { nowMs, scenario, stateId, stateEnteredAtMs, facts, events } = i;
  const { rules } = scenario;
  const state = scenario.states.find(s => s.id === stateId)!;
  if (state.kind === 'ending') return [];

  const ended    = events.find(e => e.type === 'call_ended');
  const dispatch = events.find(e => e.type === 'ambulance_dispatched');
  const wrapUp   = events.find(e => e.type === 'wrap_up_requested');

  // 1) Lõpp
  if (ended || nowMs >= rules.maxCallMs || (wrapUp && nowMs - wrapUp.atMs >= rules.wrapUpGraceMs)) {
    const o = computeOutcome(facts, events, scenario, nowMs);
    return [{ type: 'finish', outcome: o.outcome, endingText: buildEndingText(o) }];
  }

  // 2) Seisundi üleminek (esimene sobiv võidab)
  const reported   = facts.changeReports.some(r => r.stateId === stateId);
  const windowOver = state.requiresReport && nowMs - stateEnteredAtMs >= (state.reportWindowMs ?? 0);
  const holds = (c: Condition) =>
    c.type === 'call_elapsed'              ? nowMs >= c.ms :
    c.type === 'change_unreported'         ? windowOver && !reported :
    /* location_incomplete_after */          nowMs >= c.ms && facts.location.level !== 'complete';
  for (const t of scenario.transitions) {
    if (t.from === stateId && t.when.some(holds)) return [{ type: 'transition', to: t.to, reason: t.reason }];
  }

  // 3) Kõne lõpetamise märguanne päästekorraldajale
  const windowOpen = state.requiresReport && !reported && !windowOver;
  if (dispatch && !wrapUp && !windowOpen && nowMs - dispatch.atMs >= rules.arrivalAfterDispatchMs) {
    return [{ type: 'wrap_up', cue: rules.wrapUpCue }];
  }
  return [];
}
```

**`outcome.ts`: `computeOutcome(facts, events, scenario, nowMs)`** (kasutavad nii režissöör kui hindamine):

| Tulemus | Tingimus |
|---|---|
| `bad` | abi ei saadetud **või** asukoht ei ole kõne lõpuks `complete` |
| `delayed` | abi saadeti ja asukoht on `complete`, aga vähemalt üks: (a) `requiresReport` seisundist ei teatatud selle akna sees; (b) `location.completeAtMs > addressDeadlineMs` |
| `good` | muul juhul |

Funktsioon tagastab ka põhjuste loendi (`reasons: ('no_dispatch' | 'location_incomplete' | 'change_unreported' | 'location_late')[]`).

**`endings.ts`: `buildEndingText(o)`** kasutab malle, mitte LLM-i. Toon on rahulik, surma ei mainita:
- `no_dispatch` → „Kõne katkes enne, kui abi jõuti välja saata.“
- `location_incomplete` → „Kiirabi sõitis välja, aga otsis õiget maja 7 minutit, sest aadress jäi poolikuks.“
- `change_unreported` → „Kiirabi jõudis kohale, aga ei teadnud, et seisund vahepeal halvenes, ja valmistus kergemaks juhtumiks.“
- `location_late` → „Abi jõudis kohale, aga aadressi selgitamisele kulus kaks minutit.“
- `good` → tekst puudub, mängib `END_GOOD` klipp.

Orkestreerija kohustused tegevuste peale: `transition` → lisa `state_changed` sündmus ja `StateVisit`; `wrap_up` → lisa `wrap_up_requested` ja kutsu `voice.sendCue(cue)`; `finish` → peata hääl, näita lõppu, salvesta.

**Valmis, kui:** `director.test.ts` läbib: hea kõne → `good`; asula puudu → `bad`; S2 teatamata → `S3` ja `delayed`; katkestus enne abi saatmist → `bad`; piirjuhud täpselt tähtaegadel; lõppseisundis ei tagastata midagi.

### 9.4 Videolava: `src/components/sim/VideoStage.tsx`

- Props: `states: ScenarioState[]`, `currentId: string`, `phase: 'intro' | 'call' | 'ended'`, `endingText?: string`, `showCaptions: boolean`, `onIntroEnd(): void`.
- **Kõik klipid laetakse ette**: iga seisundi jaoks üks `<video muted playsInline preload="auto">`, virnas üksteise peal. Aktiivne on `opacity: 1`, teised `0`. Üleminek on **500 ms läbipaistvuse sulandus**. `src`-i ei vahetata, sest see tekitab musta kaadri.
- `kind: 'intro'` ja `'ending'` mängivad ühe korra; `'loop'` kordub.
- Kui lõpul on `endingText`: must taust, tekst ilmub 1 sekundiga.
- Laadimisvea korral näidatakse `posterUrl`-i koos `caption`-iga.
- Klippide käivitamine toimub alles pärast kasutaja klikki („Alusta“).
- 16:9, mahub ära ka telefoni püstvaates (video üleval, kõne all).

### 9.5 Orkestreerija ja simulatsioonileht (integraator)

`src/lib/sim/useSimulation.ts` hoiab kogu kõne olekut ja ühendab moodulid:

```
faasid: idle → intro → ready → connecting → in_call → wrapping_up → ended → analyzing → (suunamine raportile)
```

- `in_call` alguses: `callStartedAt = performance.now()`, sündmus `call_started`, `stateId = 'S1'`.
- `onSegment` → lisa transkripti; kui kõneleja on helistaja → `/api/extract` → `facts`.
- `onToolCall('dispatch_ambulance')` → sündmus `ambulance_dispatched`. `onToolCall('end_call')` → `call_ended: dispatcher_ended`.
- Punane nupp → `call_ended: caller_hangup`. Ühenduse viga → `call_ended: error` ja pakkumine jätkata tekstirežiimis.
- Taimer 500 ms → `directorStep` → tegevuste täitmine (vt 9.3).
- Lõpus: `POST /api/sessions` → `POST /api/analyze` → `/report/[id]`. Analüüsi ajal näidatakse lõpuklippi või -teksti, mitte tühja laadimisekraani.

**Komponendid (`src/components/sim/`):** `ScenarioIntro`, `KnownCard` (mida sa tead + ümbrik), `CallButton`, `CallHud` (kõne kestus, helinivoo, katkestamise nupp), `LiveTranscript`, **`AiBrainPanel`**.

**`AiBrainPanel`** näitab reaalajas, mida süsteem kõnest aru on saanud. See on demo jaoks kõige tähtsam vaade, sest teeb AI töö nähtavaks:

```
Mis juhtus            ✅ 0:03  „vanaema räägib segaselt“
Asukoht               ⏳ tänav ja maja olemas, asula puudub
Teadvus / hingamine   ✅ / ⏳
Sümptomid             kõnehäire · segasus
Seisundi muutus       ⚠ muutus 0:45 → ootab teadet (0:12)
Abi                   ✅ välja saadetud 0:38 · „Männikäbi tee 14, Haabneeme“
```

Paneeli saab lülitada: demos sees, harjutamisel vaikimisi väljas (muidu on see spikker).

### 9.6 Hindamine ja analüütik: `src/lib/agents/scoring.ts`, `analyze.ts`, `/api/analyze`

**`scoring.ts` arvutab punktid koodis** sisenditest `finalFacts`, `events`, `stateHistory`, `scenario`:

| id | Silt | Max | Reegel |
|---|---|---|---|
| `incident` | Ütles, mis juhtus | 20 | ≤15 s → 20; ≤30 s → 15; hiljem → 10; ei öelnud → 0 |
| `location` | Täpne asukoht | 25 | `complete` → 15 + kiirus (≤30 s +10; ≤60 s +6; ≤120 s +3); ainult `partial` → 8; `none` → 0 |
| `patient` | Abivajaja seisund | 15 | teadvus teada 5 + hingamine teada 5 + sümptomid (≥2 erinevat → 5; 1 → 3) |
| `change` | Teatas muutusest | 15 | esimese `requiresReport` seisundi reaktsiooniaeg: ≤10 s → 15; akna sees → 11; hiljem → 5; ei teatanud → 0. Kui sellist seisundit ei tulnud: 15 ja `notApplicable` |
| `answers` | Vastas küsimustele | 10 | `round(10 × answered / asked)`; kui `asked = 0` → 10 |
| `clarity` | Selgus | 10 | `max(0, 10 − 3×contradictions − 2×offTopicTurns)` |
| `ending` | Jäi liinile kuni loani | 5 | `dispatcher_ended` → 5; katkestas pärast abi saatmist → 2; katkestas enne → 0 |

Reaktsiooniaeg = `changeReport.atMs − stateVisit.enteredAtMs`. Ajad loetakse `atMs` väärtustest, mitte LLM-i hinnangust.

**`analyze.ts` (LLM, `OPENAI_SMART_MODEL`, `llmJson`)** saab transkripti, sündmused, faktid ja **juba arvutatud punktid** ning kirjutab ainult: iga rea `evidence` (tsitaat), `missed`, `tips`, `whatWouldHaveHappened`. Kood kontrollib, et iga tsitaat on transkriptis olemas, ja kirjutab punktid üle oma arvutatud väärtustega.

Kui LLM ebaõnnestub, tagastatakse raport ilma tekstideta (punktid, ajad ja `why` on koodist). **Raport ei tohi kunagi LLM-i vea tõttu ära jääda.**

### 9.7 Raport: `/report/[sessionId]`

1. **Päis:** skoor (suur number), tulemus (`good` / `delayed` / `bad` eesti keeles), üks lause `whatWouldHaveHappened`.
2. **Kolm aega:** „Mis juhtus“ öeldud · Aadress täielik · Reaktsioon muutusele. Puuduv väärtus on „ei öelnud“, mitte 0.
3. **Ajajoon:** helistaja ja päästekorraldaja laused ajateljel, markerid seisundimuutuste ja abi saatmise kohta.
4. **Hindamistabel:** rida, punktid, põhjendus, tsitaat.
5. **Mis jäi ütlemata** ja **kolm soovitust**.
6. **Proovi uuesti.** Kui samal seadmel on varasem katse (`clientId`), näita võrdlust: skoor ja kolm aega enne → nüüd (P1).

### 9.8 Õpetaja vaade: `/teacher` (P2)

Õpilased sisestavad enne kõnet klassi koodi (`groupCode`). Õpetaja näeb: katsete arv, keskmine skoor, **kõige sagedamini kaotatud hindamisrida** („kümnest õpilasest kuus ei öelnud asulat“), keskmine aeg aadressini. Ainult koondandmed, nimesid ei koguta.

---

## 10. Promptid (täistekstid)

Failid: `src/lib/agents/prompts/*.et.md`. Muutujad on kujul `{{...}}`.

### 10.1 Päästekorraldaja (`dispatcher.et.md`)

```
Sa oled Eesti Häirekeskuse päästekorraldaja hädaabikõne TREENINGSIMULATSIOONIS. Räägi ainult eesti keeles.

ROLL
- Sa ei tea, mis juhtus ega kus. Tead ainult seda, mida helistaja sulle ütleb. Ära oleta ega paku vastuseid ette.
- Sinu eesmärk: saada kiiresti teada MIS juhtus ja KUS, hinnata abivajaja seisundit ja saata abi.

STIIL
- Rahulik, konkreetne, asjalik. Üks küsimus korraga. Kuni kaks lühikest lauset korraga.
- Ära korda küsimust, millele helistaja on juba vastanud, ka siis, kui ta vastas enne, kui küsisid.
- Kui helistaja on paanikas või räägib segaselt, rahusta ühe lausega ("Ma aitan teid. Vastake mu küsimustele.") ja küsi edasi.
- Kui helistaja vaikib üle viie sekundi: "Halloo, kas te kuulete mind?"
- Ära ütle, et oled tehisintellekt või et see on simulatsioon, kui helistaja otse ei küsi.

KÕNE KÄIK
1. Alusta täpselt nii: "Häirekeskus kuuleb, mis juhtus?"
2. Selgita välja asukoht: tänav, maja number, vajadusel korter. Kui asulat või linna ei öeldud, KÜSI SEDA ALATI.
3. Korda aadress üle ja küsi kinnitust: "Kordan: ... Kas õige?"
4. Küsi: kes on abivajaja ja kui vana; kas ta on teadvusel; kas ta hingab normaalselt; mis täpselt temaga toimub ja millal see algas.
5. Kohe, kui tead, mis juhtus ja kus, kutsu tööriist dispatch_ambulance ja ütle: "Kiirabi on teie poole teel."
6. Pärast seda anna juhiseid AINULT sellest loendist, oma sõnadega ja ükshaaval:
{{dispatcherWhitelist}}
   Ütle kindlasti: "Öelge mulle kohe, kui midagi muutub." Jää liinile.
7. Kui helistaja teatab muutusest: kinnita, et annad info kiirabile edasi, ja küsi uuesti teadvuse ja hingamise kohta.
8. ÄRA lõpeta kõnet ise. Lõpeta alles siis, kui saad sõnumi, mis algab "[SÜSTEEM]". Siis ütle üks lause ja kutsu end_call.

KEELATUD
- Diagnoosid ("tal on insult"), ravimisoovitused, elustamisjuhised ja kõik juhised, mida ülaltoodud loendis pole.
  Kui olukord nõuab enamat, ütle: "Kiirabi on kohe kohal, jääge liinile ja tema juurde."
- Pikad selgitused, loengud, nali.
- Stsenaariumi faktide väljamõtlemine.
```

### 10.2 Kohtunik (`extractor.et.md`)

```
Sa oled hädaabikõne treeningsimulatsiooni kohtunik. Sa ei räägi kellegagi, vaid täidad andmestruktuuri.

SISEND
1. TÕDE: stsenaariumi faktid (patsient, aadress), sümptomite sõnastik ja seisundite kirjeldused.
2. SEISUNDITE AJALUGU: mis seisund mis hetkel algas (millisekundid kõne algusest).
3. TRANSKRIPT: laused kõneleja ja ajatemplitega. "caller" on helistaja, "dispatcher" on päästekorraldaja.
4. EELMISED FAKTID: eelmine CallFacts.

ÜLESANNE
Tagasta uuendatud CallFacts JSON skeemi järgi.

REEGLID
- Loe faktiks ainult seda, mida HELISTAJA on öelnud. Päästekorraldaja küsimus ei ole fakt.
  Erand: kui päästekorraldaja kordab aadressi ja helistaja kinnitab seda, kasuta päästekorraldaja sõnastust.
- Transkript tuleb kõnetuvastusest ja sisaldab vigu. Ole leebe: sarnase kõlaga sõnad, kokku-lahku kirjutamine
  ja sõnadega öeldud numbrid loe õigeks ("Männi käbi tee neliteist" = Männikäbi tee 14).
- location.level: "complete", kui tänav JA majanumber JA (asula VÕI vald) vastavad tõele;
  "partial", kui osa on olemas; muidu "none". Vale osa pane wrongParts hulka.
- atMs on selle helistaja lause startMs, kus fakt ESIMEST korda öeldi.
- quote on sõna-sõnaline lõik transkriptist, kuni 12 sõna.
- symptomsReported: kasuta ainult sõnastiku id-sid. Iga sümptom üks kord.
- changeReports: lisa kirje seisundile S, kui helistaja kirjeldas PÄRAST S-i algust sümptomit,
  mis on S-i observable hulgas ja mida varasemates seisundites ei olnud.
- volunteered = true, kui helistaja ütles info enne, kui päästekorraldaja seda küsis.
- dialogue: questionsAsked = päästekorraldaja sisuliste küsimuste arv; questionsAnswered = neist asjakohase
  vastuse saanud; contradictions = helistaja vastuolud iseendaga; offTopicTurns = teemast mööda vastused.
- Ära kunagi muuda varem tõeseks märgitud fakti vääraks ega varasemat aega hilisemaks.
- Kui kahtled, jäta väli muutmata.
Tagasta ainult JSON.
```

### 10.3 Analüütik (`analyst.et.md`)

```
Sa oled sõbralik ja täpne hädaabikõne treener. Kirjutad tagasisidet õpilasele eesti keeles, sina-vormis.

SISEND: kõne transkript, sündmused, lõplikud faktid, tulemus (good/delayed/bad) ja hindamistabel,
mille punktid on JUBA ARVUTATUD. Ära muuda punkte ega vaidle nendega.

KIRJUTA
- rubric[].evidence: iga rea juurde üks sõna-sõnaline tsitaat helistaja jutust (kuni 12 sõna), kui selline on.
  Kui ei ole, jäta tühjaks. Ära mõtle tsitaate välja.
- missed: kuni 4 lühikest lauset selle kohta, mis jäi ütlemata või tuli alles küsimise peale liiga hilja.
  Küsimusele vastamine iseenesest ei ole viga.
- tips: täpselt 3 konkreetset soovitust, igaüks kuni 15 sõna, käskivas kõneviisis.
  Halb: "Ole täpsem." Hea: "Ütle aadress kohe koos asulaga: tänav, maja, linn."
- whatWouldHaveHappened: 1–2 rahulikku lauset selle kohta, mida see kõne päriselus tähendanuks.
  Ära maini surma, ära hirmuta, ära moraliseeri.

Kiida seda, mis õnnestus, ühe lausega. Tagasta ainult JSON skeemi järgi.
```

---

## 11. Fixture'id ja testid

Kaust `fixtures/transcripts/`. Kasutavad `mockVoice`, kohtuniku testid ja režissööri testid.

**Vorming:**

```json
{
  "id": "good_call",
  "scenarioId": "vanaema-insult",
  "segments": [
    { "speaker": "dispatcher", "startMs": 800,   "endMs": 2600,  "text": "Häirekeskus kuuleb, mis juhtus?" },
    { "speaker": "caller",     "startMs": 3000,  "endMs": 8500,  "text": "Tere, mu vanaema hakkas äkki segaselt rääkima, ta ei leia sõnu." },
    { "speaker": "dispatcher", "startMs": 9500,  "endMs": 11000, "text": "Mis aadressil te olete?" },
    { "speaker": "caller",     "startMs": 11500, "endMs": 15000, "text": "Männikäbi tee 14, Haabneeme, Viimsi vald." },
    { "speaker": "dispatcher", "startMs": 16000, "endMs": 18500, "text": "Kordan: Männikäbi tee 14, Haabneeme. Kas õige?" },
    { "speaker": "caller",     "startMs": 19000, "endMs": 19800, "text": "Jah, õige." },
    { "speaker": "dispatcher", "startMs": 20500, "endMs": 23000, "text": "Kui vana ta on ja kas ta on teadvusel?" },
    { "speaker": "caller",     "startMs": 23500, "endMs": 28000, "text": "Ta on 78, teadvusel, istub laua taga, aga jutt on täiesti segane." },
    { "speaker": "dispatcher", "startMs": 29000, "endMs": 30500, "text": "Kas ta hingab normaalselt?" },
    { "speaker": "caller",     "startMs": 31000, "endMs": 32000, "text": "Jah, hingab." },
    { "speaker": "dispatcher", "startMs": 33000, "endMs": 34500, "text": "Millal see algas?" },
    { "speaker": "caller",     "startMs": 35000, "endMs": 37000, "text": "Umbes viis minutit tagasi." },
    { "speaker": "dispatcher", "startMs": 38500, "endMs": 46000, "text": "Kiirabi on teie poole teel. Jääge tema juurde ja tehke välisuks lahti. Öelge mulle kohe, kui midagi muutub." },
    { "speaker": "caller",     "startMs": 52000, "endMs": 56500, "text": "Oodake, nüüd ta suunurk vajus viltu ja ta ei saa paremat kätt tõsta!" },
    { "speaker": "dispatcher", "startMs": 57000, "endMs": 60000, "text": "Selge, annan selle kiirabile edasi. Kas ta on endiselt teadvusel?" },
    { "speaker": "caller",     "startMs": 60500, "endMs": 61500, "text": "Jah, on." },
    { "speaker": "dispatcher", "startMs": 70000, "endMs": 73500, "text": "Kiirabi on kohal. Võite kõne lõpetada." }
  ],
  "toolCalls": [
    { "name": "dispatch_ambulance", "atMs": 38000, "args": { "priority": "A", "address": "Männikäbi tee 14, Haabneeme", "summary": "78-aastane naine, äkki tekkinud kõnehäire ja segasus" } },
    { "name": "end_call", "atMs": 74000 }
  ],
  "expect": {
    "states": ["S1", "S2"], "outcome": "good", "score": 100,
    "facts": { "incident.atMs": 3000, "location.level": "complete", "location.completeAtMs": 11500, "changeReports[0].atMs": 52000 }
  }
}
```

**Kohustuslikud fixture'id:**

| Fail | Mis juhtub | Ootus |
|---|---|---|
| `good_call.json` | kõik õigesti, muutusest teatatakse 7 s jooksul | `good`, skoor 100, seisundid S1→S2 |
| `missing_city.json` | ütleb ainult „Männikäbi tee 14“; küsimisele „mis linnas“ vastab „no siin samas“; ei täpsusta | `location.level = partial`, S2→S3 (120 s reegel), `bad`, `location` = 8 |
| `no_change_report.json` | algus korras, aga S2 ajal räägib muust | S2→S3, `delayed`, `change` = 0 või 5 |
| `early_hangup.json` | katkestab 20. sekundil | `bad`, `ending` = 0 |
| `stt_noise.json` | sama mis `good_call`, aga kõnetuvastuse vigadega („männi käbi tee neliteist haab neeme“) | kohtunik annab ikka `complete` |

**Testid (Vitest):** `director.test.ts`, `outcome.test.ts`, `scoring.test.ts`, `mergeFacts.test.ts` jooksevad ilma võrguta. `extract.live.test.ts` kasutab päris mudelit ja jookseb ainult käsuga `npm run test:live`.

---

## 12. Supabase

Kasutame ainult kõnesessioonide salvestamiseks. **Üks migratsioon, mille teeb integraator. Keegi teine migratsioone ei lisa**: kui vajad veergu, kirjuta integraatorile.

`supabase/migrations/0001_init.sql`:

```sql
create table if not exists public.call_sessions (
  id               uuid primary key default gen_random_uuid(),
  created_at       timestamptz not null default now(),
  scenario_id      text not null,
  scenario_version integer not null default 1,
  client_id        text,
  group_code       text,
  duration_ms      integer not null,
  transcript       jsonb not null,
  events           jsonb not null,
  state_history    jsonb not null,
  final_facts      jsonb not null,
  analysis         jsonb,
  score            integer,
  outcome          text check (outcome in ('good','delayed','bad'))
);

create index if not exists call_sessions_created_idx on public.call_sessions (created_at desc);
create index if not exists call_sessions_group_idx   on public.call_sessions (group_code, created_at desc);
create index if not exists call_sessions_client_idx  on public.call_sessions (client_id, created_at desc);

-- RLS on sees ja poliitikaid ei ole: brauser andmebaasi ei pääse.
-- Kõik päringud käivad API marsruutide kaudu service role võtmega.
alter table public.call_sessions enable row level security;
```

Helisalvestisi ei salvestata. Kui Supabase ei vasta, salvestatakse sessioon brauseri mällu ja raport töötab sellest (demo ei tohi andmebaasi taha jääda).

---

## 13. API marsruudid

| Marsruut | Meetod | Sisend | Väljund | Omanik |
|---|---|---|---|---|
| `/api/scenarios/[id]` | GET | — | `PublicScenario` | integraator |
| `/api/realtime/session` | POST | `{ scenarioId }` | `{ ephemeralKey, model }` | hääl |
| `/api/voice/turn` | POST | `{ scenarioId, messages }` | NDJSON voog (`text`, `tool`, `done`, `error`) | hääl |
| `/api/voice/tts` | POST | `{ text }` | heli | hääl |
| `/api/extract` | POST | `{ scenarioId, transcript, prevFacts, stateHistory }` | `{ facts: CallFacts }` | aju |
| `/api/sessions` | POST | `CallSession` ilma `id`-ta | `{ id }` | integraator |
| `/api/sessions/[id]` | GET | — | `CallSession` | integraator |
| `/api/analyze` | POST | `{ sessionId }` või terve `CallSession` | `AnalysisReport` | aju |
| `/api/teacher/[groupCode]` | GET | — | koondstatistika (P2) | integraator |

Reeglid: sisend valideeritakse (zod); viga on `{ error: string }` õige staatusega; **võtmed ja tõde ei lahku serverist**; LLM-i väljakutsetel on 8 s ajapiir ja üks kordus.

---

## 14. Kaustastruktuur

```
/
├─ CLAUDE.md
├─ KNOWLEDGE.md
├─ supabase/migrations/0001_init.sql
├─ fixtures/transcripts/*.json
├─ public/clips/vanaema/{intro,s1,s2,s3,end_good}.{mp4,jpg}
└─ src/
   ├─ app/
   │  ├─ page.tsx                          avaleht
   │  ├─ sim/[scenarioId]/page.tsx         simulatsioon
   │  ├─ report/[sessionId]/page.tsx       raport
   │  ├─ teacher/page.tsx                  (P2)
   │  └─ api/…                             vt peatükk 13
   ├─ components/
   │  ├─ ui/                               disainisüsteemi primitiivid (ainult integraator)
   │  ├─ sim/                              VideoStage, ScenarioIntro, KnownCard, CallButton, CallHud, LiveTranscript, AiBrainPanel
   │  └─ report/                           ScoreHeader, KeyTimes, Timeline, RubricTable, Tips, RetryCompare
   └─ lib/
      ├─ types.ts                          lepingud (ainult integraator)
      ├─ facts.ts                          emptyFacts(), mergeFacts()
      ├─ scenarios/                        index.ts (getScenario, getPublicScenario), *.json
      ├─ voice/                            VoiceProvider.ts, index.ts, openaiRealtime.ts, cascade.ts, mockVoice.ts
      ├─ llm/                              index.ts, openai.ts (ühine OpenAI klient, ainult integraator)
      ├─ director/                         director.ts, outcome.ts, endings.ts, *.test.ts
      ├─ agents/                           extract.ts, analyze.ts, scoring.ts, prompts/*.et.md + prompts/index.ts
      ├─ sim/                              useSimulation.ts
      └─ db/                               supabase.ts, sessions.ts
```

---

## 15. Töökorraldus: omanikud, Git, disainisüsteem

### 15.1 Omanikud

Tiimis on viis inimest: neli ehitavad toodet, üks (Otto) teeb pitchi ja sisu. **Iga fail kuulub täpselt ühele inimesele.** Sanderi ja Atsi rollid on minu soovitus: vahetage, kui oskused on teisiti, ja uuendage siis see tabel ning `CLAUDE.md`.

| Roll | Kes | Haru | Failid | Valmis, kui |
|---|---|---|---|---|
| **1. Integraator ja simulatsioon** | Rocco | `feat/sim` | karkass, `lib/types.ts`, `lib/facts.ts`, `lib/scenarios/**`, `lib/llm/**`, `components/ui/**`, `lib/sim/useSimulation.ts`, simulatsioonileht, `components/sim/` (v.a `VideoStage`, `ScenarioIntro`), `/api/scenarios`, `/api/sessions`, `lib/db/**`, `supabase/**`, Vercel, kõik merge'id | `good_call` mängib `mockVoice`-iga algusest raportini Verceli URL-il |
| **2. Hääl** | Sander | `feat/voice` | `lib/voice/**` (v.a `VoiceProvider.ts` ja `mockVoice.ts` karkassis), `/api/realtime/session`, `/api/voice/**`, `prompts/dispatcher.et.md` | vt 9.1. Lisaks: teeb hääletesti ja otsustab D-7 |
| **3. Aju** (kohtunik, režissöör, hindamine) | Ats | `feat/brain` | `lib/agents/**` (v.a `dispatcher.et.md`), `lib/director/**`, `/api/extract`, `/api/analyze`, `fixtures/**` | vt 9.2, 9.3, 9.6: viis fixture'it annavad oodatud tulemuse |
| **4. Lava ja raport** | Aaron | `feat/stage` | klipid (`public/clips/**`), `components/sim/VideoStage.tsx`, `ScenarioIntro.tsx`, `components/report/**`, raportileht | vt 9.4 ja 9.7: viis klippi laetud, sulandus töötab, fixture'i sessioonist tekib raport |
| **5. Pitch, sisu, testimine** | Otto | — (koodi ei kirjuta) | pitch ja slaidid, numbrid ja allikad, stsenaariumi tekstid (saadab Roccole), klippide filmimine koos Aaroniga, proovikasutajad, varuvideo | pitch 3 korda läbi harjutatud koos päris demoga; 5 inimest väljastpoolt tiimi on kõne ära teinud |

**Kes keda ootab (ja kuidas mitte oodata):**
- Kõik sõltuvad karkassist (Rocco, esimene asi).
- Aju ei oota häält: töötab fixture'itega.
- Raport ei oota aju: Aaron kasutab `fixtures/report/sample-session.json` näidist, mille Rocco paneb karkassi.
- Lava ei oota režissööri: `VideoStage` testitakse lehel `/dev/stage`, kus seisundit saab nupuga vahetada.
- Hääl ei oota kedagi: testleht `/dev/voice` näitab ainult transkripti ja tööriistakutseid.
- Otto ei oota kedagi: pitchi struktuur ja numbrid on peatükis 20 ja 3.4; demo ekraanipildid tulevad Verceli eelvaatest, kui need valmivad.

**Otto ülesanded, mis kellelegi teisele ei jää:**
- Reedel avamisel kirjutab üles täpsed hindamiskategooriad ja pitchi pikkuse ning saadab Roccole (läheb peatükki 2).
- Kontrollib kaardilt, et aadressi „Männikäbi tee 14, Haabneeme“ ei ole; kui on, pakub uue.
- Näitab päästekorraldaja juhiste loendit (`dispatcherWhitelist`) mentorile, kellel on esmaabi taust.
- Kirjutab lõpptekstid ja stsenaariumikaardi tekstid läbi (eesti keel peab olema laitmatu) ja saadab parandused Roccole.
- Organiseerib proovikasutajad ja paneb nende komistuskohad kirja ühte GitHubi issue'sse.
- Salvestab laupäeval kell 11:00 ja 16:00 varuvideo.

**Laupäeval:** kõik neli ehitajat parandavad vigu oma moodulis. Kes valmis saab, testib päris kõnesid ja kirjutab vead issue'na üles. Otto tegeleb ainult pitchiga.

### 15.2 Git

Ehitajate samm-sammuline juhend on `CONTRIBUTING.md`, integraatori oma `ROCCO.md`.

- **Repo on avalik** (D-11). Võtmed ei satu kunagi reposse.
- `main` on lukus ja alati töökorras. Vercel avaldab `main`-i automaatselt; iga PR saab eelvaate URL-i.
- **Neli haru, üks inimese kohta:** `feat/sim`, `feat/voice`, `feat/brain`, `feat/stage`. Igaüks töötab kogu aeg samas harus.
- **Igaüks muudab ainult oma faile** (15.1). Ühiseid faile (`lib/types.ts`, `lib/facts.ts`, `lib/scenarios/**`, `components/ui/**`, `package.json`, lukufail, `supabase/**`, `.github/**`, `CLAUDE.md`, `KNOWLEDGE.md`) muudab ainult integraator.
- **Tööring:** `git pull origin main` → töö → `npm run typecheck && npm run test && npm run lint` → `git add <oma failid>` → `git commit` → `git push` → PR. Vähemalt iga 60–90 minuti tagant.
- **Merge'ib ainult integraator**, tavalise merge commit'iga (D-12). PR-i kirjeldus: üks lause, mis muutus, ja kuidas seda proovida.
- **Keelatud kõigile, ka agentidele:** push otse `main`-i, `git push --force`, `git rebase`, `git reset --hard`, `git add -A` (lisab kogemata võõraid faile), `.env*` failide commit'imine.
- Konflikti lahendab PR-i autor oma harus. Uue sõltuvuse või ühise faili muudatuse jaoks küsi integraatorilt.
- CI (`.github/workflows/ci.yml`) jooksutab igal PR-il typecheck'i, testid ja linti.

### 15.3 Disainisüsteem

- Scaffold toob disainisüsteemi repost (link: ________) `src/components/ui/` alla tokenid ja primitiivid: `Button`, `Card`, `Badge`, `Panel`, `Stack`, `Heading`, `Text`, `Progress`.
- **Moodulid ehitavad funktsionaalsuse nende primitiividega** ega tegele välimusega. Kõvakodeeritud värve ja fonte ei kasutata. Visuaalse lihvi teeb integraator ühes korras, kui funktsionaalsus on koos.
- **Toon:** tõsine ja rahulik. Tume taust, üks punane aktsentvärv (helistamise nupp, hoiatused), suur kiri, mis on loetav saali tagaosast. Animatsioonid (motion.dev) ainult seal, kus need aitavad aru saada: seisundi sulandus, kontrollnimekirja rea täitumine, skoori ilmumine.
- Kõik kasutajale nähtav tekst on eesti keeles. Kood, muutujad ja commitid inglise keeles.

---

## 16. Keskkonnamuutujad

Verceli projektis (Production + Preview) ja kohalikus `.env.local`-is. **Mitte kunagi repos.**

```
OPENAI_API_KEY=                       # platform.openai.com, ainult serveris
OPENAI_FAST_MODEL=gpt-6.1-terra       # kohtunik ja kaskaadi päästekorraldaja (odavam: gpt-6-luna)
OPENAI_SMART_MODEL=gpt-6.1-sol        # analüütik
OPENAI_FAST_REASONING_EFFORT=         # valikuline, nt low
REALTIME_MODEL=gpt-realtime-2.1       # häälkõne (odavam: gpt-realtime-2.1-mini)
REALTIME_VOICE=marin                  # vali hääletestis
NEXT_PUBLIC_VOICE_PROVIDER=mock       # openai | cascade | elevenlabs | mock
TTS_PROVIDER=browser                  # ainult kaskaadile: tartunlp | elevenlabs | browser
TARTUNLP_SPEAKER=
ELEVENLABS_API_KEY=
ELEVENLABS_VOICE_ID=
SONIOX_API_KEY=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=            # ainult serveris
```

Ainus `NEXT_PUBLIC_` muutuja on häälepakkuja valik. Ükski saladus ei kanna seda eesliidet.

---

## 17. Prioriteedid ja verstapostid

### 17.1 Prioriteedid

| Tase | Mis | Millal peab olemas olema |
|---|---|---|
| **P0** | Eestikeelne häälkõne · transkript · kohtunik · hindamine koodis · raport · stsenaarium 01 varupiltidega · töötab Verceli URL-il · `mockVoice` | reede öösel |
| **P1** | Videolava (intro + seisundid + sulandus) · režissööri üleminekud ja kõne lõpetamine · lõpud · `AiBrainPanel` · salvestamine Supabase'i · korduskatse võrdlus · visuaalne lihv · varu-häälepakkuja | laupäeval 11:00 |
| **P2** | Stsenaarium 02 · õpetaja vaade · raskusaste (vihjed) · transkripti parandamine raportis · vene/inglise keel | ainult siis, kui P0 ja P1 on laitmatud |

**Reegel:** uut P2 asja ei alustata enne, kui kolm järjestikust päris häälega kõnet on läinud algusest raportini ilma veata.

### 17.2 Verstapostid

| Millal | Mis peab tõsi olema |
|---|---|
| Enne üritust | Hääletest tehtud ja D-7 otsustatud · võtmed, Verceli ja Supabase'i projekt olemas · repo loodud, kõik sees · klippide allikas otsustatud (D-9) |
| Reede 22:00 | Scaffold `main`-is ja avaldatud · `good_call` mängib `mockVoice`-iga raportini · iga moodul on oma harus alustatud |
| Reede öö | P0 valmis: päris häälega kõne annab raporti |
| Laupäev 10:30 | P1 valmis ja ühendatud |
| **Laupäev 11:00** | **Kolm täiskõnet tehtud (hea, asula puudu, muutusest teatamata). Varuvideo salvestatud kahte kohta.** |
| Laupäev 13:45–15:45 | Lihv, pitch, proovid. Ainult vigade parandamine, uusi funktsioone ei lisata |
| **Laupäev 15:45** | **Koodi külmutamine** |
| Laupäev 16:00 | Proov laval: heli, mikrofon, ekraan, võrk |

---

## 18. Riskid ja varuplaanid

| Risk | Varuplaan |
|---|---|
| Eestikeelne Realtime kõlab halvasti või saab aadressist valesti aru | Päästekorraldaja kordab aadressi üle; kohtunik on leebe; varupakkuja (kaskaad, ElevenLabs, tekstirežiim) sama liidese taga |
| Saali müra | Mikrofoniga kõrvaklapid; „vajuta ja räägi“ režiim |
| Saali Wi-Fi | Telefoni kuumkoht; varuvideo |
| Kohtunik on aeglane | Kiirem mudel; lühem kontekst; paneel uueneb hilinemisega, aga režissööri taimerid ei oota |
| Päästekorraldaja ei lõpeta kõnet | `wrapUpGraceMs` järel lõpetab režissöör ise |
| Päästekorraldaja annab lubamatu juhise | Valge nimekiri promptis; proovikõnedes kontrollida; lubamatut juhist nähes karmistada prompti |
| Video ei laadi | Varupildid koos allkirjaga |
| LLM-i viga analüüsis | Raport tuleb ilma tekstideta, punktid koodist |
| Supabase maas | Sessioon brauseri mälus, raport töötab |
| Kõik läheb laval katki | `?voice=mock` tekstirežiim, siis varuvideo. Pitch jätkub |
| API krediit otsas | Saldo kontroll reede õhtul ja laupäeva hommikul |

---

## 19. Valmisoleku kriteeriumid

- [ ] `npm run typecheck && npm run test && npm run lint` on roheline.
- [ ] Kõik viis fixture'it annavad oodatud tulemuse.
- [ ] Päris häälega: „mis juhtus“ ilmub paneelile alla 2 s pärast lause lõppu.
- [ ] Seisundi sulandus on sujuv, ilma musta kaadrita.
- [ ] Raport avaneb alla 8 s pärast kõne lõppu.
- [ ] Kogu voog töötab Verceli tootmis-URL-il **kohapealses arvutis** ja telefonis.
- [ ] Viis inimest väljastpoolt tiimi on kõne ära teinud; nende komistuskohad on parandatud.
- [ ] Igal lehel on märge „Treeningsimulatsioon. Päris hädaolukorras helista 112.“
- [ ] Varuvideo on olemas kahes kohas.

---

## 20. Demo ja pitch

### 20.1 Demo (umbes 2 minutit)
1. **Žüriiliige teeb kõne ise.** Tiimiliige ütleb enne ühe lause: „Te olete vanaema juures külas. Vaadake ekraani ja helistage.“
2. Saal näeb videot, live-transkripti ja **AI aju paneeli**, mis täitub reaalajas.
3. Umbes 45. sekundil **olukord muutub**. Kas ta märkab?
4. Kõne lõpp ja **raport**: skoor, aeg aadressini, tsitaadid.
5. Kui aega on: sama kõne teistmoodi (aadress ilma asulata) → teine lõpp. See näitab, et midagi ei ole ette kirjutatud.

Varuks: tiimiliige teeb kõne ise; siis `mock`-režiim; siis video.

### 20.2 Pitchi ülesehitus (täpsustub töötoas)
1. **Konks:** „Kes on kunagi 112-le helistanud? Kes on seda enne harjutanud?“
2. **Probleem:** miljon kõnet aastas; tüüpiline viga on poolik aadress; insuldi puhul loeb iga minut.
3. **Lahendus** ühe lausega (vt 3.3).
4. **Demo.**
5. **Kuidas see töötab** (üks slaid): kolm AI rolli ja deterministlik režissöör. Miks nii: AI räägib ja saab aru, aga stsenaarium ja punktid on kontrolli all.
6. **Jätkusuutlikkus:** ühe kõne kulu (mõõda oma proovikõnedest OpenAI kasutuslehelt: Realtime'i heli + kohtuniku ja analüütiku tokenid) ja kes maksab (koolid, esmaabikoolitajad, autokoolid; litsents klassi või kõnepaki kaupa).
7. **Edasi:** rohkem stsenaariume, õpetaja vaade, vene keel, sisu valideerimine koos Häirekeskuse ja esmaabikoolitajatega.

### 20.3 Vastused küsimustele
- **„Kas see on olemas?“** Norras arendatakse sarnast (CallerSim). Eesti keeles ja Eesti oludele ei ole. Meie lisame muutuva stseeni ja läbipaistva hindamise.
- **„Kuidas te teate, et hindamine on õige?“** Punktid arvutab kood avalike reeglite järgi, mis lähtuvad Häirekeskuse soovitustest. Iga punkt on seotud tsitaadiga. Sisu tuleb enne päriskasutust ekspertidega valideerida ja me ütleme seda ise.
- **„Kas see jäljendab päris Häirekeskuse protokolli?“** Ei. See järgib avalikke soovitusi helistajale. Sisemisi protokolle me ei tea ega väida end jäljendavat.
- **„Kas AI võib anda valesid juhiseid?“** Päästekorraldaja tohib anda juhiseid ainult ette antud loendist; diagnoosid ja ravijuhised on keelatud.
- **„Andmed?“** Heli ei salvestata. Salvestame transkripti ja tulemuse ilma nimeta.

---

## 21. Ohutus, eetika, privaatsus

- Igal lehel on nähtav märge: **„Treeningsimulatsioon. Päris hädaolukorras helista 112.“**
- Rakendus **ei helista kunagi päris numbrile**. Nupp „Helista 112“ ei ole `tel:` link.
- Päästekorraldaja ei pane diagnoose ega anna ravijuhiseid; juhised tulevad ainult stsenaariumi valgest nimekirjast. **Enne päriskasutust peab esmaabikoolitaja selle loendi üle vaatama.**
- Halb lõpp ei näita surma ega graafilist sisu.
- Nimesid, e-posti ega heli ei koguta. `clientId` on juhuslik seadme tunnus. Kasutajad võivad olla alaealised.
- Klippides on nõusoleku andnud inimesed. Aadressid on väljamõeldud.
- Me ei väida, et tegu on Häirekeskuse ametliku tootega ega kasuta nende sümboolikat.

---

## 22. Avatud küsimused

| # | Küsimus | Vastutaja |
|---|---|---|
| 1 | **Kas koodi ja klippe tohib enne üritust valmis teha?** Korraldaja ütles, et valmis idee on okei; koodi kohta vastust ei ole. Küsi kohapeal enne, kui varem tehtud tööd näitad. | Rocco |
| 2 | Hääletesti tulemus ja häälepakkuja lõplik valik (D-7) | Sander |
| 3 | Klippide allikas (D-9) | Aaron + Otto |
| 4 | Täpsed hindamiskategooriad ja pitchi pikkus (öeldakse reedel) → lisa peatükki 2 | Otto |
| 5 | Kas kohapeal tohib kasutada oma sülearvuteid; kas saali arvutitel on mikrofon | Rocco |
| 6 | Disainisüsteemi repo link | ________ |
| 7 | Kas aadress „Männikäbi tee 14, Haabneeme“ on päriselt olemas (kui on, vaheta) | Otto |
| 8 | Valge nimekirja juhiste ülevaatus mentoriga, kellel on esmaabi taust | Otto |
| 9 | Sanderi ja Atsi rollide kinnitamine (15.1) | Rocco |

---

## 23. Agentide käivituspromptid

### 23.1 Scaffold (integraator, esimene prompt)

> **Staatus:** karkass on tehtud (PR `feat/sim` → `main`). Allolev prompt jääb alles juhuks, kui midagi tuleb uuesti luua.

```
Loe läbi KNOWLEDGE.md ja CLAUDE.md. Loo projekti karkass täpselt nende järgi.

1. Next.js (App Router) + TypeScript + Tailwind + Vitest + zod. Skriptid: dev, build, test, test:live, typecheck, lint.
2. Loo peatüki 14 kaustastruktuur.
3. src/lib/types.ts: kopeeri peatüki 8 tüübid sõna-sõnalt.
4. src/lib/facts.ts: emptyFacts() ja mergeFacts(prev, next) peatüki 9.2 monotoonsusreeglitega + testid.
5. src/lib/scenarios/vanaema-insult.json peatükist 5.2; index.ts funktsioonidega getScenario (server) ja
   getPublicScenario (ilma truth-ita). /api/scenarios/[id].
6. fixtures/transcripts/good_call.json peatükist 11.
7. src/lib/voice/VoiceProvider.ts (liides) ja mockVoice.ts (fixture'i mängimine ajastustega + tekstirežiimi koht).
8. src/components/ui/: Button, Card, Badge, Panel, Stack, Heading, Text, Progress disainisüsteemi tokenitega.
9. Lehed /, /sim/[scenarioId], /report/[sessionId] kohatäitjatena. Igal lehel püsimärge:
   "Treeningsimulatsioon. Päris hädaolukorras helista 112."
10. supabase/migrations/0001_init.sql peatükist 12. .env.example peatükist 16.
11. Ülejäänud moodulitesse tühjad failid õigete eksportidega ja TODO-viitega KNOWLEDGE.md alapeatükile,
    et teised saaksid kohe oma harus alustada ilma ühiseid faile puutumata.
12. Arenduslehed, et moodulid ei peaks üksteist ootama: /dev/voice (ainult transkript ja tööriistakutsed),
    /dev/stage (VideoStage + nupud seisundi vahetamiseks), /dev/report (raport failist
    fixtures/report/sample-session.json). Loo see näidisfail käsitsi: CallSession koos AnalysisReport-iga
    good_call.json põhjal (tulemus "good", skoor 100, kõik hindamisread täidetud).
13. .github/workflows/ci.yml: igal pull requestil npm ci, typecheck, test, lint (töö nimi "ci").
    .github/pull_request_template.md: "Mis muutus (üks lause)", "Kuidas proovida", "Muutsin ainult oma faile: jah/ei".
    .gitignore peab sisaldama .env* (v.a .env.example). AGENTS.md sama sisuga mis CLAUDE.md.

Ära ehita teiste moodulite sisu. Lõpuks jooksuta typecheck, test ja lint ning paranda vead.
```

### 23.2 Moodulid (mall)

```
Loe läbi KNOWLEDGE.md peatükid 1–8 ja alapeatükk {{9.x}} ning CLAUDE.md.
Sinu moodul: {{mooduli nimi}}. Sinu failid: {{failid peatükist 15.1}}.

Ehita moodul täpselt spetsifikatsiooni järgi. Kasuta ainult src/lib/types.ts tüüpe.
Ära muuda ühtegi faili väljaspool oma loendit. Kui leping ei sobi või midagi on puudu, peatu ja ütle mulle.
Moodul peab töötama mockVoice'i ja fixture'itega ilma teiste mooduliteta.
Valmis on siis, kui alapeatüki "Valmis, kui" tingimused on täidetud ja typecheck, test ning lint on rohelised.
```

Mooduliti: **hääl** (`feat/voice`) → 9.1 ja 10.1 · **aju** (`feat/brain`) → 9.2, 9.3, 9.6, 10.2, 10.3, 11 · **lava ja raport** (`feat/stage`) → 5.3, 9.4, 9.7 · **integraator** (`feat/sim`) → 9.5, 12, 13.

Lisa iga mooduli prompti lõppu Git'i reeglid:

```
Git: tööta ainult harus {{haru}}. Ära kunagi kirjuta main-i. Ära kasuta push --force, rebase, reset --hard ega
git add -A. Lisa commit'i ainult minu mooduli failid nimepidi. Ära commit'i ühtegi .env faili.
Enne commit'i jooksuta typecheck, test ja lint.
```

---

## 24. Allikad

- Häkatoni plakat ja ajakava: https://www.viimsihuvikoolid.ee/wp-content/uploads/2026/10/AI-Hakatoni-poster.png
- ERR, 112 kõnede arv ja tervisemurede osakaal: https://www.err.ee/909525/uha-enam-numbrile-112-helistajaid-soovib-abi-metsloomale
- ERR, kõne avalause „Häirekeskus kuuleb, mis juhtus?“: https://www.err.ee/1609036124/ministeerium-tahab-karistada-hairekeskuse-too-takistajaid
- Postimees, päästekorraldajate kogemus ja Häirekeskuse soovitused: https://www.postimees.ee/593418/valjasoiduni-viib-iga-kolmas-hadaabikone
- 112.ee, elanikkonna rahulolu uuring 2019 (Emor): https://www.112.ee/files/2021-09/elanikkonna-rahuolu-uuringu-aruanne-2019.pdf
- Kliinikum, insuldi patsiendijuhend: https://www.kliinikum.ee/wp-content/uploads/2021/02/kliinikum_insult_web.pdf
- Postimees, insuldi ajaaken: https://www.postimees.ee/6807301/insuldi-korral-tegutse-kiiresti
- CallerSim (Helse Stavanger): https://www.helse-stavanger.no/en/research-education/resources-and-networks/rakos/oversikt-over-prosjekter/callersim/
- CallerSimi partnerid: https://www.helse-stavanger.no/en/research-education/resources-and-networks/rakos/the-regional-centre-for-emergency-medical-research-and-development-rakos/start-up-callersim/
- Sklls AMK Simulator: https://www.helse-stavanger.no/en/research-education/resources-and-networks/rakos/prosjekter/amk-simulator/
- Sim911: https://arxiv.org/pdf/2412.16844
- OpenAI Realtime API, WebRTC juhend: https://developers.openai.com/api/docs/guides/realtime-webrtc
- OpenAI Chat Completions (tekstimudelid, voog, tööriistad): https://developers.openai.com/api/reference/resources/chat/subresources/completions/methods/create
- OpenAI struktureeritud väljund: https://developers.openai.com/api/docs/guides/structured-outputs
- OpenAI hinnad ja mudelid: https://developers.openai.com/api/docs/pricing
- Web Speech API (SpeechRecognition): https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition
- ElevenLabs Agents'i keeled: https://help.elevenlabs.io/hc/en-us/articles/29298127196945
- Soniox, eesti keele võrdlus (tootja enda andmed): https://soniox.com/compare-stt/soniox-vs-openai/estonian
