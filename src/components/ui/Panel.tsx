import type { ReactNode } from 'react';
import { cx } from './cx';

export function Panel({ title, children, className }: { title?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cx('rounded-card bg-surface shadow-sm', className)}>
      {title ? <header className="px-4 pt-4 text-sm font-semibold text-fg">{title}</header> : null}
      <div className="p-4">{children}</div>
    </section>
  );
}
