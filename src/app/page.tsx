// Avaleht: probleem -> valu -> lahendus, minimaalselt. Kõik numbrid on allikatega (KNOWLEDGE.md 3.4 ja 24).
import Link from 'next/link';
import type { ReactNode } from 'react';
import { Logo } from '@/components/ui';

const SIM = '/sim/vanaema-insult';
const HOST = '/host';

const SOURCES = {
  err: 'https://www.err.ee/909525/uha-enam-numbrile-112-helistajaid-soovib-abi-metsloomale',
  postimees: 'https://www.postimees.ee/593418/valjasoiduni-viib-iga-kolmas-hadaabikone',
  insult: 'https://www.postimees.ee/6807301/insuldi-korral-tegutse-kiiresti',
  callersim: 'https://www.helse-stavanger.no/en/research-education/resources-and-networks/rakos/oversikt-over-prosjekter/callersim/',
};

function Cta({ children, href = HOST }: { children: ReactNode; href?: string }) {
  return (
    <Link href={href} className="gr-motion flex h-14 w-full items-center justify-center rounded-full bg-primary text-[17px] font-semibold text-primary-fg hover:opacity-[0.88]">
      {children}
    </Link>
  );
}

function Fact({ value, label, href }: { value: string; label: string; href: string }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="gr-motion flex items-baseline gap-4 border-b border-border py-4 hover:opacity-[0.88]">
      <span className="w-24 flex-none text-[30px] font-semibold leading-none tracking-[-0.03em] text-fg">{value}</span>
      <span className="text-[15px] leading-5 text-muted">{label}</span>
    </a>
  );
}

function Step({ n, text }: { n: string; text: string }) {
  return (
    <div className="flex items-baseline gap-4 border-b border-border py-4">
      <span className="w-6 flex-none text-sm tabular-nums text-subtle">{n}</span>
      <span className="text-[17px] font-medium leading-6 text-fg">{text}</span>
    </div>
  );
}

function Label({ children }: { children: ReactNode }) {
  return <h2 className="text-xs font-medium text-subtle">{children}</h2>;
}

export default function Home() {
  return (
    <div className="flex flex-col gap-16 pb-10 pt-6">
      <header className="flex flex-col gap-6">
        <Logo />
        <h1 className="text-[40px] font-semibold leading-[1.02] tracking-[-0.045em] text-fg">Hädaabikõnes loeb iga sekund.</h1>
        <p className="text-[19px] leading-7 text-muted">Keegi pole seda kõnet kunagi harjutanud. Tee see siin ühe minutiga ära enne, kui seda päriselt vaja on.</p>
        <div className="flex flex-col gap-3">
          <Cta>Alusta kursust</Cta>
          <Link href={SIM} className="gr-motion flex h-12 w-full items-center justify-center rounded-full bg-surface-2 text-base font-medium text-fg hover:bg-border">
            Proovi üksi telefonis
          </Link>
        </div>
      </header>

      <section>
        <Label>Probleem</Label>
        <Fact value="3000" label="kõnet päevas numbrile 112" href={SOURCES.err} />
        <Fact value="~70%" label="neist on tervisemured" href={SOURCES.err} />
        <Fact value="4,5 h" label="on insuldi ravi aken. Iga minut loeb." href={SOURCES.insult} />
        <Fact value="1 viga" label="kordub enim: poolik aadress, ilma linnata" href={SOURCES.postimees} />
      </section>

      <section>
        <Label>Lahendus</Label>
        <Step n="1" text="Skaneerid koodi suurelt ekraanilt." />
        <Step n="2" text="Näed olukorda ja valid 112." />
        <Step n="3" text="Olukord muutub. Kas märkad?" />
        <Step n="4" text="Näed, mis jäi ütlemata." />
      </section>

      <footer className="flex flex-col gap-5">
        <Cta>Alusta kursust</Cta>
        <p className="text-xs leading-5 text-subtle">
          Heli ei salvestata. Ei ole Häirekeskuse ametlik toode.{' '}
          <a href={SOURCES.callersim} target="_blank" rel="noreferrer" className="underline underline-offset-2">
            Norras tehakse sama: CallerSim
          </a>
          .
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
