import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router-dom';
import { cn } from '../../lib/format';
import { Spinner } from './Spinner';

type Variant = 'primary' | 'secondary' | 'quiet' | 'danger' | 'accent';
type Size = 'sm' | 'md' | 'lg';

const base =
  'group relative inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-xl font-semibold transition-[background-color,border-color,color,box-shadow,transform] duration-200 ease-out-soft active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40';

const variants: Record<Variant, string> = {
  primary: 'bg-violet text-white hover:bg-[#8b4ef5] hover:shadow-glow',
  accent: 'bg-cyan text-ink-950 hover:bg-[#5ee3f5] hover:shadow-glow-cyan',
  secondary: 'glass text-fg hover:border-cyan/40 hover:text-white',
  quiet: 'text-fg-muted hover:text-fg hover:bg-white/5',
  danger: 'bg-danger/10 text-danger border border-danger/30 hover:bg-danger/20',
};

const sizes: Record<Size, string> = {
  sm: 'h-9 px-3.5 text-sm',
  md: 'h-11 px-5 text-sm',
  lg: 'h-13 px-7 text-[15px] tracking-wide',
};

export function buttonClass(variant: Variant = 'primary', size: Size = 'md', className?: string) {
  return cn(base, variants[variant], sizes[size], className);
}

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = 'primary', size = 'md', loading, icon, className, children, disabled, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={buttonClass(variant, size, className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <Spinner className="size-4" /> : icon}
      {children}
    </button>
  );
});

interface LinkButtonProps extends LinkProps {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
}

export function LinkButton({ variant = 'primary', size = 'md', icon, className, children, ...rest }: LinkButtonProps) {
  return (
    <Link className={buttonClass(variant, size, className)} {...rest}>
      {icon}
      {children}
    </Link>
  );
}
