// Avaleht: probleem -> valu -> lahendus, minimaalselt. Kõik numbrid on allikatega (KNOWLEDGE.md 3.4 ja 24).
import Link from 'next/link';
import type { ReactNode } from 'react';
import { Logo, Page, buttonClass } from '@/components/ui';

const SIM = '/sim/vanaema-insult';
const HOST = '/host';

const SOURCES = {
  err: 'https://www.err.ee/909525/uha-enam-numbrile-112-helistajaid-soovib-abi-metsloomale',
  postimees: 'https://www.postimees.ee/593418/valjasoiduni-viib-iga-kolmas-hadaabikone',
  insult: 'https://www.postimees.ee/6807301/insuldi-korral-tegutse-kiiresti',
};

/**
 * Kaks sissepääsu. Laual on põhinupp kursus (suur ekraan + telefon), telefonis üksi proovimine:
 * suure ekraani vaadet ei ole mõtet telefonis avada. Mõlemad lingid on alati olemas.
 */
function Actions() {
  const primary = buttonClass({ size: 'xl' });
  const secondary = buttonClass({ variant: 'secondary', size: 'xl' });
  return (
    <>
      <div className="flex flex-col gap-3 md:hidden">
        <Link href={SIM} className={primary}>
          Proovi üksi telefonis
        </Link>
        <Link href={HOST} className={secondary}>
          Alusta kursust suurel ekraanil
        </Link>
      </div>
      <div className="hidden gap-3 md:flex">
        <Link href={HOST} className={primary}>
          Alusta kursust
        </Link>
        <Link href={SIM} className={secondary}>
          Proovi üksi
        </Link>
      </div>
    </>
  );
}

/** Üks plokk kolmest (valu, probleem, kasu): silt, julge väide, üks lõik selgitust. */
function Block({ label, title, children }: { label: string; title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4 border-t border-border pt-6">
      <h2 className="type-label text-subtle">{label}</h2>
      <p className="type-title text-[24px] text-fg lg:text-[32px]">{title}</p>
      <p className="text-[15px] leading-[24px] text-muted lg:text-[17px] lg:leading-[26px]">{children}</p>
    </section>
  );
}

/** Allikaviide teksti sees. */
function Src({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="gr-motion text-fg underline decoration-border-strong underline-offset-4 hover:decoration-fg">
      {children}
    </a>
  );
}

/**
 * Pilt formaadist (ainult laual): video mängib suurel ekraanil, telefonis on klahvistik ja valitud 112.
 * Dekoratiivne: ei ole interaktiivne ega ole tel: link.
 */
function FormatPreview() {
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'];
  return (
    <div aria-hidden className="gr-enter relative hidden w-[460px] flex-none pb-20 pr-12 lg:block">
      <div className="relative aspect-video overflow-hidden rounded-card bg-surface">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/clips/vanaema/s1.jpg" alt="" className="absolute inset-0 size-full object-cover" />
      </div>
      <div className="absolute bottom-0 right-0 flex w-[148px] flex-col items-center gap-3 rounded-shell bg-surface px-4 pb-4 pt-5 shadow-lg">
        <p className="text-[24px] font-extrabold leading-[30px] tracking-[-0.02em] text-fg">112</p>
        <div className="grid grid-cols-3 gap-1.5">
          {keys.map((k) => (
            <span key={k} className="flex size-8 items-center justify-center rounded-full bg-surface-2 text-[13px] leading-none text-fg">
              {k}
            </span>
          ))}
        </div>
        <span className="flex size-8 items-center justify-center rounded-full bg-call text-white">
          <svg viewBox="0 0 24 24" className="size-4" fill="currentColor">
            <path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25c1.1.37 2.3.57 3.6.57a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1z" />
          </svg>
        </span>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <Page width="wide">
      <div className="flex flex-col gap-16 pb-10 pt-6 lg:gap-28 lg:pt-10">
        <header className="lg:grid lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:gap-16">
          <div className="gr-stagger flex flex-col gap-7">
            <Logo />
            <h1 className="type-display text-[40px] text-fg md:text-[64px] lg:text-[52px] xl:text-[64px]">Hädaabikõnes loeb iga sekund.</h1>
            <p className="text-[17px] leading-[26px] text-muted lg:max-w-xl lg:text-[19px] lg:leading-[30px]">Keegi pole seda kõnet kunagi harjutanud. Tee see siin kolme minutiga ära enne, kui seda päriselt vaja on.</p>
            <Actions />
          </div>
          <FormatPreview />
        </header>

        <div className="grid gap-10 lg:grid-cols-3 lg:gap-8">
          <Block label="Valu" title="Esimene kõne on päris kõne.">
            Kui lähedasega midagi juhtub, helistad sa 112 esimest korda elus. Paanikas ja ilma ühegi harjutuseta.
          </Block>
          <Block label="Probleem" title="Poolik aadress maksab minuteid.">
            Häirekeskus saab <Src href={SOURCES.err}>3000 kõnet päevas</Src>. Kõige sagedasem viga on <Src href={SOURCES.postimees}>aadress ilma linnata</Src>, ja{' '}
            <Src href={SOURCES.insult}>insuldi puhul loeb iga minut</Src>.
          </Block>
          <Block label="Kasu" title="Kolm minutit harjutust.">
            Näed olukorda, valid 112 ja räägid päris häälega. Olukord muutub kõne ajal ja lõpus näed, mis jäi ütlemata.
          </Block>
        </div>
      </div>
    </Page>
  );
}
