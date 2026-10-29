import { Router } from 'express';
import { z } from 'zod';
import { conflict } from '../../lib/errors.js';
import { prisma } from '../../lib/prisma.js';
import { slugify } from '../../lib/serializers.js';
import { parse } from '../../middleware/validate.js';

/* ─────────── Categorías ─────────── */

export const adminCategoriesRouter = Router();

const categorySchema = z.object({
  name: z.string().trim().min(2).max(60),
  description: z.string().trim().max(300).nullable().optional(),
  accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Color inválido').default('#8B5CF6'),
  isAlcoholic: z.boolean().default(true),
  sortOrder: z.coerce.number().int().min(0).max(999).default(0),
});

adminCategoriesRouter.get('/', async (_req, res) => {
  const items = await prisma.category.findMany({
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    include: { _count: { select: { products: true } } },
  });
  res.json(items.map(({ _count, ...c }) => ({ ...c, productCount: _count.products })));
});

adminCategoriesRouter.post('/', async (req, res) => {
  const data = parse(categorySchema, req.body);
  const item = await prisma.category.create({ data: { ...data, slug: slugify(data.name) } });
  res.status(201).json(item);
});

adminCategoriesRouter.put('/:id', async (req, res) => {
  const data = parse(categorySchema, req.body);
  const item = await prisma.category.update({
    where: { id: req.params.id },
    data: { ...data, slug: slugify(data.name) },
  });
  res.json(item);
});

adminCategoriesRouter.delete('/:id', async (req, res) => {
  const count = await prisma.product.count({ where: { categoryId: req.params.id } });
  if (count > 0) throw conflict(`La categoría tiene ${count} productos. Muévelos antes de eliminarla.`);
  await prisma.category.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

/* ─────────── Marcas ─────────── */

export const adminBrandsRouter = Router();

const brandSchema = z.object({
  name: z.string().trim().min(2).max(60),
  country: z.string().trim().max(60).nullable().optional(),
  description: z.string().trim().max(500).nullable().optional(),
  isPremium: z.boolean().default(false),
});

adminBrandsRouter.get('/', async (_req, res) => {
  const items = await prisma.brand.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { products: true } } },
  });
  res.json(items.map(({ _count, ...b }) => ({ ...b, productCount: _count.products })));
});

adminBrandsRouter.post('/', async (req, res) => {
  const data = parse(brandSchema, req.body);
  const item = await prisma.brand.create({ data: { ...data, slug: slugify(data.name) } });
  res.status(201).json(item);
});

adminBrandsRouter.put('/:id', async (req, res) => {
  const data = parse(brandSchema, req.body);
  const item = await prisma.brand.update({ where: { id: req.params.id }, data: { ...data, slug: slugify(data.name) } });
  res.json(item);
});

adminBrandsRouter.delete('/:id', async (req, res) => {
  const count = await prisma.product.count({ where: { brandId: req.params.id } });
  if (count > 0) throw conflict(`La marca tiene ${count} productos. Reasígnalos antes de eliminarla.`);
  await prisma.brand.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});
