// RAPORT (Aaron, feat/stage). KNOWLEDGE.md 9.7: päis -> kolm aega -> hindamine tõenditega -> mis jäi ütlemata -> soovitused -> ajajoon.
// Ainult kuvab: punktid, ajad ja tekstid tulevad valmis kujul `AnalysisReport`-ist.
import Link from 'next/link';
import type { ReactNode } from 'react';
import type { AnalysisReport, CallSession, Outcome, RubricItemResult } from '@/lib/types';
import { Page, Panel, Progress, Reveal, buttonClass, cx } from '@/components/ui';
import { AwaitFeedback } from './AwaitFeedback';
import { CountUp } from './CountUp';
import { FeedbackSteps, Tips } from './FeedbackSteps';
import { formatMs } from '@/components/sim/format';

const outcomeLabel: Record<Outcome, string> = { good: 'Abi jõudis õigel ajal', delayed: 'Abi jõudis hilinemisega', bad: 'Abi ei jõudnud õigel ajal' };
const outcomeText = { good: 'text-ok', delayed: 'text-warn', bad: 'text-danger' } as const;
const outcomeBar = { good: 'ok', delayed: 'warn', bad: 'accent' } as const;
const markText = { ok: 'text-ok', warn: 'text-warn', neutral: 'text-subtle' } as const;

const seconds = (ms: number) => `${Math.round(ms / 1000)} s`;

type TimelineRow =
  | { kind: 'line'; atMs: number; key: string; speaker: 'caller' | 'dispatcher'; text: string }
  | { kind: 'mark'; atMs: number; key: string; tone: 'ok' | 'warn' | 'neutral'; text: string };

function timeline(session: CallSession): TimelineRow[] {
  const rows: TimelineRow[] = session.transcript.map((s) => ({ kind: 'line', atMs: s.startMs, key: s.id, speaker: s.speaker, text: s.text }));
  session.events.forEach((e, i) => {
    if (e.type === 'state_changed') rows.push({ kind: 'mark', atMs: e.atMs, key: `e${i}`, tone: 'warn', text: 'Olukord muutus' });
    if (e.type === 'ambulance_dispatched') rows.push({ kind: 'mark', atMs: e.atMs, key: `e${i}`, tone: 'ok', text: 'Kiirabi saadeti välja' });
    if (e.type === 'call_ended') rows.push({ kind: 'mark', atMs: e.atMs, key: `e${i}`, tone: 'neutral', text: 'Kõne lõppes' });
  });
  return rows.sort((a, b) => a.atMs - b.atMs);
}

