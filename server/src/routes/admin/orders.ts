import { Router } from 'express';
import type { Prisma } from '@prisma/client';
import { z } from 'zod';
import { notFound } from '../../lib/errors.js';
import { prisma } from '../../lib/prisma.js';
import { parse } from '../../middleware/validate.js';
import { changeOrderStatus, orderDetailInclude, STATUS_FLOW } from '../../services/orders.js';

export const adminOrdersRouter = Router();

const statusEnum = z.enum(['PENDING', 'CONFIRMED', 'PREPARING', 'SHIPPED', 'DELIVERED', 'CANCELLED']);

const listQuery = z.object({
  search: z.string().trim().max(80).optional(),
  status: statusEnum.optional(),
  payment: z.enum(['CASH_ON_DELIVERY', 'BANK_TRANSFER', 'TEST']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

adminOrdersRouter.get('/', async (req, res) => {
  const q = parse(listQuery, req.query);
  const where: Prisma.OrderWhereInput = {};
  if (q.status) where.status = q.status;
  if (q.payment) where.paymentMethod = q.payment;
  if (q.search) {
    const numeric = Number(q.search.replace(/\D/g, ''));
    where.OR = [
      { customerName: { contains: q.search, mode: 'insensitive' } },
      { customerEmail: { contains: q.search, mode: 'insensitive' } },
      ...(numeric ? [{ number: numeric }] : []),
    ];
  }
  const [items, total] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
      include: { _count: { select: { items: true } } },
    }),
    prisma.order.count({ where }),
  ]);
  res.json({ items, total, page: q.page, pageSize: q.pageSize, totalPages: Math.max(1, Math.ceil(total / q.pageSize)) });
});

adminOrdersRouter.get('/:id', async (req, res) => {
  const order = await prisma.order.findUnique({
    where: { id: req.params.id },
    include: {
      ...orderDetailInclude,
      user: { select: { id: true, email: true, firstName: true, lastName: true, phone: true } },
    },
  });
  if (!order) throw notFound('Pedido no encontrado');
  res.json({ ...order, allowedTransitions: STATUS_FLOW[order.status] });
});

adminOrdersRouter.patch('/:id/status', async (req, res) => {
  const { status, note } = parse(
    z.object({ status: statusEnum, note: z.string().trim().max(300).optional() }),
    req.body,
  );
  const order = await changeOrderStatus(req.params.id, status, { note, actorId: req.user!.id });
  res.json({ ...order, allowedTransitions: STATUS_FLOW[order.status] });
});

adminOrdersRouter.patch('/:id/payment', async (req, res) => {
  const { paymentStatus } = parse(
    z.object({ paymentStatus: z.enum(['PENDING', 'PAID', 'FAILED', 'REFUNDED']) }),
    req.body,
  );
  const existing = await prisma.order.findUnique({ where: { id: req.params.id } });
  if (!existing) throw notFound('Pedido no encontrado');
  if (existing.paymentMethod === 'TEST') {
    // Un pedido de prueba nunca se marca como pagado de verdad.
    return res.status(400).json({ error: { message: 'Los pedidos de prueba no admiten cambios de pago', code: 'TEST_ORDER' } });
  }
  await prisma.order.update({ where: { id: existing.id }, data: { paymentStatus } });
  await prisma.orderEvent.create({
    data: { orderId: existing.id, status: existing.status, note: `Pago marcado como ${paymentStatus}`, createdById: req.user!.id },
  });
  const order = await prisma.order.findUniqueOrThrow({ where: { id: existing.id }, include: orderDetailInclude });
  res.json({ ...order, allowedTransitions: STATUS_FLOW[order.status] });
});
