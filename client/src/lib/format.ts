import type { DeliveryMethod, OrderStatus, PaymentMethod, PaymentStatus } from './types';

const currency = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', minimumFractionDigits: 2 });

export const formatPrice = (cents: number) => currency.format(cents / 100);

export function formatVolume(ml: number) {
  if (ml >= 1000) return `${(ml / 1000).toLocaleString('es-PE', { maximumFractionDigits: 2 })} L`;
  return `${ml} ml`;
}

export function formatAbv(abv: number | null) {
  if (abv === null) return null;
  return abv === 0 ? '0.0% (sin alcohol)' : `${abv.toLocaleString('es-PE', { maximumFractionDigits: 1 })}% vol.`;
}

export const formatDate = (iso: string, withTime = false) =>
  new Intl.DateTimeFormat('es-PE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
    timeZone: 'America/Lima',
  }).format(new Date(iso));

export const orderNumber = (n: number) => `NL-${String(n).padStart(6, '0')}`;

export const discountPercent = (price: number, sale: number | null) =>
  sale === null ? 0 : Math.round(((price - sale) / price) * 100);

export const statusLabel: Record<OrderStatus, string> = {
  PENDING: 'Recibido',
  CONFIRMED: 'Confirmado',
  PREPARING: 'En preparación',
  SHIPPED: 'En camino',
  DELIVERED: 'Entregado',
  CANCELLED: 'Cancelado',
};

export const statusTone: Record<OrderStatus, 'neutral' | 'info' | 'violet' | 'warning' | 'success' | 'danger'> = {
  PENDING: 'warning',
  CONFIRMED: 'info',
  PREPARING: 'violet',
  SHIPPED: 'info',
  DELIVERED: 'success',
  CANCELLED: 'danger',
};

export const paymentMethodLabel: Record<PaymentMethod, string> = {
  CASH_ON_DELIVERY: 'Pago contra entrega',
  BANK_TRANSFER: 'Transferencia / Yape / Plin',
  TEST: 'Pago de prueba',
};

export const paymentStatusLabel: Record<PaymentStatus, string> = {
  PENDING: 'Pendiente',
  PAID: 'Pagado',
  TEST_APPROVED: 'Aprobado (prueba)',
  FAILED: 'Fallido',
  REFUNDED: 'Reembolsado',
};

export const deliveryLabel: Record<DeliveryMethod, string> = {
  STANDARD: 'Delivery estándar',
  EXPRESS: 'Delivery express',
  PICKUP: 'Recojo en tienda',
};

export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}