export function ReportView({ session, report }: { session: CallSession; report: AnalysisReport }) {
  const change = report.rubric.find((r) => r.id === 'change');
  const rows = timeline(session);
  const actions = (
    <>
      <Link href={`/sim/${session.scenarioId}`} className={buttonClass({ size: 'xl', block: true })}>
        Proovi uuesti
      </Link>
      <Link href="/" className={buttonClass({ variant: 'secondary', size: 'lg', block: true })}>
        Avalehele
      </Link>
    </>
  );

  return (
    <Page width="wide">
      <div className="flex flex-col gap-4 pb-4 pt-2 lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-start lg:gap-8 lg:pt-6">
        {/* Päis: tulemus, skoor, mis oleks juhtunud, kolm aega. */}
        <div className="gr-stagger flex flex-col gap-4 lg:sticky lg:top-6">
          <section className="flex flex-col gap-5 rounded-card bg-surface p-5">
            <div className="flex flex-col gap-2">
              <p className={cx('type-label', outcomeText[report.outcome])}>{outcomeLabel[report.outcome]}</p>
              <h1 className="flex items-baseline gap-2 text-fg" aria-label={`Tulemus ${report.score} punkti sajast`}>
                <span className="type-display text-[104px]">
                  <CountUp value={report.score} />
                </span>
                <span className="type-title text-[24px] text-subtle">/100</span>
              </h1>
            </div>
            <Progress value={report.score / 100} tone={outcomeBar[report.outcome]} />
            {report.summary ? <p className="text-[17px] leading-[26px] text-fg">{report.summary}</p> : null}
            {report.aiPending ? <AwaitFeedback id={session.id} /> : null}
            {report.whatWouldHaveHappened ? <p className="text-[15px] leading-[22px] text-muted">{report.whatWouldHaveHappened}</p> : null}
          </section>

          <section aria-label="Kolm põhiaega" className="grid grid-cols-3 divide-x divide-border rounded-card bg-surface py-5">
            <Time label="Mis juhtus" value={report.times.incidentMs != null ? formatMs(report.times.incidentMs) : undefined} missing="ei öelnud" />
            <Time label="Täielik aadress" value={report.times.locationMs != null ? formatMs(report.times.locationMs) : undefined} missing="ei öelnud" />
            <Time
              label="Reaktsioon muutusele"
              value={report.times.changeReactionMs != null ? seconds(report.times.changeReactionMs) : undefined}
              missing={change?.notApplicable ? 'muutust polnud' : 'ei teatanud'}
            />
          </section>

          <div className="hidden flex-col gap-3 lg:flex">{actions}</div>
        </div>

        <div className="flex flex-col gap-4">
          {report.steps?.length ? (
            <Panel title="Sinu kõne õiges järjekorras">
              <FeedbackSteps steps={report.steps} />
            </Panel>
          ) : null}

          {report.tips.length ? (
            <Panel title="Järgmine kord">
              <Tips tips={report.tips} from={report.steps?.length ?? 0} />
            </Panel>
          ) : null}

          <Panel title="Punktid">
            <ul className="-my-4 divide-y divide-border">
              {report.rubric.map((r, i) => (
                <Rubric key={r.id} item={r} delay={Math.min(i, 4) * 0.06} />
              ))}
            </ul>
          </Panel>

          {rows.length ? (
            <details className="group rounded-card bg-surface p-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 type-label text-subtle [&::-webkit-details-marker]:hidden">
                Kõne ajajoon
                <svg viewBox="0 0 24 24" className="size-4 flex-none text-muted transition-transform duration-300 ease-out group-open:rotate-180" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </summary>
              <ol className="flex flex-col gap-3 pt-4">
                {rows.map((row) => (
                  <li key={row.key} className="flex items-baseline gap-3 text-[15px] leading-[22px]">
                    <span className="w-11 flex-none text-[13px] text-subtle">{formatMs(row.atMs)}</span>
                    {row.kind === 'mark' ? (
                      <p className={cx('font-medium', markText[row.tone])}>{row.text}</p>
                    ) : (
                      <p className={cx('min-w-0', row.speaker === 'caller' ? 'text-fg' : 'text-muted')}>{row.text}</p>
                    )}
                  </li>
                ))}
              </ol>
            </details>
          ) : null}

          <div className="flex flex-col gap-3 pt-2 lg:hidden">{actions}</div>
        </div>
      </div>
    </Page>
  );
}

function Time({ label, value, missing }: { label: string; value?: string; missing: string }): ReactNode {
  return (
    <div className="flex flex-col justify-between gap-2 px-4">
      <p className="type-label text-subtle">{label}</p>
      {value ? (
        <p className="type-title text-[24px] leading-[30px] text-fg">{value}</p>
      ) : (
        <p className="type-label leading-[30px] text-danger">{missing}</p>
      )}
    </div>
  );
}

function Rubric({ item, delay }: { item: RubricItemResult; delay: number }) {
  const full = item.points === item.maxPoints;
  return (
    <li className="py-4">
      <Reveal delay={delay} className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[15px] font-bold leading-5 text-fg">{item.label}</p>
        <p className="flex-none text-[15px] font-bold leading-5 text-fg">
          {item.notApplicable ? (
            <span className="font-normal text-subtle">ei hinnatud</span>
          ) : (
            <>
              {item.points}
              <span className="font-normal text-subtle">/{item.maxPoints}</span>
            </>
          )}
        </p>
      </div>
      {item.notApplicable ? null : <Progress value={item.maxPoints ? item.points / item.maxPoints : 0} tone={full ? 'ok' : item.points === 0 ? 'accent' : 'warn'} track="strong" />}
      <p className="text-[13px] leading-5 text-muted">{item.why}</p>
      {item.evidence ? <blockquote className="border-l border-border-strong pl-3 text-[15px] leading-[22px] text-fg">„{item.evidence}“</blockquote> : null}
      </Reveal>
    </li>
  );
}
