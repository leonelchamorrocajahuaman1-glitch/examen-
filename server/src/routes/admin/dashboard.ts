import { Router } from 'express';
import { prisma } from '../../lib/prisma.js';

export const dashboardRouter = Router();

const LOW_STOCK = 6;
const DAY_MS = 24 * 60 * 60 * 1000;
// Perú no usa horario de verano: UTC-5 todo el año.
const limaDate = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima' }).format(d);

dashboardRouter.get('/', async (_req, res) => {
  const now = new Date();
  const startOfToday = new Date(`${limaDate(now)}T00:00:00-05:00`);
  const since = new Date(startOfToday.getTime() - 13 * DAY_MS);

  // Las ventas reales excluyen pedidos cancelados y pedidos pagados en modo de prueba.
  const realSales = { status: { not: 'CANCELLED' as const }, paymentMethod: { not: 'TEST' as const } };

  const [
    revenue,
    ordersToday,
    pendingOrders,
    customers,
    testOrders,
    byStatus,
    lowStock,
    topProducts,
    recentOrders,
    daily,
  ] = await Promise.all([
    prisma.order.aggregate({ where: realSales, _sum: { totalCents: true }, _count: true }),
    prisma.order.count({ where: { createdAt: { gte: startOfToday } } }),
    prisma.order.count({ where: { status: 'PENDING' } }),
    prisma.user.count({ where: { role: 'CUSTOMER' } }),
    prisma.order.count({ where: { paymentMethod: 'TEST' } }),
    prisma.order.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.product.findMany({
      where: { isActive: true, stock: { lte: LOW_STOCK } },
      orderBy: { stock: 'asc' },
      take: 8,
      select: { id: true, name: true, stock: true, brand: { select: { name: true } } },
    }),
    prisma.product.findMany({
      where: { soldCount: { gt: 0 } },
      orderBy: { soldCount: 'desc' },
      take: 5,
      select: { id: true, name: true, soldCount: true, priceCents: true, brand: { select: { name: true } } },
    }),
    prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      take: 8,
      select: {
        id: true,
        number: true,
        customerName: true,
        totalCents: true,
        status: true,
        paymentMethod: true,
        paymentStatus: true,
        createdAt: true,
      },
    }),
    prisma.$queryRaw<{ day: string; total: bigint; orders: bigint }[]>`
      SELECT to_char(("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'America/Lima', 'YYYY-MM-DD') AS day,
             COALESCE(SUM("totalCents"), 0)::bigint AS total,
             COUNT(*)::bigint AS orders
      FROM "Order"
      WHERE "createdAt" >= ${since} AND "status" <> 'CANCELLED' AND "paymentMethod" <> 'TEST'
      GROUP BY 1 ORDER BY 1`,
  ]);

  const dailyMap = new Map(daily.map((d) => [d.day, d]));
  const salesByDay = Array.from({ length: 14 }, (_, i) => {
    const key = limaDate(new Date(since.getTime() + i * DAY_MS + DAY_MS / 2));
    const row = dailyMap.get(key);
    return { date: key, totalCents: Number(row?.total ?? 0), orders: Number(row?.orders ?? 0) };
  });

  res.json({
    revenueCents: revenue._sum.totalCents ?? 0,
    salesCount: revenue._count,
    ordersToday,
    pendingOrders,
    customers,
    testOrders,
    ordersByStatus: Object.fromEntries(byStatus.map((s) => [s.status, s._count._all])),
    lowStock,
    lowStockThreshold: LOW_STOCK,
    topProducts,
    recentOrders,
    salesByDay,
  });
});
