import type { ReactNode } from 'react';
import { cx } from './cx';

const gaps = { 1: 'gap-1', 2: 'gap-2', 3: 'gap-3', 4: 'gap-4', 6: 'gap-6', 8: 'gap-8' } as const;

export function Stack({
  direction = 'col',
  gap = 3,
  align,
  className,
  children,
}: {
  direction?: 'row' | 'col';
  gap?: keyof typeof gaps;
  align?: 'start' | 'center' | 'end' | 'between';
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cx(
        'flex',
        direction === 'row' ? 'flex-row items-center' : 'flex-col',
        gaps[gap],
        align === 'between' && 'justify-between',
        align === 'center' && 'justify-center',
        align === 'end' && 'justify-end',
        className,
      )}
    >
      {children}
    </div>
  );
}
