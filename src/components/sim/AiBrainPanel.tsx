'use client';
// Näitab reaalajas, mida kohtunik (LLM) on kõnest aru saanud. KNOWLEDGE.md 9.5. Tõde siin ei ole.
import type { ReactNode } from 'react';
import type { CallEvent, CallFacts, CallMs, PublicScenario, TriState } from '@/lib/types';
import { Expand, Panel, Swap } from '@/components/ui';
import { formatMs } from './format';

function tri(v: TriState) {
  return v === 'yes' ? <Badge tone="ok">jah</Badge> : v === 'no' ? <Badge tone="danger">ei</Badge> : <Badge tone="outline">teadmata</Badge>;
}

export function AiBrainPanel({
  facts,
  scenario,
  events = [],
  stateId,
  callMs = 0,
}: {
  facts: CallFacts;
  scenario?: PublicScenario;
  events?: CallEvent[];
  stateId?: string;
  callMs?: CallMs;
}) {
  const loc = facts.location;
  const address = [[loc.street, loc.house].filter(Boolean).join(' '), loc.settlement ?? loc.municipality].filter(Boolean).join(', ');
  const missing = [!loc.street && 'tänav', !loc.house && 'maja', !(loc.settlement || loc.municipality) && 'asula'].filter(Boolean).join(', ');
  const label = (id: string) => scenario?.symptoms.find((s) => s.id === id)?.label ?? id;
  const dispatch = events.find((e) => e.type === 'ambulance_dispatched');

  // Viimane seisundimuutus, millest tuleb teatada.
  const state = scenario?.states.find((s) => s.id === stateId);
  const change = [...events].reverse().find((e) => e.type === 'state_changed');
  const reported = facts.changeReports.find((r) => r.stateId === stateId);
  const waiting = state?.requiresReport && change && !reported;

  return (
    <Panel title="AI aju: mida süsteem on aru saanud">
      <div className="-my-3 divide-y divide-border">
        <Row label="Mis juhtus" detail={facts.incident.quote ? `„${facts.incident.quote}“` : undefined}>
          {facts.incident.said ? (
            <Badge tone="ok">öeldud {facts.incident.atMs != null ? formatMs(facts.incident.atMs) : ''}</Badge>
          ) : (
            <Badge tone="outline">ootab</Badge>
          )}
        </Row>
        <Row label="Asukoht" detail={loc.level === 'none' ? undefined : [address, loc.level === 'partial' && missing ? `puudub: ${missing}` : ''].filter(Boolean).join(' · ')}>
          <Badge tone={loc.level === 'complete' ? 'ok' : loc.level === 'partial' ? 'warn' : 'outline'}>
            {loc.level === 'complete' ? `täielik ${loc.completeAtMs != null ? formatMs(loc.completeAtMs) : ''}` : loc.level === 'partial' ? 'poolik' : 'ootab'}
          </Badge>
        </Row>
        <Row label="Teadvusel">{tri(facts.patient.conscious)}</Row>
        <Row label="Hingab">{tri(facts.patient.breathing)}</Row>
        <Row label="Sümptomid" detail={facts.symptomsReported.map((s) => label(s.symptom)).join(' · ') || undefined}>
          <Badge tone={facts.symptomsReported.length ? 'ok' : 'outline'}>{facts.symptomsReported.length}</Badge>
        </Row>
        <Row
          label="Seisundi muutus"
          detail={reported?.quote ? `„${reported.quote}“` : waiting && change ? `muutus ${formatMs(change.atMs)}, ootab teadet ${formatMs(Math.max(0, callMs - change.atMs))}` : undefined}
        >
          {reported ? <Badge tone="ok">teatatud {formatMs(reported.atMs)}</Badge> : waiting ? <Badge tone="warn">teatamata</Badge> : <Badge tone="outline">muutust pole</Badge>}
        </Row>
        <Row label="Abi" detail={dispatch?.type === 'ambulance_dispatched' ? `„${dispatch.address}“` : undefined}>
          {dispatch ? <Badge tone="ok">välja saadetud {formatMs(dispatch.atMs)}</Badge> : <Badge tone="outline">ootab</Badge>}
        </Row>
      </div>
    </Panel>
  );
}

function Row({ label, detail, children }: { label: string; detail?: string; children: ReactNode }) {
  return (
    <div className="py-3">
      <div className="relative flex items-center justify-between gap-3">
        <span className="text-[15px] leading-5 text-fg">{label}</span>
        {children}
      </div>
      <Expand show={Boolean(detail)}>
        <p className="break-words pt-1 text-[13px] leading-5 text-muted">{detail}</p>
      </Expand>
    </div>
  );
}

/** Rea olek tekstina: värv tähendab infot (öeldud / poolik / puudu), mitte kaunistust. Oleku muutudes vahetub tekst sujuvalt. */
function Badge({ tone = 'neutral', children }: { tone?: 'neutral' | 'outline' | 'ok' | 'warn' | 'danger'; children: ReactNode }) {
  const color = tone === 'ok' ? 'text-ok' : tone === 'warn' ? 'text-warn' : tone === 'danger' ? 'text-danger' : 'text-subtle';
  return (
    <Swap id={tone} className={`flex-none text-[15px] font-medium leading-5 ${color}`}>
      {children}
    </Swap>
  );
}
