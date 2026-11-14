'use client';
import { motion } from 'motion/react';
import { cx } from './cx';
import { soft } from './motion';

/** value 0..1. Riba täitub vedruga, kui see ekraanile jõuab. `track="strong"`: rada, mis paistab välja ka pinnal `surface`. */
export function Progress({ value, tone = 'accent', track = 'default' }: { value: number; tone?: 'accent' | 'ok' | 'warn'; track?: 'default' | 'strong' }) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <div
      className={cx('h-1 w-full overflow-hidden', track === 'strong' ? 'bg-border' : 'bg-surface-2')}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <motion.div
        className={cx('h-full', tone === 'ok' ? 'bg-ok' : tone === 'warn' ? 'bg-warn' : 'bg-accent')}
        style={{ width: `${pct}%`, originX: 0 }}
        initial={{ scaleX: 0 }}
        whileInView={{ scaleX: 1 }}
        viewport={{ once: true }}
        transition={{ ...soft, stiffness: 90, damping: 22, delay: 0.15 }}
      />
    </div>
  );
}
