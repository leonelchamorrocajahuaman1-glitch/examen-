import { useId } from 'react';
import { BOTTOM, bottlePath, CX, SHAPES, shade } from '../../lib/bottleShapes';
import type { BottleShape } from '../../lib/types';

interface Props {
  shape: BottleShape;
  color: string;
  brand: string;
  name?: string;
  className?: string;
}

/** Botella vectorial generada con la forma y el color del producto (se usa cuando no hay foto). */
export function BottleArt({ shape, color, brand, name, className }: Props) {
  const raw = useId();
  const id = raw.replace(/[^a-zA-Z0-9_-]/g, '');
  const s = SHAPES[shape];
  const path = bottlePath(s);
  const capW = s.neckW + s.capWExtra;
  const labelW = s.bodyW * (s.opaque ? 1 : 0.8);
  const labelX = CX - labelW / 2;
  const brandText = brand.toUpperCase();
  // Unbounded es ancha (~0.84em por carácter con este espaciado): así el texto ocupa ~84% de la etiqueta.
  const brandSize = Math.max(5.5, Math.min(13, labelW / Math.max(brandText.length, 5)));
  const dark = shade(color, -0.55);
  const light = shade(color, 0.35);

  return (
    <svg viewBox="0 0 200 400" className={className} role="img" aria-label={name ? `${brand} ${name}` : brand}>
      <defs>
        <clipPath id={`${id}-clip`}>
          <path d={path} />
        </clipPath>
        <linearGradient id={`${id}-liquid`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={light} stopOpacity="0.95" />
          <stop offset="0.5" stopColor={color} stopOpacity="0.92" />
          <stop offset="1" stopColor={dark} stopOpacity="0.98" />
        </linearGradient>
        <linearGradient id={`${id}-glass`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.16" />
          <stop offset="0.25" stopColor="#ffffff" stopOpacity="0.04" />
          <stop offset="0.7" stopColor="#ffffff" stopOpacity="0.02" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0.14" />
        </linearGradient>
        <linearGradient id={`${id}-shine`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="0.5" stopColor="#ffffff" stopOpacity="0.55" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`${id}-can`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={dark} />
          <stop offset="0.35" stopColor={light} />
          <stop offset="0.6" stopColor={color} />
          <stop offset="1" stopColor={dark} />
        </linearGradient>
        <linearGradient id={`${id}-cap`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#1b1b26" />
          <stop offset="0.45" stopColor="#4a4a5e" />
          <stop offset="1" stopColor="#111118" />
        </linearGradient>
        <linearGradient id={`${id}-foil`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={shade(color, -0.6)} />
          <stop offset="0.45" stopColor={shade(color, 0.15)} />
          <stop offset="1" stopColor={shade(color, -0.7)} />
        </linearGradient>
        <radialGradient id={`${id}-floor`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor={color} stopOpacity="0.55" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Reflejo de luz en el suelo */}
      <ellipse cx={CX} cy={BOTTOM + 6} rx={s.bodyW * 0.75} ry="12" fill={`url(#${id}-floor)`} />

      {s.opaque ? (
        <g clipPath={`url(#${id}-clip)`}>
          <rect x="0" y="0" width="200" height="400" fill={`url(#${id}-can)`} />
          <rect x="0" y={s.neckTop} width="200" height="26" fill="#c9cad6" opacity="0.85" />
          <rect x="0" y={BOTTOM - 16} width="200" height="16" fill="#c9cad6" opacity="0.7" />
        </g>
      ) : (
        <>
          <path d={path} fill="#0b0b14" fillOpacity="0.55" />
          <g clipPath={`url(#${id}-clip)`}>
            <rect x="0" y={s.liquidTop} width="200" height={BOTTOM - s.liquidTop} fill={`url(#${id}-liquid)`} />
            <rect x="0" y={s.liquidTop} width="200" height="3" fill={light} opacity="0.9" />
          </g>
        </>
      )}

      <path d={path} fill={`url(#${id}-glass)`} />
      <path d={path} fill="none" stroke="#ffffff" strokeOpacity="0.28" strokeWidth="1.4" />

      {/* Etiqueta */}
      <g>
        <rect
          x={labelX}
          y={s.labelTop}
          width={labelW}
          height={s.labelH}
          rx={s.opaque ? 0 : 6}
          fill="#07070d"
          fillOpacity={s.opaque ? 0.55 : 0.88}
          clipPath={s.opaque ? `url(#${id}-clip)` : undefined}
        />
        <rect x={labelX + 8} y={s.labelTop + 8} width={labelW - 16} height="1.5" fill={light} opacity="0.85" />
        <text
          x={CX}
          y={s.labelTop + s.labelH / 2 + 2}
          textAnchor="middle"
          fill="#f4f4f8"
          fontFamily="Unbounded Variable, Unbounded, sans-serif"
          fontWeight="600"
          fontSize={brandSize}
          letterSpacing="0.06em"
        >
          {brandText}
        </text>
        <text
          x={CX}
          y={s.labelTop + s.labelH - 12}
          textAnchor="middle"
          fill={light}
          fontFamily="Manrope Variable, Manrope, sans-serif"
          fontWeight="600"
          fontSize="7"
          letterSpacing="0.32em"
        >
          NEON LIQUOR
        </text>
      </g>

      {/* Brillos del vidrio */}
      <rect
        x={CX - s.bodyW / 2 + 10}
        y={s.shoulderBottom + 6}
        width="9"
        height={BOTTOM - s.shoulderBottom - 30}
        rx="4.5"
        fill={`url(#${id}-shine)`}
        opacity="0.7"
        clipPath={`url(#${id}-clip)`}
      />
      <rect
        x={CX - s.neckW / 2 + 4}
        y={s.neckTop + 6}
        width="4"
        height={Math.max(0, s.neckBottom - s.neckTop - 10)}
        rx="2"
        fill="#ffffff"
        opacity="0.35"
      />

      {/* Tapa */}
      {s.cap !== 'none' && (
        <g>
          <rect
            x={CX - capW / 2}
            y={s.neckTop - s.capH + (s.cap === 'foil' ? s.capH * 0.6 : 0)}
            width={capW}
            height={s.cap === 'foil' ? s.capH * 0.4 + 26 : s.capH}
            rx={s.cap === 'cork' ? 6 : 4}
            fill={s.cap === 'foil' ? `url(#${id}-foil)` : `url(#${id}-cap)`}
          />
          {s.cap === 'cork' && <rect x={CX - capW / 2} y={s.neckTop - 8} width={capW} height="4" fill={light} opacity="0.8" />}
          {s.cap === 'metal' && (
            <rect x={CX - capW / 2 + 3} y={s.neckTop - s.capH + 4} width="3" height={s.capH - 8} rx="1.5" fill="#fff" opacity="0.25" />
          )}
        </g>
      )}
    </svg>
  );
}
