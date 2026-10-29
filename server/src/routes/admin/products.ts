import { Router } from 'express';
import type { Prisma } from '@prisma/client';
import { z } from 'zod';
import { badRequest, notFound } from '../../lib/errors.js';
import { prisma } from '../../lib/prisma.js';
import { productInclude, serializeProduct, slugify } from '../../lib/serializers.js';
import { imageUpload, removeImage, saveImage } from '../../lib/uploads.js';
import { parse } from '../../middleware/validate.js';

export const adminProductsRouter = Router();

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Color hexadecimal inválido (#RRGGBB)');
const money = z.coerce.number().int().min(0).max(100_000_000);

const productSchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    slug: z
      .string()
      .trim()
      .max(80)
      .regex(/^[a-z0-9-]*$/, 'Solo minúsculas, números y guiones')
      .optional(),
    brandId: z.string().min(1, 'Selecciona una marca'),
    categoryId: z.string().min(1, 'Selecciona una categoría'),
    shortDescription: z.string().trim().min(5).max(200),
    description: z.string().trim().min(10).max(5000),
    presentation: z.string().trim().min(2).max(80),
    volumeMl: z.coerce.number().int().min(1).max(20000),
    abv: z.coerce.number().min(0).max(96).nullable().optional(),
    origin: z.string().trim().max(80).nullable().optional(),
    tastingNotes: z.array(z.string().trim().min(1).max(40)).max(8).default([]),
    priceCents: money.min(1, 'El precio debe ser mayor a 0'),
    salePriceCents: money.nullable().optional(),
    stock: z.coerce.number().int().min(0).max(1_000_000),
    isActive: z.boolean().default(true),
    isFeatured: z.boolean().default(false),
    accentColor: hex.default('#8B5CF6'),
    bottleShape: z.enum(['CLASSIC', 'SQUARE', 'TALL', 'ROUND', 'WINE', 'CHAMPAGNE', 'CAN']).default('CLASSIC'),
  })
  .refine((d) => d.salePriceCents == null || d.salePriceCents < d.priceCents, {
    path: ['salePriceCents'],
    message: 'El precio de oferta debe ser menor al precio normal',
  });

const listQuery = z.object({
  search: z.string().trim().max(80).optional(),
  category: z.string().optional(),
  status: z.enum(['all', 'active', 'inactive', 'low_stock', 'out_of_stock']).default('all'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

adminProductsRouter.get('/', async (req, res) => {
  const q = parse(listQuery, req.query);
  const where: Prisma.ProductWhereInput = {};
  if (q.search) {
    where.OR = [
      { name: { contains: q.search, mode: 'insensitive' } },
      { brand: { name: { contains: q.search, mode: 'insensitive' } } },
      { slug: { contains: q.search, mode: 'insensitive' } },
    ];
  }
  if (q.category) where.categoryId = q.category;
  if (q.status === 'active') where.isActive = true;
  if (q.status === 'inactive') where.isActive = false;
  if (q.status === 'low_stock') where.stock = { gt: 0, lte: 6 };
  if (q.status === 'out_of_stock') where.stock = 0;

  const [items, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: productInclude,
      orderBy: { updatedAt: 'desc' },
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
    }),
    prisma.product.count({ where }),
  ]);
  res.json({
    items: items.map(serializeProduct),
    total,
    page: q.page,
    pageSize: q.pageSize,
    totalPages: Math.max(1, Math.ceil(total / q.pageSize)),
  });
});

adminProductsRouter.get('/:id', async (req, res) => {
  const product = await prisma.product.findUnique({ where: { id: req.params.id }, include: productInclude });
  if (!product) throw notFound('Producto no encontrado');
  res.json(serializeProduct(product));
});

async function uniqueSlug(base: string, excludeId?: string) {
  const root = slugify(base) || 'producto';
  let slug = root;
  for (let i = 2; ; i++) {
    const clash = await prisma.product.findFirst({
      where: { slug, ...(excludeId ? { id: { not: excludeId } } : {}) },
      select: { id: true },
    });
    if (!clash) return slug;
    slug = `${root}-${i}`;
  }
}

