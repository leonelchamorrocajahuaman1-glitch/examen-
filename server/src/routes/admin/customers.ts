import { Router } from 'express';
import type { Prisma } from '@prisma/client';
import { z } from 'zod';
import { badRequest, notFound } from '../../lib/errors.js';
import { prisma } from '../../lib/prisma.js';
import { destroyAllSessions } from '../../lib/session.js';
import { parse } from '../../middleware/validate.js';

export const adminCustomersRouter = Router();

const userSelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  phone: true,
  role: true,
  isActive: true,
  createdAt: true,
  lastLoginAt: true,
} satisfies Prisma.UserSelect;

adminCustomersRouter.get('/', async (req, res) => {
  const q = parse(
    z.object({
      search: z.string().trim().max(80).optional(),
      role: z.enum(['CUSTOMER', 'ADMIN']).optional(),
      page: z.coerce.number().int().min(1).default(1),
      pageSize: z.coerce.number().int().min(1).max(100).default(20),
    }),
    req.query,
  );
  const where: Prisma.UserWhereInput = {};
  if (q.role) where.role = q.role;
  if (q.search) {
    where.OR = [
      { email: { contains: q.search, mode: 'insensitive' } },
      { firstName: { contains: q.search, mode: 'insensitive' } },
      { lastName: { contains: q.search, mode: 'insensitive' } },
    ];
  }
  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: { ...userSelect, _count: { select: { orders: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
    }),
    prisma.user.count({ where }),
  ]);

  const spent = await prisma.order.groupBy({
    by: ['userId'],
    where: { userId: { in: users.map((u) => u.id) }, status: { not: 'CANCELLED' }, paymentMethod: { not: 'TEST' } },
    _sum: { totalCents: true },
  });
  const spentMap = new Map(spent.map((s) => [s.userId, s._sum.totalCents ?? 0]));

  res.json({
    items: users.map(({ _count, ...u }) => ({ ...u, orderCount: _count.orders, totalSpentCents: spentMap.get(u.id) ?? 0 })),
    total,
    page: q.page,
    pageSize: q.pageSize,
    totalPages: Math.max(1, Math.ceil(total / q.pageSize)),
  });
});

adminCustomersRouter.get('/:id', async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.params.id },
    select: {
      ...userSelect,
      birthDate: true,
      documentId: true,
      addresses: true,
      orders: { orderBy: { createdAt: 'desc' }, take: 50 },
    },
  });
  if (!user) throw notFound('Cliente no encontrado');
  res.json(user);
});

adminCustomersRouter.patch('/:id', async (req, res) => {
  const { isActive } = parse(z.object({ isActive: z.boolean() }), req.body);
  if (req.params.id === req.user!.id) throw badRequest('No puedes desactivar tu propia cuenta');
  const user = await prisma.user.update({ where: { id: req.params.id }, data: { isActive }, select: userSelect });
  if (!isActive) await destroyAllSessions(user.id);
  res.json(user);
});
