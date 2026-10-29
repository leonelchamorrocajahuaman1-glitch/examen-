import type { Coupon, DeliveryMethod, Prisma } from '@prisma/client';
import { z } from 'zod';
import { getDeliveryOption, MAX_CART_LINES, MAX_QTY_PER_ITEM } from '../config/store.js';
import { prisma } from '../lib/prisma.js';
import { effectivePrice, productInclude, serializeProduct } from '../lib/serializers.js';

export const cartItemsSchema = z
  .array(
    z.object({
      productId: z.string().min(1).max(40),
      quantity: z.coerce.number().int().min(1).max(MAX_QTY_PER_ITEM),
    }),
  )
  .max(MAX_CART_LINES, `Máximo ${MAX_CART_LINES} productos distintos por pedido`);

export type CartItemInput = z.infer<typeof cartItemsSchema>;

export interface QuoteLine {
  productId: string;
  quantity: number;
  available: boolean;
  issue: string | null;
  maxQuantity: number;
  unitPriceCents: number;
  lineTotalCents: number;
  product: ReturnType<typeof serializeProduct> | null;
}

type Db = Prisma.TransactionClient | typeof prisma;

export interface CouponResult {
  coupon: Coupon | null;
  code: string | null;
  valid: boolean;
  message: string | null;
}

export async function evaluateCoupon(db: Db, rawCode: string | undefined | null, subtotalCents: number) {
  const code = rawCode?.trim().toUpperCase() || null;
  if (!code) return { coupon: null, code: null, valid: false, message: null } satisfies CouponResult;

  const coupon = await db.coupon.findUnique({ where: { code } });
  const now = new Date();
  const fail = (message: string): CouponResult => ({ coupon: null, code, valid: false, message });

  if (!coupon || !coupon.isActive) return fail('El cupón no existe o no está activo');
  if (coupon.startsAt && coupon.startsAt > now) return fail('El cupón todavía no está vigente');
  if (coupon.endsAt && coupon.endsAt < now) return fail('El cupón ha expirado');
  if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) return fail('El cupón ya alcanzó su límite de usos');
  if (subtotalCents < coupon.minSubtotalCents) {
    return fail(`Este cupón requiere una compra mínima de S/ ${(coupon.minSubtotalCents / 100).toFixed(2)}`);
  }
  return { coupon, code, valid: true, message: coupon.description ?? 'Cupón aplicado' } satisfies CouponResult;
}

export function discountFor(coupon: Coupon | null, subtotalCents: number) {
  if (!coupon) return 0;
  if (coupon.type === 'PERCENT') return Math.floor((subtotalCents * Math.min(coupon.value, 100)) / 100);
  return Math.min(coupon.value, subtotalCents);
}

export function shippingFor(method: DeliveryMethod | undefined, amountAfterDiscount: number) {
  if (!method) return 0;
  const option = getDeliveryOption(method);
  if (!option) return 0;
  if (option.freeOverCents !== null && amountAfterDiscount >= option.freeOverCents) return 0;
  return option.priceCents;
}

/**
 * Calcula el carrito con precios y stock actuales de la base de datos.
 * El cliente nunca decide precios: solo envía ids y cantidades.
 */
export async function quoteCart(
  db: Db,
  items: CartItemInput,
  opts: { couponCode?: string | null; deliveryMethod?: DeliveryMethod },
) {
  const merged = new Map<string, number>();
  for (const item of items) merged.set(item.productId, (merged.get(item.productId) ?? 0) + item.quantity);

  const products = await db.product.findMany({
    where: { id: { in: [...merged.keys()] } },
    include: productInclude,
  });
  const byId = new Map(products.map((p) => [p.id, p]));

  const lines: QuoteLine[] = [...merged.entries()].map(([productId, requested]) => {
    const p = byId.get(productId);
    if (!p || !p.isActive) {
      return {
        productId,
        quantity: requested,
        available: false,
        issue: 'Producto no disponible',
        maxQuantity: 0,
        unitPriceCents: 0,
        lineTotalCents: 0,
        product: null,
      };
    }
    const quantity = Math.min(requested, MAX_QTY_PER_ITEM);
    const unitPriceCents = effectivePrice(p);
    let issue: string | null = null;
    if (p.stock <= 0) issue = 'Agotado';
    else if (p.stock < quantity) issue = `Solo quedan ${p.stock} unidades`;
    return {
      productId,
      quantity,
      available: issue === null,
      issue,
      maxQuantity: Math.min(p.stock, MAX_QTY_PER_ITEM),
      unitPriceCents,
      lineTotalCents: unitPriceCents * quantity,
      product: serializeProduct(p),
    };
  });

  const subtotalCents = lines.reduce((sum, l) => sum + (l.available ? l.lineTotalCents : 0), 0);
  const couponResult = await evaluateCoupon(db, opts.couponCode, subtotalCents);
  const discountCents = discountFor(couponResult.coupon, subtotalCents);
  const shippingCents = lines.length ? shippingFor(opts.deliveryMethod, subtotalCents - discountCents) : 0;
  const totalCents = subtotalCents - discountCents + shippingCents;

  return {
    lines,
    hasIssues: lines.some((l) => !l.available),
    subtotalCents,
    discountCents,
    shippingCents,
    totalCents,
    coupon: {
      code: couponResult.code,
      valid: couponResult.valid,
      message: couponResult.message,
    },
    couponRecord: couponResult.coupon,
  };
}
