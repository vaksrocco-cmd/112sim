'use client';
// Skoor loeb nullist üles (KNOWLEDGE.md 15.3: skoori ilmumine). Server renderdab lõppväärtuse; liikumine on ainult kaunistus.
import { animate, useReducedMotion } from 'motion/react';
import { useEffect, useState } from 'react';

export function CountUp({ value, duration = 1.2 }: { value: number; duration?: number }) {
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(value);
  useEffect(() => {
    if (reduced) return;
    const controls = animate(0, value, { duration, ease: [0.22, 1, 0.36, 1], onUpdate: (v) => setShown(Math.round(v)) });
    return () => controls.stop();
  }, [value, duration, reduced]);
  return <>{shown}</>;
}
