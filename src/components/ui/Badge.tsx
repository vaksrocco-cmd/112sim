import type { ReactNode } from 'react';
import { cx } from './cx';

type Tone = 'neutral' | 'ok' | 'warn' | 'danger' | 'accent';
const tones: Record<Tone, string> = {
  neutral: 'text-muted border-border',
  ok: 'text-ok border-ok',
  warn: 'text-warn border-warn',
  danger: 'text-danger border-danger',
  accent: 'text-accent border-accent',
};

export function Badge({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return <span className={cx('inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium', tones[tone])}>{children}</span>;
}
