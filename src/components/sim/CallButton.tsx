'use client';
import type { SimPhase } from '@/lib/sim/useSimulation';
import { Button } from '@/components/ui';

export function CallButton({ phase, onCall, onHangUp }: { phase: SimPhase; onCall: () => void; onHangUp: () => void }) {
  if (phase === 'in_call' || phase === 'wrapping_up') {
    return (
      <Button variant="secondary" size="lg" onClick={onHangUp}>
        Lõpeta kõne
      </Button>
    );
  }
  if (phase === 'connecting') {
    return (
      <Button size="lg" disabled>
        Ühendan…
      </Button>
    );
  }
  if (phase === 'ended' || phase === 'analyzing') {
    return (
      <Button size="lg" disabled>
        Analüüsin kõnet…
      </Button>
    );
  }
  return (
    <Button size="lg" onClick={onCall} disabled={phase !== 'ready'}>
      Helista 112 (simulatsioon)
    </Button>
  );
}
