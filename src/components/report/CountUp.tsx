'use client';
// Skoor loeb nullist üles (KNOWLEDGE.md 15.3: skoori ilmumine). Server renderdab lõppväärtuse; liikumine on ainult kaunistus.
import { useEffect, useState } from 'react';

export function CountUp({ value, durationMs = 1100 }: { value: number; durationMs?: number }) {
  const [shown, setShown] = useState(value);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / durationMs);
      setShown(Math.round(value * (1 - Math.pow(1 - p, 4))));
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, durationMs]);
  return <>{shown}</>;
}
