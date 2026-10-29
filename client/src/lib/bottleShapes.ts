import type { BottleShape } from './types';

/**
 * Siluetas de botella en coordenadas SVG (viewBox 200×400, base en y=380).
 * Las usan tanto la ilustración vectorial como el modelo 3D procedural.
 */
export interface ShapeSpec {
  neckW: number;
  neckTop: number;
  neckBottom: number;
  shoulderBottom: number;
  bodyW: number;
  cornerR: number;
  /** Control de la curva del hombro (cuello → cuerpo). */
  k1: number;
  k2: number;
  /** Curvatura lateral del cuerpo (botellas redondeadas). */
  bulge: number;
  capH: number;
  capWExtra: number;
  cap: 'metal' | 'cork' | 'foil' | 'none';
  labelTop: number;
  labelH: number;
  liquidTop: number;
  opaque?: boolean;
}

export const BOTTOM = 380;
export const CX = 100;

export const SHAPES: Record<BottleShape, ShapeSpec> = {
  CLASSIC: { neckW: 30, neckTop: 54, neckBottom: 118, shoulderBottom: 178, bodyW: 124, cornerR: 16, k1: 30, k2: 36, bulge: 0, capH: 34, capWExtra: 8, cap: 'cork', labelTop: 214, labelH: 96, liquidTop: 150 },
  SQUARE: { neckW: 34, neckTop: 74, neckBottom: 128, shoulderBottom: 158, bodyW: 136, cornerR: 8, k1: 10, k2: 12, bulge: 0, capH: 38, capWExtra: 10, cap: 'metal', labelTop: 194, labelH: 112, liquidTop: 142 },
  TALL: { neckW: 30, neckTop: 30, neckBottom: 118, shoulderBottom: 178, bodyW: 100, cornerR: 14, k1: 28, k2: 40, bulge: 0, capH: 30, capWExtra: 6, cap: 'metal', labelTop: 224, labelH: 100, liquidTop: 152 },
  ROUND: { neckW: 32, neckTop: 72, neckBottom: 118, shoulderBottom: 192, bodyW: 142, cornerR: 42, k1: 34, k2: 56, bulge: 8, capH: 40, capWExtra: 12, cap: 'cork', labelTop: 226, labelH: 86, liquidTop: 162 },
  WINE: { neckW: 26, neckTop: 28, neckBottom: 140, shoulderBottom: 198, bodyW: 104, cornerR: 10, k1: 34, k2: 34, bulge: 0, capH: 46, capWExtra: 2, cap: 'foil', labelTop: 250, labelH: 80, liquidTop: 172 },
  CHAMPAGNE: { neckW: 30, neckTop: 36, neckBottom: 92, shoulderBottom: 222, bodyW: 114, cornerR: 14, k1: 72, k2: 70, bulge: 0, capH: 66, capWExtra: 4, cap: 'foil', labelTop: 256, labelH: 70, liquidTop: 192 },
  CAN: { neckW: 82, neckTop: 112, neckBottom: 118, shoulderBottom: 134, bodyW: 98, cornerR: 12, k1: 6, k2: 6, bulge: 0, capH: 0, capWExtra: 0, cap: 'none', labelTop: 160, labelH: 180, liquidTop: 0, opaque: true },
};

export function bottlePath(s: ShapeSpec) {
  const nl = CX - s.neckW / 2;
  const nr = CX + s.neckW / 2;
  const bl = CX - s.bodyW / 2;
  const br = CX + s.bodyW / 2;
  const r = s.cornerR;
  const midY = (s.shoulderBottom + BOTTOM - r) / 2;
  const leftSide = s.bulge
    ? `C ${bl - s.bulge} ${midY - 40} ${bl - s.bulge} ${midY + 40} ${bl} ${BOTTOM - r}`
    : `L ${bl} ${BOTTOM - r}`;
  const rightSide = s.bulge
    ? `C ${br + s.bulge} ${midY + 40} ${br + s.bulge} ${midY - 40} ${br} ${s.shoulderBottom}`
    : `L ${br} ${s.shoulderBottom}`;
  return [
    `M ${nl} ${s.neckTop}`,
    `L ${nl} ${s.neckBottom}`,
    `C ${nl} ${s.neckBottom + s.k1} ${bl} ${s.shoulderBottom - s.k2} ${bl} ${s.shoulderBottom}`,
    leftSide,
    `Q ${bl} ${BOTTOM} ${bl + r} ${BOTTOM}`,
    `L ${br - r} ${BOTTOM}`,
    `Q ${br} ${BOTTOM} ${br} ${BOTTOM - r}`,
    rightSide,
    `C ${br} ${s.shoulderBottom - s.k2} ${nr} ${s.neckBottom + s.k1} ${nr} ${s.neckBottom}`,
    `L ${nr} ${s.neckTop}`,
    'Z',
  ].join(' ');
}

/** Radio (en px SVG) de la silueta a la altura y; usado para el perfil del torno 3D. */
export function radiusAt(s: ShapeSpec, y: number) {
  const neckR = s.neckW / 2;
  const bodyR = s.bodyW / 2;
  if (y <= s.neckBottom) return neckR;
  if (y <= s.shoulderBottom) {
    const t = (y - s.neckBottom) / (s.shoulderBottom - s.neckBottom);
    // Curva de Bézier aproximada con una ease que respeta la "dureza" del hombro.
    const hardness = Math.min(1, (s.k1 + s.k2) / 120);
    const eased = hardness < 0.3 ? t : 1 - Math.pow(1 - t, 1.6 + hardness * 1.4);
    return neckR + (bodyR - neckR) * eased;
  }
  const bottomStart = BOTTOM - s.cornerR;
  if (y <= bottomStart) {
    if (!s.bulge) return bodyR;
    const t = (y - s.shoulderBottom) / (bottomStart - s.shoulderBottom);
    return bodyR + s.bulge * 0.75 * Math.sin(Math.PI * t);
  }
  const t = (y - bottomStart) / s.cornerR;
  return bodyR - s.cornerR + s.cornerR * Math.sqrt(Math.max(0, 1 - t * t));
}

export function shade(hex: string, amount: number) {
  const n = parseInt(hex.slice(1), 16);
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  const mix = (c: number) => (amount >= 0 ? c + (255 - c) * amount : c * (1 + amount));
  const r = clamp(mix((n >> 16) & 255));
  const g = clamp(mix((n >> 8) & 255));
  const b = clamp(mix(n & 255));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}
