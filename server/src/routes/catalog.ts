import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { storePublicConfig } from '../config/store.js';
import { notFound } from '../lib/errors.js';
import { prisma } from '../lib/prisma.js';
import { productInclude, serializeProduct } from '../lib/serializers.js';
import { parse } from '../middleware/validate.js';
import { cartItemsSchema, quoteCart } from '../services/pricing.js';

export const catalogRouter = Router();

catalogRouter.get('/store/config', (_req, res) => {
  res.json(storePublicConfig());
});

catalogRouter.get('/categories', async (_req, res) => {
  const categories = await prisma.category.findMany({
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    include: { _count: { select: { products: { where: { isActive: true } } } } },
  });
  res.json(
    categories.map(({ _count, ...c }) => ({ ...c, productCount: _count.products })),
  );
});

catalogRouter.get('/brands', async (_req, res) => {
  const brands = await prisma.brand.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { products: { where: { isActive: true } } } } },
  });
  res.json(brands.map(({ _count, ...b }) => ({ ...b, productCount: _count.products })));
});

const csv = z
  .string()
  .optional()
  .transform((v) => (v ? v.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 20) : []));

const listQuery = z.object({
  search: z.string().trim().max(80).optional(),
  category: csv,
  brand: csv,
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  availability: z.enum(['all', 'in_stock']).default('all'),
  onSale: z.enum(['true', 'false']).optional(),
  featured: z.enum(['true', 'false']).optional(),
  sort: z.enum(['popular', 'newest', 'price_asc', 'price_desc', 'name']).default('popular'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(48).default(12),
});

/**
 * Filtra por precio final (oferta si existe). Prisma no puede comparar columnas entre sí,
 * así que el filtro por precio y el orden por precio se resuelven con una consulta SQL
 * parametrizada que devuelve los ids, y luego se cargan los productos con Prisma.
 */
async function idsByFinalPrice(
  where: Prisma.ProductWhereInput,
  q: z.infer<typeof listQuery>,
): Promise<{ ids: string[]; total: number } | null> {
  const needsSql = q.minPrice !== undefined || q.maxPrice !== undefined || q.sort.startsWith('price');
  if (!needsSql) return null;

  const candidates = await prisma.product.findMany({ where, select: { id: true } });
  if (!candidates.length) return { ids: [], total: 0 };
  const candidateIds = candidates.map((c) => c.id);

  const min = q.minPrice !== undefined ? Math.round(q.minPrice * 100) : null;
  const max = q.maxPrice !== undefined ? Math.round(q.maxPrice * 100) : null;

  // Fragmentos constantes (no provienen del usuario); los valores van como parámetros.
  const final = Prisma.raw(
    `CASE WHEN "salePriceCents" IS NOT NULL AND "salePriceCents" < "priceCents" THEN "salePriceCents" ELSE "priceCents" END`,
  );
  const order =
    q.sort === 'price_desc'
      ? Prisma.sql`${final} DESC`
      : q.sort === 'price_asc'
        ? Prisma.sql`${final} ASC`
        : Prisma.sql`"soldCount" DESC`;

  const rows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT "id" FROM "Product"
    WHERE "id" = ANY(${candidateIds}::text[])
      AND (${min}::int IS NULL OR ${final} >= ${min}::int)
      AND (${max}::int IS NULL OR ${final} <= ${max}::int)
    ORDER BY ${order}, "name" ASC`;
  return { ids: rows.map((r) => r.id), total: rows.length };
}

catalogRouter.get('/products', async (req, res) => {
  const q = parse(listQuery, req.query);

  const where: Prisma.ProductWhereInput = { isActive: true };
  if (q.search) {
    where.OR = [
      { name: { contains: q.search, mode: 'insensitive' } },
      { brand: { name: { contains: q.search, mode: 'insensitive' } } },
      { category: { name: { contains: q.search, mode: 'insensitive' } } },
      { shortDescription: { contains: q.search, mode: 'insensitive' } },
    ];
  }
  if (q.category.length) where.category = { slug: { in: q.category } };
  if (q.brand.length) where.brand = { slug: { in: q.brand } };
  if (q.availability === 'in_stock') where.stock = { gt: 0 };
  if (q.featured === 'true') where.isFeatured = true;
  if (q.onSale === 'true') where.salePriceCents = { not: null };

  const skip = (q.page - 1) * q.pageSize;
  const byPrice = await idsByFinalPrice(where, q);

  let products;
  let total: number;
  if (byPrice) {
    total = byPrice.total;
    const pageIds = byPrice.ids.slice(skip, skip + q.pageSize);
    const found = await prisma.product.findMany({ where: { id: { in: pageIds } }, include: productInclude });
    const map = new Map(found.map((p) => [p.id, p]));
    products = pageIds.map((id) => map.get(id)!).filter(Boolean);
  } else {
    const orderBy: Prisma.ProductOrderByWithRelationInput[] =
      q.sort === 'newest'
        ? [{ createdAt: 'desc' }]
        : q.sort === 'name'
          ? [{ name: 'asc' }]
          : [{ soldCount: 'desc' }, { name: 'asc' }];
    [products, total] = await Promise.all([
      prisma.product.findMany({ where, include: productInclude, orderBy, skip, take: q.pageSize }),
      prisma.product.count({ where }),
    ]);
  }

  res.json({
    items: products.map(serializeProduct),
    page: q.page,
    pageSize: q.pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / q.pageSize)),
  });
});

catalogRouter.get('/products/price-range', async (_req, res) => {
  const agg = await prisma.product.aggregate({
    where: { isActive: true },
    _min: { priceCents: true, salePriceCents: true },
    _max: { priceCents: true },
  });
  const min = Math.min(agg._min.priceCents ?? 0, agg._min.salePriceCents ?? Infinity);
  res.json({ minCents: Number.isFinite(min) ? min : 0, maxCents: agg._max.priceCents ?? 0 });
});

catalogRouter.get('/products/:slug', async (req, res) => {
  const product = await prisma.product.findFirst({
    where: { slug: req.params.slug, isActive: true },
    include: productInclude,
  });
  if (!product) throw notFound('Producto no encontrado');

  const related = await prisma.product.findMany({
    where: { isActive: true, id: { not: product.id }, OR: [{ categoryId: product.categoryId }, { brandId: product.brandId }] },
    include: productInclude,
    orderBy: [{ soldCount: 'desc' }],
    take: 4,
  });

  res.json({ product: serializeProduct(product), related: related.map(serializeProduct) });
});

catalogRouter.get('/home', async (_req, res) => {
  const active = { isActive: true } as const;
  const [featured, onSale, bestSellers, newest, categories, brands] = await Promise.all([
    prisma.product.findMany({ where: { ...active, isFeatured: true }, include: productInclude, orderBy: { soldCount: 'desc' }, take: 8 }),
    prisma.product.findMany({ where: { ...active, salePriceCents: { not: null } }, include: productInclude, orderBy: { updatedAt: 'desc' }, take: 8 }),
    // Solo productos con ventas reales registradas.
    prisma.product.findMany({ where: { ...active, soldCount: { gt: 0 } }, include: productInclude, orderBy: [{ soldCount: 'desc' }, { name: 'asc' }], take: 8 }),
    prisma.product.findMany({ where: active, include: productInclude, orderBy: { createdAt: 'desc' }, take: 8 }),
    prisma.category.findMany({
      orderBy: [{ sortOrder: 'asc' }],
      include: { _count: { select: { products: { where: active } } } },
    }),
    prisma.brand.findMany({ where: { isPremium: true }, orderBy: { name: 'asc' } }),
  ]);
  res.json({
    featured: featured.map(serializeProduct),
    onSale: onSale.map(serializeProduct).filter((p) => p.salePriceCents !== null),
    bestSellers: bestSellers.map(serializeProduct),
    newest: newest.map(serializeProduct),
    categories: categories.map(({ _count, ...c }) => ({ ...c, productCount: _count.products })),
    brands,
  });
});

const quoteSchema = z.object({
  items: cartItemsSchema,
  couponCode: z.string().trim().max(40).optional(),
  deliveryMethod: z.enum(['STANDARD', 'EXPRESS', 'PICKUP']).optional(),
});

catalogRouter.post('/cart/quote', async (req, res) => {
  const body = parse(quoteSchema, req.body);
  const { couponRecord: _hidden, ...quote } = await quoteCart(prisma, body.items, body);
  res.json(quote);
});
