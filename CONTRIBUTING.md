# Kuidas me koos töötame (Sander, Ats, Aaron, Rocco)

See on samm-sammuline juhend. Kui sa pole kunagi teistega samas repos töötanud, tee täpselt nii, nagu siin kirjas.

**Põhimõte:** igaühel on oma haru ja oma failid. Keegi ei kirjuta otse `main`-i. Rocco võtab sinu töö `main`-i vastu (merge), ja `main` läheb automaatselt Vercelisse üles.

| Kes | Haru | Mida ehitab | Loe `KNOWLEDGE.md`-st |
|---|---|---|---|
| Rocco | `feat/sim` | karkass, kõne orkestreerimine, „AI aju“ paneel, andmebaas, merge'id | 9.5, 12, 13 |
| Sander | `feat/voice` | eestikeelne häälkõne, päästekorraldaja prompt | 9.1, 10.1 |
| Ats | `feat/brain` | kohtunik, režissöör, hindamine, fixture'id | 9.2, 9.3, 9.6, 10.2, 10.3, 11 |
| Aaron | `feat/stage` | klipid, videolava, raportileht | 5.3, 9.4, 9.7 |
| Otto | — | pitch, sisu, proovikasutajad (koodi ei kirjuta) | 3, 20 |

---

## 1. Üks kord alguses (10 minutit)

1. **Võta GitHubi kutse vastu.** Tuleb e-postiga, või ava https://github.com/notifications. Ilma selleta ei saa sa push'ida.
2. **Kontrolli, et Git ja Node on olemas:**
   ```bash
   git --version          # peab vastama midagi nagu "git version 2.x"
   node --version         # peab olema v20 või uuem
   ```
3. **Ütle Gitile, kes sa oled** (sama e-post, mis su GitHubi kontol):
   ```bash
   git config --global user.name "Sinu Nimi"
   git config --global user.email "sinu@email.ee"
   ```
4. **Too repo oma arvutisse:**
   ```bash
   git clone https://github.com/vaksrocco-cmd/112sim.git
   cd 112sim
   ```
5. **Mine oma harusse** (haru on juba olemas, Rocco tegi selle):
   ```bash
   git checkout feat/SINU-HARU          # feat/voice, feat/brain või feat/stage
   git branch --show-current            # kontrolli: peab näitama sinu haru nime
   ```
6. **Võtmed:** Rocco saadab sulle privaatsõnumiga faili `.env.local` sisu. Loo projekti juurkausta fail `.env.local` ja kleebi sisu sinna. **See fail ei lähe kunagi GitHubi** (`.gitignore` hoiab selle eemal).
7. **Kui karkass on olemas** (Rocco ütleb), siis:
   ```bash
   git pull origin main
   npm install
   npm run dev                          # ava http://localhost:3000
   ```

## 2. Käivita oma agent

Ava `112sim` kaust oma agendiga (Claude Code, Cursor vms). Agent loeb `CLAUDE.md` (või `AGENTS.md`) ise. Anna talle esimese sõnumina:

```
Loe läbi KNOWLEDGE.md peatükid 1–8 ja alapeatükid <SINU PEATÜKID ülaltoodud tabelist> ning CLAUDE.md.
Minu moodul: <hääl | aju | lava ja raport>. Minu haru: <feat/...>. Minu failid on CLAUDE.md tabelis.

Ehita moodul täpselt spetsifikatsiooni järgi. Kasuta ainult src/lib/types.ts tüüpe.
Ära muuda ühtegi faili väljaspool minu loendit. Kui leping ei sobi või midagi on puudu, peatu ja ütle mulle.
Moodul peab töötama mockVoice'i ja fixture'itega ilma teiste mooduliteta.
Valmis on siis, kui alapeatüki "Valmis, kui" tingimused on täidetud ja typecheck, test ning lint on rohelised.

Git: tööta ainult harus <feat/...>. Ära kunagi kirjuta main-i. Ära kasuta push --force, rebase,
reset --hard ega git add -A. Enne commit'i näita mulle git status ja oota minu luba.
```

## 3. Tööring (korda iga 60–90 minuti tagant)

Kui midagi töötab (isegi väike osa), saada see Roccole. Väikesed sagedased PR-id = vähe konflikte.

```bash
# 1) Too teiste värske töö oma harusse
git pull origin main

# 2) Kontrolli, et kõik on roheline
npm run typecheck && npm run test && npm run lint

# 3) Vaata, mis muutus
git status

# 4) Lisa AINULT oma failid, nimepidi (mitte "git add ." ega "git add -A")
git add src/lib/voice/cascade.ts src/app/api/voice/turn/route.ts

# 5) Salvesta ja saada GitHubi
git commit -m "Add cascade voice provider"
git push origin feat/SINU-HARU
```

**6) Tee PR:** ava https://github.com/vaksrocco-cmd/112sim. Üleval on kollane riba **Compare & pull request** → vajuta. Kontrolli, et üleval on `base: main` ← `compare: feat/SINU-HARU`. Täida mall (mis muutus, kuidas proovida) → **Create pull request**.

**7) Kirjuta grupivestlusse:** „PR on üleval: <link>“.

**8) Pärast merge'i** jätka **samas harus**. Järgmine tööring algab jälle sammust 1.

Kui sa push'id hiljem samasse harusse uusi commit'e, lähevad need automaatselt samasse lahtisesse PR-i. Uut PR-i pole vaja.

## 4. Kui midagi läheb valesti

| Mida näed | Mida teha |
|---|---|
| `git pull` ütleb **CONFLICT** sinu failis | Ava fail, otsi `<<<<<<<` ja `>>>>>>>` märke, jäta õige versioon, kustuta märgid. Siis `git add <fail>` ja `git commit -m "Merge main"`. Või palu agendil seda teha **ainult selles failis** |
| `git pull` ütleb **CONFLICT** kellegi teise failis | Ära lahenda. Kirjuta Roccole |
| `git push` ütleb **rejected** | Tee `git pull origin main` ja proovi uuesti. **Ära kasuta `--force`** |
| `git push` ütleb **permission denied** / 403 | Sa pole kutset vastu võtnud. Vaata samm 1.1 |
| Sa oled kogemata `main` harus | `git branch --show-current` näitab `main`. Kui sa pole veel commit'inud: `git checkout feat/SINU-HARU` (muudatused tulevad kaasa). Kui oled commit'inud: kirjuta Roccole |
| Vajad muudatust failis, mis ei ole sinu oma (`types.ts`, `package.json`, `components/ui/`…) | Kirjuta Roccole täpselt, mida vajad. Ta teeb selle ja ütleb, millal `git pull origin main` teha |
| Agent tahab paigaldada uue paketi | Ütle ei ja küsi Roccolt |
| Agent pakub `--force`, `rebase` või `reset --hard` | Ütle ei. Kirjuta Roccole |
| Midagi on segane üle 15 minuti | Kirjuta kohe. Ära jää üksi nokitsema |

## 5. Viis reeglit, mida ei rikuta

1. Ära kunagi kirjuta otse `main`-i.
2. Muuda ainult oma faile.
3. Võtmed ei lähe kunagi GitHubi ega grupivestlusse.
4. Ära kasuta `--force`, `rebase` ega `reset --hard`.
5. Väike töötav PR iga 60–90 minuti tagant on parem kui suur PR laupäeva hommikul.
