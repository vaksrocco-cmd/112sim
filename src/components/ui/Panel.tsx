import type { ReactNode } from 'react';
import { cx } from './cx';

export function Panel({ title, children, className }: { title?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cx('rounded-card bg-surface p-5', className)}>
      {title ? <h2 className="type-label pb-4 text-subtle">{title}</h2> : null}
      {children}
    </section>
  );
}
