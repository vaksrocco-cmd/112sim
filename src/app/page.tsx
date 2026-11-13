// Avaleht: probleem -> valu -> lahendus -> tõendid. Kõik numbrid on allikatega (KNOWLEDGE.md 3.4 ja 24).
import Link from 'next/link';
import type { ReactNode } from 'react';
import { Logo } from '@/components/ui';

const SIM = '/sim/vanaema-insult';

const SOURCES = {
  err: 'https://www.err.ee/909525/uha-enam-numbrile-112-helistajaid-soovib-abi-metsloomale',
  postimees: 'https://www.postimees.ee/593418/valjasoiduni-viib-iga-kolmas-hadaabikone',
  insult: 'https://www.postimees.ee/6807301/insuldi-korral-tegutse-kiiresti',
  callersim: 'https://www.helse-stavanger.no/en/research-education/resources-and-networks/rakos/oversikt-over-prosjekter/callersim/',
};

function Cta({ children, quiet }: { children: ReactNode; quiet?: boolean }) {
  return (
    <Link
      href={SIM}
      className={
        quiet
          ? 'gr-motion flex h-12 w-full items-center justify-center rounded-full bg-surface-2 text-base font-medium text-fg hover:bg-border'
          : 'gr-motion flex h-14 w-full items-center justify-center gap-2 rounded-full bg-primary text-[17px] font-semibold text-primary-fg hover:opacity-[0.88]'
      }
    >
      {children}
    </Link>
  );
}

