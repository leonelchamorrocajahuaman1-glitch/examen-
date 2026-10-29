import type { ReactNode } from 'react';
import { cn } from '../../lib/format';

export type Tone = 'neutral' | 'info' | 'violet' | 'warning' | 'success' | 'danger' | 'sale';

const tones: Record<Tone, string> = {
  neutral: 'bg-white/6 text-fg-muted border-line',
  info: 'bg-cyan/10 text-cyan border-cyan/25',
  violet: 'bg-violet/15 text-violet-glow border-violet/30',
  warning: 'bg-warning/10 text-warning border-warning/25',
  success: 'bg-success/10 text-success border-success/25',
  danger: 'bg-danger/10 text-danger border-danger/25',
  sale: 'bg-magenta/15 text-magenta border-magenta/30',
};

export function Badge({ tone = 'neutral', children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-wide whitespace-nowrap',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
