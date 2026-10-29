import { Link } from 'react-router-dom';
import { cn } from '../../lib/format';

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn('size-8', className)} aria-hidden="true">
      <defs>
        <linearGradient id="nl-mark" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#A78BFA" />
          <stop offset="1" stopColor="#22D3EE" />
        </linearGradient>
      </defs>
      <rect x="0.5" y="0.5" width="31" height="31" rx="9" fill="#0A0A12" stroke="rgb(255 255 255 / .12)" />
      <path
        d="M13 5.5h6v5c0 1.2 3.5 3.2 3.5 7.5v7.5a2 2 0 0 1-2 2h-9a2 2 0 0 1-2-2V18c0-4.3 3.5-6.3 3.5-7.5z"
        fill="none"
        stroke="url(#nl-mark)"
        strokeWidth="1.6"
      />
      <path d="M11 19.5h10" stroke="#22D3EE" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({ to = '/', className, suffix }: { to?: string; className?: string; suffix?: string }) {
  return (
    <Link to={to} className={cn('group flex items-center gap-2.5', className)} aria-label="NEON LIQUOR — inicio">
      <LogoMark className="transition-transform duration-300 group-hover:rotate-[-8deg]" />
      <span className="font-display text-[13px] leading-none font-semibold tracking-[0.12em] whitespace-nowrap sm:text-[15px] sm:tracking-[0.14em]">
        NEON<span className="text-cyan"> LIQUOR</span>
      </span>
      {suffix && (
        <span className="rounded-md border border-line px-1.5 py-0.5 font-display text-[9px] font-semibold tracking-[0.18em] text-fg-subtle">
          {suffix}
        </span>
      )}
    </Link>
  );
}
