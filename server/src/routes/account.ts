import { Router } from 'express';
import { z } from 'zod';
import { hashPassword, verifyPassword } from '../lib/crypto.js';
import { badRequest, notFound } from '../lib/errors.js';
import { prisma } from '../lib/prisma.js';
import { productInclude, serializeProduct } from '../lib/serializers.js';
import { destroyAllSessions } from '../lib/session.js';
import { requireAuth } from '../middleware/auth.js';
import { parse } from '../middleware/validate.js';
import { changeOrderStatus, checkoutSchema, createOrder, orderDetailInclude } from '../services/orders.js';
import { passwordSchema, publicUser } from './auth.js';

export const accountRouter = Router();
accountRouter.use(requireAuth);

const phone = z.string().trim().regex(/^\+?[0-9\s-]{7,20}$/, 'Teléfono inválido');
const optional = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((v) => v || null);

/* ─────────── Perfil ─────────── */

const profileSchema = z.object({
  firstName: z.string().trim().min(2).max(60),
  lastName: z.string().trim().min(2).max(60),
  phone: phone.optional().nullable().or(z.literal('').transform(() => null)),
  documentId: z
    .string()
    .trim()
    .regex(/^[0-9A-Za-z-]{8,15}$/, 'Documento inválido')
    .optional()
    .nullable()
    .or(z.literal('').transform(() => null)),
});

accountRouter.patch('/profile', async (req, res) => {
  const data = parse(profileSchema, req.body);
  const user = await prisma.user.update({ where: { id: req.user!.id }, data });
  res.json({ user: publicUser(user) });
});

accountRouter.post('/change-password', async (req, res) => {
  const { currentPassword, newPassword } = parse(
    z.object({ currentPassword: z.string().min(1).max(128), newPassword: passwordSchema }),
    req.body,
  );
  const user = await prisma.user.findUniqueOrThrow({ where: { id: req.user!.id } });
  if (!(await verifyPassword(user.passwordHash, currentPassword))) {
    throw badRequest('La contraseña actual no es correcta', { fields: { currentPassword: 'Contraseña incorrecta' } });
  }
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(newPassword) } });
  // Mantiene esta sesión y cierra las demás.
  await destroyAllSessions(user.id, req.sessionId);
  res.json({ ok: true });
});

/* ─────────── Direcciones ─────────── */

const addressSchema = z.object({
  label: z.string().trim().min(1).max(40),
  recipient: z.string().trim().min(2).max(120),
  phone,
  line1: z.string().trim().min(3).max(200),
  line2: optional(200),
  district: z.string().trim().min(2).max(80),
  city: z.string().trim().min(2).max(80),
  region: z.string().trim().min(2).max(80),
  reference: optional(200),
  isDefault: z.boolean().optional().default(false),
});

accountRouter.get('/addresses', async (req, res) => {
  const addresses = await prisma.address.findMany({
    where: { userId: req.user!.id },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
  });
  res.json(addresses);
});

accountRouter.post('/addresses', async (req, res) => {
  const data = parse(addressSchema, req.body);
  const userId = req.user!.id;
  const count = await prisma.address.count({ where: { userId } });
  if (count >= 10) throw badRequest('Puedes guardar hasta 10 direcciones');

  const isDefault = data.isDefault || count === 0;
  const address = await prisma.$transaction(async (tx) => {
    if (isDefault) await tx.address.updateMany({ where: { userId }, data: { isDefault: false } });
    return tx.address.create({ data: { ...data, isDefault, userId } });
  });
  res.status(201).json(address);
});

accountRouter.patch('/addresses/:id', async (req, res) => {
  const data = parse(addressSchema.partial(), req.body);
  const userId = req.user!.id;
  const existing = await prisma.address.findFirst({ where: { id: req.params.id, userId } });
  if (!existing) throw notFound('Dirección no encontrada');

  const address = await prisma.$transaction(async (tx) => {
    if (data.isDefault) await tx.address.updateMany({ where: { userId }, data: { isDefault: false } });
    return tx.address.update({ where: { id: existing.id }, data });
  });
  res.json(address);
});

accountRouter.delete('/addresses/:id', async (req, res) => {
  const userId = req.user!.id;
  const existing = await prisma.address.findFirst({ where: { id: req.params.id, userId } });
  if (!existing) throw notFound('Dirección no encontrada');
  await prisma.address.delete({ where: { id: existing.id } });
  if (existing.isDefault) {
    const next = await prisma.address.findFirst({ where: { userId }, orderBy: { createdAt: 'asc' } });
    if (next) await prisma.address.update({ where: { id: next.id }, data: { isDefault: true } });
  }
  res.json({ ok: true });
});

/* ─────────── Favoritos ─────────── */

accountRouter.get('/favorites', async (req, res) => {
  const favorites = await prisma.favorite.findMany({
    where: { userId: req.user!.id, product: { isActive: true } },
    include: { product: { include: productInclude } },
    orderBy: { createdAt: 'desc' },
  });
  res.json(favorites.map((f) => serializeProduct(f.product)));
});

accountRouter.get('/favorites/ids', async (req, res) => {
  const favorites = await prisma.favorite.findMany({ where: { userId: req.user!.id }, select: { productId: true } });
  res.json(favorites.map((f) => f.productId));
});

accountRouter.post('/favorites/:productId', async (req, res) => {
  const product = await prisma.product.findFirst({ where: { id: req.params.productId, isActive: true }, select: { id: true } });
  if (!product) throw notFound('Producto no encontrado');
  await prisma.favorite.upsert({
    where: { userId_productId: { userId: req.user!.id, productId: product.id } },
    create: { userId: req.user!.id, productId: product.id },
    update: {},
  });
  res.status(201).json({ ok: true });
});

accountRouter.delete('/favorites/:productId', async (req, res) => {
  await prisma.favorite.deleteMany({ where: { userId: req.user!.id, productId: req.params.productId } });
  res.json({ ok: true });
});

/* ─────────── Pedidos ─────────── */

accountRouter.post('/orders', async (req, res) => {
  const input = parse(checkoutSchema, req.body);
  const order = await createOrder(req.user!.id, input);
  res.status(201).json(order);
});

accountRouter.get('/orders', async (req, res) => {
  const orders = await prisma.order.findMany({
    where: { userId: req.user!.id },
    orderBy: { createdAt: 'desc' },
    include: { items: { select: { productName: true, quantity: true } } },
    take: 100,
  });
  res.json(orders);
});

accountRouter.get('/orders/:id', async (req, res) => {
  const order = await prisma.order.findFirst({
    where: { id: req.params.id, userId: req.user!.id },
    include: orderDetailInclude,
  });
  if (!order) throw notFound('Pedido no encontrado');
  res.json(order);
});

accountRouter.post('/orders/:id/cancel', async (req, res) => {
  const order = await prisma.order.findFirst({ where: { id: req.params.id, userId: req.user!.id } });
  if (!order) throw notFound('Pedido no encontrado');
  if (order.status !== 'PENDING') {
    throw badRequest('Solo puedes cancelar pedidos que aún no han sido confirmados. Contáctanos para ayudarte.');
  }
  const updated = await changeOrderStatus(order.id, 'CANCELLED', {
    note: 'Cancelado por el cliente',
    actorId: req.user!.id,
    restrictToUserId: req.user!.id,
  });
  res.json(updated);
});