function Section({ kicker, title, children }: { kicker: string; title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <span className="text-xs font-medium text-subtle">{kicker}</span>
        <h2 className="text-[26px] font-semibold leading-[1.12] tracking-[-0.03em] text-fg">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function Stat({ value, label, source, href }: { value: string; label: string; source: string; href: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-card bg-surface p-4 shadow-sm">
      <span className="text-[34px] font-semibold leading-none tracking-[-0.03em] text-fg">{value}</span>
      <span className="text-[15px] leading-5 text-muted">{label}</span>
      <a href={href} target="_blank" rel="noreferrer" className="text-xs text-subtle underline underline-offset-2">
        {source}
      </a>
    </div>
  );
}

function Row({ n, title, text }: { n: string; title: string; text: string }) {
  return (
    <div className="flex gap-3 rounded-card bg-surface p-4 shadow-sm">
      <span className="flex size-8 flex-none items-center justify-center rounded-full bg-surface-2 text-sm font-semibold text-fg">{n}</span>
      <div className="min-w-0">
        <p className="text-base font-semibold leading-6 text-fg">{title}</p>
        <p className="text-[15px] leading-5 text-muted">{text}</p>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <div className="flex flex-col gap-14 pb-8 pt-4">
      {/* ── Hero ── */}
      <header className="flex flex-col gap-5">
        <Logo />
        <h1 className="text-[38px] font-semibold leading-[1.04] tracking-[-0.04em] text-fg">
          Hädaabikõnes loeb iga sekund. Keegi pole seda kunagi harjutanud.
        </h1>
        <p className="text-[17px] leading-6 text-muted">
          Kui lähedasega juhtub õnnetus, pead esimest korda elus helistama 112. Paanikas jäävad ütlemata just need asjad, mille järgi kiirabi sind
          üles leiab. 112Sim laseb selle kõne enne läbi teha.
        </p>
        <Cta>
          Proovi kõnet
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </Cta>
        <p className="text-center text-xs text-subtle">2 minutit · eesti keeles · tasuta · päris kõnet ei tehta</p>
      </header>

      {/* ── Probleem ── */}
      <Section kicker="01 · Probleem" title="Miljon kõnet aastas. Esimene kord on alati päris.">
        <div className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-2">
          <Stat value="3000" label="kõnet päevas numbrile 112, umbes miljon aastas" source="ERR, Häirekeskus" href={SOURCES.err} />
          <Stat value="~70%" label="kõnedest puudutab tervisemuret" source="ERR, Häirekeskus" href={SOURCES.err} />
        </div>
        <p className="text-[15px] leading-6 text-muted">
          Tuletõrjeõppust teeme koolis igal aastal. Hädaabikõnet, mida läheb elus palju tõenäolisemalt vaja, ei harjuta keegi kordagi.
        </p>
      </Section>

      {/* ── Valu ── */}
      <Section kicker="02 · Valu" title="Halb kõne maksab minuteid. Minutid maksavad tervise ja elu.">
        <div className="flex flex-col gap-3">
          <Row
            n="1"
            title="Poolik aadress"
            text="Päästekorraldajate sõnul on tüüpiline viga öelda ainult „Pikk tänav“, ilma linnata. Kiirabi ei saa sõita kohta, mida ta ei tea."
          />
          <Row n="2" title="Ei ütle, mis juhtus" text="Šokis inimene räägib kõigest muust. Päästekorraldaja peab olulise info küsimustega välja kangutama." />
          <Row
            n="3"
            title="Ei märka, et olukord muutus"
            text="Abivajaja seisund halveneb kõne ajal, aga helistaja ei ütle seda. Kiirabi valmistub kergemaks juhtumiks."
          />
        </div>
        <div className="rounded-card bg-accent-soft p-4">
          <p className="text-[17px] font-semibold leading-6 text-accent">Insuldi puhul on ravi võimalik ainult 4,5 tunni jooksul.</p>
          <p className="mt-1 text-[15px] leading-5 text-fg">
            Iga minut, mis kulub aadressi selgitamisele, on minut, mil abi ei ole teel.{' '}
            <a href={SOURCES.insult} target="_blank" rel="noreferrer" className="text-subtle underline underline-offset-2">
              Postimees
            </a>
            ,{' '}
            <a href={SOURCES.postimees} target="_blank" rel="noreferrer" className="text-subtle underline underline-offset-2">
              päästekorraldajate kogemus
            </a>
          </p>
        </div>
      </Section>

      {/* ── Lahendus ── */}
      <Section kicker="03 · Lahendus" title="Tee see kõne ära enne, kui seda päriselt vaja on.">
        <div className="flex flex-col gap-3">
          <Row n="1" title="Näed olukorda" text="Oled vanaema juures külas. Ta hakkab äkki segaselt rääkima. Laual on ümbrik aadressiga." />
          <Row n="2" title="Helistad ja räägid päriselt" text="AI-päästekorraldaja vastab häälega eesti keeles ja küsib seda, mida päris kõnes küsitakse." />
          <Row n="3" title="Olukord muutub kõne ajal" text="Nagu päriselus. Kas märkad ja ütled? Sellest sõltub, kuidas lugu lõpeb." />
          <Row n="4" title="Saad ausa tagasiside" text="Mitu sekundit kulus aadressini, mis jäi ütlemata ja mida järgmine kord teisiti teha. Iga punkt on seotud lausega, mille sa ütlesid." />
        </div>
        <Cta quiet>Proovi kohe</Cta>
      </Section>

      {/* ── Tõendid ── */}
      <Section kicker="04 · Miks see töötab" title="Vajadus on kinnitatud. Eesti keeles seda veel ei ole.">
        <div className="flex flex-col gap-3">
          <div className="rounded-card bg-surface p-4 shadow-sm">
            <p className="text-base font-semibold leading-6 text-fg">Norras ehitatakse sama asja</p>
            <p className="text-[15px] leading-5 text-muted">
              Stavangeri haigla, Sklls ja Norra Punane Rist arendavad noortele hädaabikõne harjutamise rakendust CallerSim. Eesti keeles ja Eesti oludele me
              sellist ei leidnud.{' '}
              <a href={SOURCES.callersim} target="_blank" rel="noreferrer" className="text-subtle underline underline-offset-2">
                Helse Stavanger
              </a>
            </p>
          </div>
          <div className="rounded-card bg-surface p-4 shadow-sm">
            <p className="text-base font-semibold leading-6 text-fg">Häirekeskus soovitab harjutada rollimänguna</p>
            <p className="text-[15px] leading-5 text-muted">112Sim teeb sellest rollimängust asja, mida saab teha üksi, korduvalt ja mõõdetavalt.</p>
          </div>
          <div className="rounded-card bg-surface p-4 shadow-sm">
            <p className="text-base font-semibold leading-6 text-fg">Hindamine on läbipaistev</p>
            <p className="text-[15px] leading-5 text-muted">
              Punktid arvutab kood avalike reeglite järgi, mitte tehisaru tunde järgi. Päästekorraldaja annab juhiseid ainult ette antud loendist.
            </p>
          </div>
          <div className="rounded-card bg-surface p-4 shadow-sm">
            <p className="text-base font-semibold leading-6 text-fg">Kellele</p>
            <p className="text-[15px] leading-5 text-muted">Koolid, autokoolid ja esmaabikoolitajad: üks harjutus tunnis, tulemus kohe näha.</p>
          </div>
        </div>
      </Section>

      {/* ── Lõpp ── */}
      <footer className="flex flex-col gap-4">
        <h2 className="text-[26px] font-semibold leading-[1.12] tracking-[-0.03em] text-fg">Kaks minutit praegu võib päästa minuteid siis, kui need loevad.</h2>
        <Cta>Helista harjutuskõne</Cta>
        <p className="text-xs leading-5 text-subtle">
          Vajad mikrofoni; kõige parem on kasutada kõrvaklappe. Heli ei salvestata, nime ei küsita. 112Sim ei ole Häirekeskuse ametlik toode ja õpetab
          helistamist, mitte esmaabi. Sisu tuleb enne päriskasutust ekspertidega üle vaadata.
        </p>
        {process.env.NODE_ENV !== 'production' ? (
          <div className="flex flex-wrap gap-4">
            {['/dev/voice', '/dev/stage', '/dev/report'].map((h) => (
              <Link key={h} className="text-sm text-muted underline" href={h}>
                {h}
              </Link>
            ))}
          </div>
        ) : null}
      </footer>
    </div>
  );
}
