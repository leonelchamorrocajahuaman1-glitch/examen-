import type { OrderStatus, PaymentMethod, PaymentStatus, Prisma } from '@prisma/client';
import { z } from 'zod';
import { getDeliveryOption, getPaymentOptions, LEGAL_AGE } from '../config/store.js';
import { badRequest, conflict, forbidden, notFound } from '../lib/errors.js';
import { prisma } from '../lib/prisma.js';
import { cartItemsSchema, quoteCart } from './pricing.js';

const text = (max: number) => z.string().trim().min(1, 'Obligatorio').max(max);
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => v || undefined);

export const checkoutSchema = z
  .object({
    items: cartItemsSchema.min(1, 'Tu carrito está vacío'),
    couponCode: optionalText(40),
    deliveryMethod: z.enum(['STANDARD', 'EXPRESS', 'PICKUP']),
    paymentMethod: z.enum(['CASH_ON_DELIVERY', 'BANK_TRANSFER', 'TEST']),
    customer: z.object({
      name: text(120),
      email: z.email('Correo inválido').max(160),
      phone: z.string().trim().regex(/^\+?[0-9\s-]{7,20}$/, 'Teléfono inválido'),
      document: optionalText(20),
    }),
    address: z
      .object({
        recipient: text(120),
        phone: z.string().trim().regex(/^\+?[0-9\s-]{7,20}$/, 'Teléfono inválido'),
        line1: text(200),
        line2: optionalText(200),
        district: text(80),
        city: text(80),
        region: text(80),
        reference: optionalText(200),
      })
      .optional(),
    notes: optionalText(500),
    ageConfirmed: z.literal(true, { error: `Debes confirmar que eres mayor de ${LEGAL_AGE} años` }),
  })
  .superRefine((data, ctx) => {
    if (getDeliveryOption(data.deliveryMethod)?.requiresAddress && !data.address) {
      ctx.addIssue({ code: 'custom', path: ['address'], message: 'La dirección de entrega es obligatoria' });
    }
  });

export type CheckoutInput = z.infer<typeof checkoutSchema>;

export function ageFrom(birthDate: Date, now = new Date()) {
  let age = now.getUTCFullYear() - birthDate.getUTCFullYear();
  const m = now.getUTCMonth() - birthDate.getUTCMonth();
  if (m < 0 || (m === 0 && now.getUTCDate() < birthDate.getUTCDate())) age--;
  return age;
}

export const orderDetailInclude = {
  items: {
    include: {
      product: {
        select: { slug: true, accentColor: true, bottleShape: true, images: { take: 1, orderBy: { sortOrder: 'asc' } } },
      },
    },
  },
  events: { orderBy: { createdAt: 'asc' } },
} satisfies Prisma.OrderInclude;

