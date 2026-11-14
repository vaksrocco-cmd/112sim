'use client';
// Tagasiside ideaalse kõne järjekorras (kus -> mis juhtus -> kellega -> seisund -> millal -> muutus) ja soovitused.
// Kasutusel nii telefoni raportis kui suurel ekraanil. Ainult kuvab: olekud ja tekstid tulevad `AnalysisReport`-ist.
import { useEffect, useRef, type ReactNode } from 'react';
import { cx } from '@/components/ui';
import type { FeedbackStatus, FeedbackStep } from '@/lib/types';

const statusLabel: Record<FeedbackStatus, string> = { said: 'Öeldud', prompted: 'Hilja', partial: 'Poolik', missing: 'Ütlemata' };
const statusText: Record<FeedbackStatus, string> = { said: 'text-ok', prompted: 'text-warn', partial: 'text-warn', missing: 'text-danger' };
const statusRing: Record<FeedbackStatus, string> = { said: 'border-ok text-ok', prompted: 'border-warn text-warn', partial: 'border-warn text-warn', missing: 'border-danger text-danger' };

/** Rida tõuseb ja selgineb oma järjekorras. Ilma liikumiseta (seade või vana brauser) on sisu kohe nähtav. */
export function Rise({ index, className, children }: { index: number; className?: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el?.animate || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const a = el.animate(
      [
        { opacity: 0, transform: 'translateY(14px)', filter: 'blur(6px)' },
        { opacity: 1, transform: 'translateY(0)', filter: 'blur(0)' },
      ],
      { duration: 620, delay: 120 + index * 90, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'backwards' },
    );
    return () => a.cancel();
  }, [index]);
  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

function Mark({ status }: { status: FeedbackStatus }) {
  const path = status === 'said' ? 'm7 12.5 3.2 3.2L17 9' : status === 'missing' ? 'M8 8l8 8M16 8l-8 8' : 'M7.5 12h9';
  return (
    <svg viewBox="0 0 24 24" className="size-[58%]" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={path} />
    </svg>
  );
}

/** `big` on suure ekraani jaoks: suurem kiri, ilma näidislauseta ridadel, mis õnnestusid. */
export function FeedbackSteps({ steps, big }: { steps: FeedbackStep[]; big?: boolean }) {
  return (
    <ol className={cx('flex flex-col', big ? 'gap-[1.4vh]' : 'gap-5')}>
      {steps.map((s, i) => (
        <li key={s.id}>
          <Rise index={i} className={cx('flex items-start', big ? 'gap-5' : 'gap-3')}>
            <span className={cx('flex flex-none items-center justify-center rounded-full border', statusRing[s.status], big ? 'mt-1 size-9' : 'mt-0.5 size-6')}>
              <Mark status={s.status} />
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <p className={cx('flex items-baseline justify-between gap-3 font-semibold text-fg', big ? 'text-[clamp(18px,1.7vw,28px)] leading-tight' : 'text-[15px] leading-5')}>
                <span>
                  <span className="text-subtle">{i + 1}. </span>
                  {s.label}
                </span>
                <span className={cx('flex-none font-medium', statusText[s.status], big ? 'text-[clamp(14px,1.1vw,18px)]' : 'text-[13px]')}>{statusLabel[s.status]}</span>
              </p>
              {s.quote ? <p className={cx('font-semibold text-fg', big ? 'text-[clamp(15px,1.3vw,22px)] leading-snug' : 'text-[15px] leading-[22px]')}>„{s.quote}“</p> : null}
              <p className={cx('text-muted', big ? 'text-[clamp(14px,1.15vw,19px)] leading-snug' : 'text-[14px] leading-5')}>{s.note}</p>
              {s.status !== 'said' && !(big && s.quote) ? (
                <p className={cx('text-subtle', big ? 'text-[clamp(14px,1.15vw,19px)] leading-snug' : 'text-[14px] leading-5')}>
                  Ütle näiteks: <span className="text-fg">„{s.example.replace(/^[„"“]+|[“"”]+$/g, '')}“</span>
                </p>
              ) : null}
            </div>
          </Rise>
        </li>
      ))}
    </ol>
  );
}

/** Soovitused nummerdatult, järjekorras, milles neid kõnes öelda. */
export function Tips({ tips, from = 0, big }: { tips: string[]; from?: number; big?: boolean }) {
  return (
    <ol className={cx('flex flex-col', big ? 'gap-[1vh]' : 'gap-3')}>
      {tips.map((t, i) => (
        <li key={t}>
          <Rise index={from + i} className={cx('flex items-baseline', big ? 'gap-5' : 'gap-3')}>
            <span className={cx('flex-none text-center font-semibold tabular-nums text-subtle', big ? 'w-9 text-[clamp(16px,1.4vw,24px)]' : 'w-6 text-[15px]')}>{i + 1}</span>
            <span className={cx('text-fg', big ? 'text-[clamp(15px,1.3vw,22px)] leading-snug' : 'text-[15px] leading-[22px]')}>{t}</span>
          </Rise>
        </li>
      ))}
    </ol>
  );
}
