import type { ReactNode } from 'react';
import { cx } from './cx';

const widths = {
  /** Telefoni laiune veerg: kõnevaade. */
  phone: 'max-w-[430px]',
  /** Telefonis üks veerg, laual lai. */
  wide: 'max-w-[430px] md:max-w-3xl lg:max-w-6xl',
} as const;

/**
 * Lehe raam ohutusmärke all. `fill` teeb lehe täpselt ekraani kõrguseks (kõnevaade: miski ei keri,
 * nupud püsivad all); ilma selleta kasvab leht sisuga.
 */
export function Page({ width = 'phone', fill, className, children }: { width?: keyof typeof widths; fill?: boolean; className?: string; children: ReactNode }) {
  return (
    <div
      className={cx(
        'mx-auto flex w-full flex-col px-4 pt-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] md:px-8',
        fill ? 'h-[calc(100dvh-2.25rem)] min-h-[560px]' : 'flex-1',
        widths[width],
        className,
      )}
    >
      {children}
    </div>
  );
}