adminProductsRouter.post('/', async (req, res) => {
  const { slug, ...data } = parse(productSchema, req.body);
  const product = await prisma.product.create({
    data: { ...data, slug: await uniqueSlug(slug || data.name), salePriceCents: data.salePriceCents ?? null },
    include: productInclude,
  });
  res.status(201).json(serializeProduct(product));
});

adminProductsRouter.put('/:id', async (req, res) => {
  const { slug, ...data } = parse(productSchema, req.body);
  const exists = await prisma.product.findUnique({ where: { id: req.params.id }, select: { id: true } });
  if (!exists) throw notFound('Producto no encontrado');
  const product = await prisma.product.update({
    where: { id: exists.id },
    data: {
      ...data,
      slug: await uniqueSlug(slug || data.name, exists.id),
      salePriceCents: data.salePriceCents ?? null,
      abv: data.abv ?? null,
      origin: data.origin ?? null,
    },
    include: productInclude,
  });
  res.json(serializeProduct(product));
});

const quickSchema = z.object({
  stock: z.coerce.number().int().min(0).max(1_000_000).optional(),
  isActive: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
});

adminProductsRouter.patch('/:id', async (req, res) => {
  const data = parse(quickSchema, req.body);
  const product = await prisma.product.update({ where: { id: req.params.id }, data, include: productInclude });
  res.json(serializeProduct(product));
});

adminProductsRouter.delete('/:id', async (req, res) => {
  const product = await prisma.product.findUnique({
    where: { id: req.params.id },
    include: { images: true, _count: { select: { orderItems: true } } },
  });
  if (!product) throw notFound('Producto no encontrado');

  // Si ya aparece en pedidos, se desactiva para conservar el historial.
  if (product._count.orderItems > 0) {
    await prisma.product.update({ where: { id: product.id }, data: { isActive: false, isFeatured: false } });
    return res.json({ ok: true, archived: true, message: 'El producto tiene pedidos asociados: se desactivó en lugar de eliminarse.' });
  }
  await prisma.product.delete({ where: { id: product.id } });
  await Promise.all(product.images.map((img) => removeImage(img.url)));
  res.json({ ok: true, archived: false });
});

adminProductsRouter.post('/:id/images', imageUpload.array('images', 6), async (req, res) => {
  const product = await prisma.product.findUnique({
    where: { id: String(req.params.id) },
    include: { _count: { select: { images: true } } },
  });
  if (!product) throw notFound('Producto no encontrado');
  const files = (req.files as Express.Multer.File[] | undefined) ?? [];
  if (!files.length) throw badRequest('Selecciona al menos una imagen');
  if (product._count.images + files.length > 8) throw badRequest('Máximo 8 imágenes por producto');

  const urls: string[] = [];
  try {
    for (const file of files) urls.push(await saveImage(file));
  } catch (err) {
    await Promise.all(urls.map(removeImage));
    throw err;
  }

  await prisma.productImage.createMany({
    data: urls.map((url, i) => ({
      productId: product.id,
      url,
      alt: product.name,
      sortOrder: product._count.images + i,
    })),
  });
  const updated = await prisma.product.findUniqueOrThrow({ where: { id: product.id }, include: productInclude });
  res.status(201).json(serializeProduct(updated));
});

adminProductsRouter.delete('/:id/images/:imageId', async (req, res) => {
  const image = await prisma.productImage.findFirst({
    where: { id: req.params.imageId, productId: req.params.id },
  });
  if (!image) throw notFound('Imagen no encontrada');
  await prisma.productImage.delete({ where: { id: image.id } });
  await removeImage(image.url);
  const updated = await prisma.product.findUniqueOrThrow({ where: { id: req.params.id }, include: productInclude });
  res.json(serializeProduct(updated));
});