export async function createOrder(userId: string, input: CheckoutInput) {
  const payment = getPaymentOptions().find((p) => p.id === input.paymentMethod);
  if (!payment) throw badRequest('Ese método de pago no está disponible');

  const delivery = getDeliveryOption(input.deliveryMethod)!;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.isActive) throw forbidden();
  if (ageFrom(user.birthDate) < LEGAL_AGE) {
    throw forbidden(`La venta de bebidas alcohólicas es exclusiva para mayores de ${LEGAL_AGE} años`);
  }

  return prisma.$transaction(async (tx) => {
    const quote = await quoteCart(tx, input.items, {
      couponCode: input.couponCode,
      deliveryMethod: input.deliveryMethod,
    });

    if (quote.hasIssues) {
      throw conflict('Algunos productos de tu carrito cambiaron de disponibilidad', {
        lines: quote.lines.filter((l) => !l.available).map((l) => ({ productId: l.productId, issue: l.issue })),
      });
    }
    if (input.couponCode && !quote.coupon.valid) {
      throw badRequest(quote.coupon.message ?? 'Cupón inválido');
    }

    const isTest = payment.id === 'TEST';

    // Descuento de stock atómico: si otro pedido se llevó las últimas unidades, la condición falla.
    // Los pedidos de prueba reservan stock pero no cuentan como ventas (popularidad / más vendidos).
    for (const line of quote.lines) {
      const { count } = await tx.product.updateMany({
        where: { id: line.productId, isActive: true, stock: { gte: line.quantity } },
        data: {
          stock: { decrement: line.quantity },
          ...(isTest ? {} : { soldCount: { increment: line.quantity } }),
        },
      });
      if (count === 0) {
        throw conflict(`Ya no hay stock suficiente de "${line.product?.name}"`, {
          lines: [{ productId: line.productId, issue: 'Stock insuficiente' }],
        });
      }
    }

    if (quote.couponRecord) {
      const updated = await tx.$executeRaw`
        UPDATE "Coupon" SET "usedCount" = "usedCount" + 1
        WHERE "id" = ${quote.couponRecord.id} AND ("maxUses" IS NULL OR "usedCount" < "maxUses")`;
      if (updated === 0) throw conflict('El cupón ya alcanzó su límite de usos');
    }

    const status: OrderStatus = isTest ? 'CONFIRMED' : 'PENDING';
    const paymentStatus: PaymentStatus = isTest ? 'TEST_APPROVED' : 'PENDING';
    const address = delivery.requiresAddress ? input.address : undefined;

    const events: Prisma.OrderEventCreateWithoutOrderInput[] = [
      { status: 'PENDING', note: 'Pedido recibido' },
    ];
    if (isTest) {
      events.push({ status: 'CONFIRMED', note: 'Pago de PRUEBA aprobado automáticamente — no se realizó ningún cobro' });
    }

    return tx.order.create({
      data: {
        userId,
        status,
        paymentMethod: payment.id as PaymentMethod,
        paymentStatus,
        deliveryMethod: delivery.id,
        subtotalCents: quote.subtotalCents,
        discountCents: quote.discountCents,
        shippingCents: quote.shippingCents,
        totalCents: quote.totalCents,
        couponId: quote.couponRecord?.id,
        couponCode: quote.couponRecord?.code,
        customerName: input.customer.name,
        customerEmail: input.customer.email.toLowerCase(),
        customerPhone: input.customer.phone,
        customerDocument: input.customer.document,
        shipRecipient: address?.recipient,
        shipPhone: address?.phone,
        shipLine1: address?.line1,
        shipLine2: address?.line2,
        shipDistrict: address?.district,
        shipCity: address?.city,
        shipRegion: address?.region,
        shipReference: address?.reference,
        notes: input.notes,
        items: {
          create: quote.lines.map((l) => ({
            productId: l.productId,
            productName: l.product!.name,
            brandName: l.product!.brand.name,
            volumeMl: l.product!.volumeMl,
            unitPriceCents: l.unitPriceCents,
            quantity: l.quantity,
            lineTotalCents: l.lineTotalCents,
          })),
        },
        events: { create: events },
      },
      include: orderDetailInclude,
    });
  });
}

/** Transiciones de estado permitidas. */
export const STATUS_FLOW: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PREPARING', 'CANCELLED'],
  PREPARING: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
};

export async function changeOrderStatus(
  orderId: string,
  next: OrderStatus,
  opts: { note?: string; actorId?: string; restrictToUserId?: string },
) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId }, include: { items: true } });
    if (!order || (opts.restrictToUserId && order.userId !== opts.restrictToUserId)) throw notFound('Pedido no encontrado');
    if (!STATUS_FLOW[order.status].includes(next)) {
      throw badRequest(`No se puede pasar de ${order.status} a ${next}`);
    }

    // Bloqueo optimista: solo se actualiza si nadie cambió el estado mientras tanto.
    const { count } = await tx.order.updateMany({
      where: { id: orderId, status: order.status },
      data: {
        status: next,
        ...(next === 'DELIVERED' && order.paymentMethod === 'CASH_ON_DELIVERY' && order.paymentStatus === 'PENDING'
          ? { paymentStatus: 'PAID' as const }
          : {}),
      },
    });
    if (count === 0) throw conflict('El pedido fue modificado por otra persona. Recarga e inténtalo de nuevo.');

    if (next === 'CANCELLED') {
      for (const item of order.items) {
        if (!item.productId) continue;
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: { increment: item.quantity },
            ...(order.paymentMethod === 'TEST' ? {} : { soldCount: { decrement: item.quantity } }),
          },
        });
      }
      if (order.couponId) {
        await tx.$executeRaw`UPDATE "Coupon" SET "usedCount" = GREATEST("usedCount" - 1, 0) WHERE "id" = ${order.couponId}`;
      }
    }

    await tx.orderEvent.create({
      data: { orderId, status: next, note: opts.note, createdById: opts.actorId },
    });

    return tx.order.findUniqueOrThrow({ where: { id: orderId }, include: orderDetailInclude });
  });
}
