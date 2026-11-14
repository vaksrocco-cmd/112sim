'use client';
// Raport avaneb kohe koodi arvutatud punktidega. See tükk ootab, kuni AI tagasiside on salvestatud, ja värskendab siis lehte.
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { CallSession } from '@/lib/types';

export function AwaitFeedback({ id }: { id: string }) {
  const router = useRouter();
  const [gaveUp, setGaveUp] = useState(false);
  useEffect(() => {
    let stop = false;
    void (async () => {
      for (let i = 0; i < 20 && !stop; i++) {
        await new Promise((r) => setTimeout(r, 1500));
        const res = await fetch(`/api/sessions/${id}`, { cache: 'no-store' }).catch(() => null);
        const s = res?.ok ? ((await res.json()) as CallSession) : null;
        if (s?.analysis && !s.analysis.aiPending) return router.refresh();
      }
      if (!stop) setGaveUp(true);
    })();
    return () => {
      stop = true;
    };
  }, [id, router]);
  if (gaveUp) return null;
  return <p className="gr-pulse text-[15px] leading-[22px] text-subtle">AI kirjutab tagasisidet…</p>;
}
