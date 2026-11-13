import type { ReactNode } from 'react';
import { cx } from './cx';

const styles = { 1: 'text-3xl font-bold', 2: 'text-2xl font-semibold', 3: 'text-lg font-semibold' } as const;

export function Heading({ level = 2, children, className }: { level?: 1 | 2 | 3; children: ReactNode; className?: string }) {
  const Tag = (`h${level}` as 'h1' | 'h2' | 'h3');
  return <Tag className={cx('text-fg', styles[level], className)}>{children}</Tag>;
}
