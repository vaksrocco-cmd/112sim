import type { HTMLAttributes } from 'react';
import { cx } from './cx';

export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cx('rounded-card bg-surface p-4 shadow-sm transition-colors duration-150 ease-out', className)} {...rest} />;
}
