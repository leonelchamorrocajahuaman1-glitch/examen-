import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { parse } from '../../middleware/validate.js';

export const adminCouponsRouter = Router();

const date = z
  .string()
  .datetime({ offset: true })
  .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/))
  .nullable()
  .optional()
  .transform((v) => (v ? new Date(v.length === 10 ? `${v}T00:00:00-05:00` : v) : null));

const couponSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(3)
      .max(30)
      .regex(/^[A-Za-z0-9_-]+$/, 'Solo letras, números, guiones')
      .transform((v) => v.toUpperCase()),
    description: z.string().trim().max(200).nullable().optional(),
    type: z.enum(['PERCENT', 'FIXED']),
    value: z.coerce.number().int().min(1),
    minSubtotalCents: z.coerce.number().int().min(0).default(0),
    maxUses: z.coerce.number().int().min(1).nullable().optional(),
    startsAt: date,
    endsAt: date,
    isActive: z.boolean().default(true),
  })
  .refine((c) => c.type !== 'PERCENT' || c.value <= 100, { path: ['value'], message: 'Máximo 100%' })
  .refine((c) => !c.startsAt || !c.endsAt || c.startsAt < c.endsAt, {
    path: ['endsAt'],
    message: 'La fecha de fin debe ser posterior al inicio',
  });

adminCouponsRouter.get('/', async (_req, res) => {
  res.json(await prisma.coupon.findMany({ orderBy: { createdAt: 'desc' } }));
});

adminCouponsRouter.post('/', async (req, res) => {
  const data = parse(couponSchema, req.body);
  res.status(201).json(await prisma.coupon.create({ data: { ...data, maxUses: data.maxUses ?? null } }));
});

adminCouponsRouter.put('/:id', async (req, res) => {
  const data = parse(couponSchema, req.body);
  res.json(await prisma.coupon.update({ where: { id: req.params.id }, data: { ...data, maxUses: data.maxUses ?? null } }));
});

adminCouponsRouter.delete('/:id', async (req, res) => {
  const used = await prisma.order.count({ where: { couponId: req.params.id } });
  if (used > 0) {
    // Se conserva para el historial de pedidos.
    await prisma.coupon.update({ where: { id: req.params.id }, data: { isActive: false } });
    return res.json({ ok: true, archived: true, message: 'El cupón ya se usó en pedidos: se desactivó.' });
  }
  await prisma.coupon.delete({ where: { id: req.params.id } });
  res.json({ ok: true, archived: false });
});
