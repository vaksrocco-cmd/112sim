import type { ButtonHTMLAttributes } from 'react';
import { cx } from './cx';

type Variant = 'primary' | 'call' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg' | 'xl';

const variants: Record<Variant, string> = {
  primary: 'bg-primary text-primary-fg hover:opacity-[0.88]',
  call: 'bg-accent text-accent-fg hover:opacity-[0.88]',
  secondary: 'bg-surface-2 text-fg hover:bg-border',
  ghost: 'bg-transparent text-fg hover:bg-surface-2',
  danger: 'bg-danger text-accent-fg hover:opacity-[0.88]',
};
const sizes: Record<Size, string> = {
  sm: 'h-9 px-4',
  md: 'h-11 px-5',
  lg: 'h-12 px-6',
  xl: 'h-14 px-8',
};

/** Nupu klassid (terav nurk, suurtähtedes silt). Kasuta ka linkidel (`<Link className={buttonClass(...)}>`), et nupud ja lingid näeksid välja ühesugused. */
export function buttonClass({ variant = 'primary', size = 'md', block }: { variant?: Variant; size?: Size; block?: boolean } = {}) {
  return cx(
    'gr-press type-label inline-flex flex-none items-center justify-center rounded-inner text-center disabled:pointer-events-none disabled:opacity-45',
    variants[variant],
    sizes[size],
    block && 'w-full',
  );
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  block?: boolean;
}

export function Button({ variant = 'primary', size = 'md', block, className, type = 'button', ...rest }: ButtonProps) {
  return <button type={type} className={cx(buttonClass({ variant, size, block }), className)} {...rest} />;
}
