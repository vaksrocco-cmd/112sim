// RAPORT (Aaron, feat/stage). KNOWLEDGE.md 9.6 raporti vaade.
import type { AnalysisReport, CallSession } from '@/lib/types';
import { Badge, Card, Heading, Panel, Progress, Stack, Text } from '@/components/ui';
import { formatMs } from '@/components/sim/format';

const outcomeLabel = { good: 'Abi jõudis õigel ajal', delayed: 'Abi jõudis hilinemisega', bad: 'Abi ei jõudnud õigel ajal' } as const;

export function ReportView({ session, report }: { session: CallSession; report: AnalysisReport }) {
  // TODO(Aaron): ajajoon (transkript + sündmused), tõendite esiletõst, jagamise vaade.
  return (
    <Stack gap={4}>
      <Card>
        <Stack direction="row" align="between">
          <Heading level={1}>{report.score}/100</Heading>
          <Badge tone={report.outcome === 'good' ? 'ok' : report.outcome === 'delayed' ? 'warn' : 'danger'}>
            {outcomeLabel[report.outcome]}
          </Badge>
        </Stack>
        <Text tone="muted" size="sm">
          Kõne kestus {formatMs(report.times.durationMs)}
          {report.times.locationMs != null ? ` · aadress teada ${formatMs(report.times.locationMs)}` : ''}
        </Text>
      </Card>

      <Panel title="Hindamine">
        <Stack gap={3}>
          {report.rubric.map((r) => (
            <div key={r.id}>
              <Stack direction="row" align="between">
                <Text>{r.label}</Text>
                <Text mono>
                  {r.points}/{r.maxPoints}
                </Text>
              </Stack>
              <Progress value={r.maxPoints ? r.points / r.maxPoints : 0} tone={r.points === r.maxPoints ? 'ok' : 'warn'} />
              <Text size="sm" tone="muted">
                {r.why}
              </Text>
              {r.evidence ? (
                <Text size="sm" mono>
                  „{r.evidence}“
                </Text>
              ) : null}
            </div>
          ))}
        </Stack>
      </Panel>

      {report.missed.length ? (
        <Panel title="Mis jäi puudu">
          {report.missed.map((m) => (
            <Text key={m}>{m}</Text>
          ))}
        </Panel>
      ) : null}

      <Panel title="Kolm nõuannet">
        {report.tips.map((t) => (
          <Text key={t}>{t}</Text>
        ))}
      </Panel>

      {report.whatWouldHaveHappened ? (
        <Panel title="Mis oleks juhtunud">
          <Text>{report.whatWouldHaveHappened}</Text>
        </Panel>
      ) : null}

      <Text size="sm" tone="muted">
        Sessioon {session.id}
      </Text>
    </Stack>
  );
}
