# Integraatori käsiraamat (Rocco)

Sinu töö on hoida `main` alati töökorras ja teiste töö omavahel kokku panna. Tähtsuse järjekord kogu häkatoni ajal:

1. **PR-ide läbivaatamine ja merge'imine** (keegi ei tohi sinu taga oodata üle 15 minuti)
2. **Teiste takistuste eemaldamine** (leping ei sobi, võti puudub, konflikt)
3. **Sinu enda kood**

Ehitajate juhend (Sander, Ats, Aaron) on `CONTRIBUTING.md`. Saada neile see link.

---

## Sõnastik

| Sõna | Tähendus |
|---|---|
| **Repo** | Projekti kaust GitHubis koos kogu ajalooga |
| **`main`** | Põhiharu. See, mis on `main`-is, on avaldatud Vercelis. Peab alati töötama |
| **Haru** (branch) | Isiklik koopia, kus üks inimene teeb oma tööd teisi segamata |
| **Commit** | Salvestuspunkt: „need failid muutusid nii“ |
| **Push** | Commit'ide saatmine GitHubi |
| **PR** (pull request) | Palve: „võta minu haru muudatused `main`-i“. Sina vaatad üle ja vajutad nuppu |
| **Merge** | PR-i vastuvõtmine |
| **Konflikt** | Kaks inimest muutsid sama faili sama kohta. Meie reeglitega harv, sest igal failil on üks omanik |

---

## Osa A. Mis on juba tehtud

- Repo `vaksrocco-cmd/112sim` (avalik) koos dokumentidega: `KNOWLEDGE.md`, `CLAUDE.md`, `AGENTS.md`, `CONTRIBUTING.md`, see fail, `README.md`.
- `.gitignore` (võtmefailid ei lähe kunagi reposse), `.env.example`, PR-i mall, vea-issue mall.
- `.github/CODEOWNERS`: iga muudatus vajab sinu heakskiitu.
- CI (`.github/workflows/ci.yml`): igal PR-il typecheck, testid ja lint (kui `package.json` on olemas) ning kontroll, et ükski `.env` fail ei ole commit'itud.
- `main` on lukus: ei kustutamist, ei force-push'i, muudatused ainult PR-iga ja sinu heakskiiduga. Sina (admin) saad vajadusel mööda.
- Merge'imise seaded: ainult tavaline merge commit, harud jäävad pärast merge'i alles.
- Harud `feat/sim`, `feat/voice`, `feat/brain`, `feat/stage`.
- Igale inimesele oma issue tema ülesannetega.

## Osa B. Mis jääb sulle (umbes 25 minutit, mitte kood)

