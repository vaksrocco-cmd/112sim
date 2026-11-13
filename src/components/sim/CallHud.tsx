'use client';
import type { SimPhase } from '@/lib/sim/useSimulation';
import { Badge, Stack, Text } from '@/components/ui';
import { formatMs } from './format';

const labels: Record<SimPhase, string> = {
  idle: 'Ootel',
  intro: 'Sissejuhatus',
  ready: 'Valmis',
  connecting: 'Ühendan',
  in_call: 'Kõne käib',
  wrapping_up: 'Abi on kohal',
  ended: 'Kõne lõppes',
  analyzing: 'Analüüs',
};

export function CallHud({ phase, callMs, stateId }: { phase: SimPhase; callMs: number; stateId: string }) {
  const live = phase === 'in_call' || phase === 'wrapping_up';
  return (
    <Stack direction="row" align="between">
      <Badge tone={live ? 'accent' : 'neutral'}>{labels[phase]}</Badge>
      <Text mono size="lg">
        {formatMs(callMs)}
      </Text>
      {process.env.NODE_ENV !== 'production' ? <Badge>{stateId}</Badge> : <span />}
    </Stack>
  );
}
