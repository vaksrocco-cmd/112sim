import type { ReactNode } from 'react';
import { cx } from './cx';

export function Panel({ title, children, className }: { title?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cx('rounded-card border border-border bg-surface', className)}>
      {title ? <header className="border-b border-border px-4 py-2 text-sm font-semibold text-muted">{title}</header> : null}
      <div className="p-4">{children}</div>
    </section>
  );
}