### B1. Tiimikaaslaste kutsed
Kui kutsed ei ole veel saadetud: **Settings → Collaborators → Add people** → Sanderi, Atsi, Aaroni (ja soovi korral Otto) GitHubi kasutajanimed. Nad peavad kutse vastu võtma (e-post või https://github.com/notifications).

### B2. OpenAI (5 min)
platform.openai.com → **API keys** → loo võti. Kontrolli, et kontol on krediiti. Pane **kulupiir** (Billing → Limits), näiteks 30 €.

### B3. Supabase (5 min)
supabase.com → **New project** (regioon Euroopas). Kui valmis: **SQL Editor** → kleebi `KNOWLEDGE.md` peatüki 12 SQL → **Run**. Siis **Project Settings → API**: kopeeri *Project URL* ja *service_role* võti.

### B4. Vercel (5 min)
1. vercel.com → logi sisse **GitHubi kontoga `vaksrocco-cmd`** → **Add New → Project** → vali `112sim` → **Import**.
2. **Environment Variables:** lisa `.env.example` muutujad koos väärtustega. Märgi **Production** ja **Preview**. `NEXT_PUBLIC_VOICE_PROVIDER` = `mock`, kuni Sander ütleb, et hääl töötab.
3. **Deploy.** Enne karkassi ebaõnnestub esimene avaldamine. See on ootuspärane.

### B5. Võtmed tiimile
Tee `.env.local` (`.env.example` täidetud väärtustega) ja saada see **privaatsõnumiga igaühele eraldi**: Sander, Ats, Aaron. Mitte grupivestlusse, mitte GitHubi. Pärast häkatoni kustuta võtmed ja tee uued.

### B6. Küsi korraldajalt
**Kas koodi tohib enne ehitusaja algust (reede 20:30) kirjutada?** Sellest sõltub, millal karkass tuleb (osa C). Ka: kas oma sülearvuteid tohib kasutada.

### B7. Saada grupivestlusse
> Repo: https://github.com/vaksrocco-cmd/112sim
> 1. Võtke GitHubi kutse vastu.
> 2. Lugege `KNOWLEDGE.md` peatükid 1–8 ja oma moodul (teie issue ütleb, millised).
> 3. Tehke `CONTRIBUTING.md` samm 1 läbi. Võtmed saadan privaatselt.
> 4. Karkass tuleb `main`-i kell ___. Siis `git pull origin main`, `npm install` ja käivitage oma agent (`CONTRIBUTING.md` samm 2).

---

## Osa C. Karkass (scaffold)

Kui koodi tohib kirjutada:

```bash
git clone https://github.com/vaksrocco-cmd/112sim.git
cd 112sim
git checkout main
```
Ava kaust oma agendiga ja anna talle `KNOWLEDGE.md` peatüki 23.1 prompt. Kui ta on lõpetanud:

```bash
npm install
npm run typecheck && npm run test && npm run lint     # kõik roheline
npm run dev                                           # ava localhost:3000 ja vaata üle
git status                                            # kontrolli, et .env.local EI OLE nimekirjas
git add -A
git commit -m "Scaffold project per KNOWLEDGE.md"
git push origin main
```
See on **ainus kord**, kui keegi otse `main`-i kirjutab (sa oled admin, lukk laseb sind läbi). Seejärel:

1. Vaata, et Vercel avaldas lehe.
2. Too karkass kõigisse harudesse, et need ei jääks maha:
   ```bash
   for b in feat/sim feat/voice feat/brain feat/stage; do
     git checkout $b && git pull origin $b && git merge main -m "Merge main" && git push origin $b
   done
   git checkout main
   ```
3. Kirjuta tiimile: „Karkass on `main`-is. `git pull origin main`, `npm install`, käivitage agent.“
4. Kui CI on rohelisena korra jooksnud: **Settings → Rules → Rulesets → main → Edit** → märgi **Require status checks to pass** → **Add checks** → `ci` → **Save**. Siis ei saa punast PR-i merge'ida.

---

## Osa D. Sinu tööring: PR-i merge'imine

Kui keegi kirjutab „PR on üleval“:

1. Ava PR → vaheleht **Files changed**.
2. **Kas muudetud on ainult selle inimese failid?** (`CLAUDE.md` tabel.) Kui seal on `types.ts`, `package.json`, lukufail, `components/ui/`, `supabase/`, `.github/` või teise inimese kaust → **Review changes → Request changes** ja kirjuta, mis välja võtta.
3. **Kas kontrollid on rohelised?** (PR-i allosas.) Punasega ei merge'i.
4. **Ava Verceli eelvaate link** (PR-i kommentaarides) ja proovi, kas leht avaneb ja muudatus töötab.
5. Korras → **Review changes → Approve → Submit review**, siis **Merge pull request → Confirm merge**.
6. Oota 1–2 min, kuni Vercel on `main`-i avaldanud, ja ava tootmis-URL. **Kui `main` on katki:** PR-i lehel **Revert** → tekib uus PR → merge'i see kohe. Siis räägi autoriga.
7. Kirjuta vestlusse: „Merge'itud: X. Tehke `git pull origin main`.“

**„This branch has conflicts“:** ära lahenda ise. Autorile: „Tee `git pull origin main`, lahenda konflikt oma failis, push'i uuesti.“

**Keegi vajab muudatust ühises failis:** tee see ise `feat/sim` harus väikese eraldi PR-ina, merge'i kohe ja ütle kõigile, et nad pull'iksid.

---

## Osa E. Sinu enda kood

Ka sina töötad harus:
```bash
git checkout feat/sim && git pull origin main
# … töö agendiga …
git add <failid> && git commit -m "…" && git push origin feat/sim
```
Tee PR ja merge'i see ise (adminina saad heakskiidu nõudest mööda).

**Sinu failid:** karkass, `src/lib/types.ts`, `facts.ts`, `scenarios/`, `components/ui/`, `lib/sim/useSimulation.ts`, simulatsioonileht, `components/sim/` (v.a `VideoStage` ja `ScenarioIntro`), `/api/scenarios`, `/api/sessions`, `lib/db/`.

**Ehitusjärjekord:**
1. Karkass ja `mockVoice`, nii et `good_call` mängib ekraanil läbi.
2. `useSimulation` koos `mockVoice` ja režissööri tühja versiooniga.
3. Teiste moodulite ühendamine sedamööda, kuidas nad valmivad.
4. `AiBrainPanel`.
5. Visuaalne lihv.

---

## Osa F. Kui midagi läheb valesti

| Olukord | Mida teha |
|---|---|
| `main` on katki pärast merge'i | PR-i lehel **Revert** → merge'i kohe |
| Keegi pani võtme GitHubi | **Tühista see võti kohe** teenuse lehel ja tee uus (faili kustutamine ei aita, ajalugu jääb alles). Uuenda Vercelis ja saada uus `.env.local` |
| Vercel ei avalda tiimikaaslase commit'i („commit author did not have contributing access“) | Kontrolli, et repo on **Public**. Hädavariant: `git commit --allow-empty -m "Trigger deploy" && git push origin main` |
| Kaks inimest vajavad sama faili | Otsusta, kes on omanik, ja kirjuta see `KNOWLEDGE.md` 15.1 ning `CLAUDE.md` tabelisse |
| Kellegi agent muutis `types.ts`-i | Request changes. Vajaliku muudatuse teed ise eraldi PR-ina |
| Kellegi haru on täiesti sassis | Ta teeb uue haru: `git checkout main && git pull origin main && git checkout -b feat/voice-2`, kopeerib oma failid sinna, teeb uue PR-i |
| Sa ei jõua merge'ida | Ütle seda. Määra üks inimene, kes vaatab PR-id üle ja ütleb sulle „korras“; sina vajutad ainult nuppu |

---

## Rütm

Iga umbes 90 minuti tagant kaks minutit kõik koos, püsti:
1. Mis on `main`-is ja töötab?
2. Mis on igaühe järgmine PR?
3. Kas keegi ootab kellegi taga?

Pärast igat ringi ava tootmis-URL ja tee üks kõne algusest lõpuni. Kui see ei tööta, on selle parandamine kõigi esimene töö.
