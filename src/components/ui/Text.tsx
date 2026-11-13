import type { ReactNode } from 'react';
import { cx } from './cx';

type Tone = 'default' | 'muted' | 'ok' | 'warn' | 'danger';
const tones: Record<Tone, string> = {
  default: 'text-fg',
  muted: 'text-muted',
  ok: 'text-ok',
  warn: 'text-warn',
  danger: 'text-danger',
};

export function Text({
  tone = 'default',
  size = 'md',
  mono,
  className,
  children,
}: {
  tone?: Tone;
  size?: 'sm' | 'md' | 'lg';
  mono?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <p className={cx(tones[tone], size === 'sm' ? 'text-sm' : size === 'lg' ? 'text-lg' : 'text-base', mono && 'font-mono', className)}>
      {children}
    </p>
  );
}
