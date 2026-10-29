import type { ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Minus, Plus } from 'lucide-react';
import { cn, discountPercent, formatPrice } from '../../lib/format';

/** Aparece suavemente al entrar en pantalla (una sola vez). */
export function Reveal({
  children,
  delay = 0,
  className,
  y = 24,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  y?: number;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

export function Price({
  priceCents,
  salePriceCents,
  size = 'md',
  className,
}: {
  priceCents: number;
  salePriceCents: number | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const onSale = salePriceCents !== null && salePriceCents < priceCents;
  const final = onSale ? salePriceCents! : priceCents;
  return (
    <div className={cn('flex flex-wrap items-baseline gap-x-2 gap-y-0.5', className)}>
      <span
        className={cn(
          'font-display font-semibold tabular-nums',
          onSale ? 'text-magenta' : 'text-cyan',
          size === 'sm' && 'text-base',
          size === 'md' && 'text-lg',
          size === 'lg' && 'text-3xl md:text-4xl',
        )}
      >
        {formatPrice(final)}
      </span>
      {onSale && (
        <>
          <span className={cn('text-fg-subtle line-through tabular-nums', size === 'lg' ? 'text-lg' : 'text-sm')}>
            {formatPrice(priceCents)}
          </span>
          {size === 'lg' && (
            <span className="text-sm font-semibold text-magenta">Ahorras {discountPercent(priceCents, salePriceCents)}%</span>
          )}
        </>
      )}
    </div>
  );
}

export function QuantityStepper({
  value,
  onChange,
  max,
  min = 1,
  size = 'md',
}: {
  value: number;
  onChange: (n: number) => void;
  max: number;
  min?: number;
  size?: 'sm' | 'md';
}) {
  const btn = cn(
    'flex items-center justify-center text-fg-muted transition-colors hover:text-cyan disabled:opacity-30 disabled:hover:text-fg-muted',
    size === 'sm' ? 'size-8' : 'size-11',
  );
  return (
    <div className="inline-flex items-center rounded-xl border border-line bg-ink-800/80">
      <button type="button" className={btn} onClick={() => onChange(value - 1)} disabled={value <= min} aria-label="Disminuir cantidad">
        <Minus className="size-4" />
      </button>
      <span className={cn('min-w-8 text-center font-semibold tabular-nums', size === 'sm' ? 'text-sm' : 'text-base')} aria-live="polite">
        {value}
      </span>
      <button type="button" className={btn} onClick={() => onChange(value + 1)} disabled={value >= max} aria-label="Aumentar cantidad">
        <Plus className="size-4" />
      </button>
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-line px-6 py-16 text-center">
      <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-white/5 text-fg-subtle">{icon}</div>
      <h3 className="font-display text-lg font-semibold">{title}</h3>
      {description && <p className="mt-2 max-w-sm text-sm text-fg-muted">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 md:mb-10 md:flex-row md:items-end md:justify-between">
      <div className="max-w-2xl">
        {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
        <h2 className="font-display text-3xl leading-tight font-semibold md:text-4xl">{title}</h2>
        {description && <p className="mt-3 text-base text-fg-muted md:text-lg">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
