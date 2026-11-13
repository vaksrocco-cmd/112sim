import type { ButtonHTMLAttributes } from 'react';
import { cx } from './cx';

type Variant = 'primary' | 'call' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

const variants: Record<Variant, string> = {
  primary: 'bg-primary text-primary-fg hover:opacity-[0.88]',
  call: 'bg-accent text-accent-fg hover:opacity-[0.88]',
  secondary: 'bg-surface-2 text-fg hover:bg-border',
  ghost: 'bg-transparent text-fg hover:bg-surface-2',
  danger: 'bg-danger text-accent-fg hover:opacity-[0.88]',
};
const sizes: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-base',
  lg: 'px-6 py-3 text-lg',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export function Button({ variant = 'primary', size = 'md', className, ...rest }: ButtonProps) {
  return (
    <button
      className={cx(
        'rounded-full font-medium transition-[color,background-color,opacity] duration-150 ease-out disabled:pointer-events-none disabled:opacity-45',
        variants[variant],
        sizes[size],
        className,
      )}
      {...rest}
    />
  );
}
