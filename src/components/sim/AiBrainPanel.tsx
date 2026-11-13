'use client';
// Näitab, mida kohtunik on seni kõnest aru saanud (faktid). Tõde siin ei ole.
import type { ReactNode } from 'react';
import type { CallFacts, TriState } from '@/lib/types';
import { Badge, Panel, Stack, Text } from '@/components/ui';
import { formatMs } from './format';

function tri(v: TriState) {
  return v === 'yes' ? <Badge tone="ok">jah</Badge> : v === 'no' ? <Badge tone="danger">ei</Badge> : <Badge>teadmata</Badge>;
}

export function AiBrainPanel({ facts }: { facts: CallFacts }) {
  const loc = facts.location;
  return (
    <Panel title="Mida päästekorraldaja teab">
      <Stack gap={2}>
        <Row label="Mis juhtus">
          {facts.incident.said ? <Badge tone="ok">öeldud {facts.incident.atMs != null ? formatMs(facts.incident.atMs) : ''}</Badge> : <Badge>veel mitte</Badge>}
        </Row>
        <Row label="Asukoht">
          <Badge tone={loc.level === 'complete' ? 'ok' : loc.level === 'partial' ? 'warn' : 'neutral'}>
            {loc.level === 'complete' ? 'täpne' : loc.level === 'partial' ? 'osaline' : 'puudub'}
          </Badge>
        </Row>
        <Row label="Teadvusel">{tri(facts.patient.conscious)}</Row>
        <Row label="Hingab">{tri(facts.patient.breathing)}</Row>
        <Row label="Sümptomid">
          <Text size="sm">{facts.symptomsReported.length}</Text>
        </Row>
        <Row label="Muutustest teatatud">
          <Text size="sm">{facts.changeReports.length}</Text>
        </Row>
      </Stack>
    </Panel>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Stack direction="row" align="between">
      <Text size="sm" tone="muted">
        {label}
      </Text>
      {children}
    </Stack>
  );
}
