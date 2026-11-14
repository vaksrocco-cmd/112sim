import type { ReactNode } from 'react';
import { cx } from './cx';

const styles = { 1: 'type-display text-[40px]', 2: 'type-title text-[24px]', 3: 'type-title text-[17px]' } as const;

export function Heading({ level = 2, children, className }: { level?: 1 | 2 | 3; children: ReactNode; className?: string }) {
  const Tag = (`h${level}` as 'h1' | 'h2' | 'h3');
  return <Tag className={cx('text-fg', styles[level], className)}>{children}</Tag>;
}
