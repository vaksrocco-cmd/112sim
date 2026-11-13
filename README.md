# 112Sim

Hädaabikõne treeningsimulaator. Ekraanil on õnnetus, mis kõne ajal muutub. Sa räägid eesti keeles AI-päästekorraldajaga ja saad pärast täpse analüüsi: mida ütlesid, mis jäi ütlemata ja kui kiiresti.

**Treeningsimulatsioon. Päris hädaolukorras helista 112.**

Viimsi Teaduskooli AI-häkaton, 13.–14. november 2026.

## Tiim
Rocco (integraator) · Sander (hääl) · Ats (aju) · Aaron (lava ja raport) · Otto (pitch)

## Dokumendid
| Fail | Kellele |
|---|---|
| [`KNOWLEDGE.md`](KNOWLEDGE.md) | kõigile: projekti ainus tõeallikas (idee, arhitektuur, lepingud, moodulid, promptid, ajakava) |
| [`CONTRIBUTING.md`](CONTRIBUTING.md) | ehitajatele: kuidas alustada ja kuidas oma töö `main`-i saata |
| [`CLAUDE.md`](CLAUDE.md) / [`AGENTS.md`](AGENTS.md) | AI-agentidele: reeglid, mida nad peavad järgima |
| [`ROCCO.md`](ROCCO.md) | integraatorile: PR-ide ülevaatus, merge'imine, hädaolukorrad |

## Käivitamine
```bash
npm install
cp .env.example .env.local   # täida võtmed (saad Roccolt)
npm run dev
```
