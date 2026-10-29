import type { Prisma } from '@prisma/client';

export const productInclude = {
  brand: { select: { id: true, name: true, slug: true, country: true, isPremium: true } },
  category: { select: { id: true, name: true, slug: true, accentColor: true, isAlcoholic: true } },
  images: { orderBy: { sortOrder: 'asc' }, select: { id: true, url: true, alt: true, sortOrder: true } },
} satisfies Prisma.ProductInclude;

export type ProductWithRelations = Prisma.ProductGetPayload<{ include: typeof productInclude }>;

export function effectivePrice(p: { priceCents: number; salePriceCents: number | null }) {
  return p.salePriceCents !== null && p.salePriceCents < p.priceCents ? p.salePriceCents : p.priceCents;
}

export function serializeProduct(p: ProductWithRelations) {
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    brand: p.brand,
    category: p.category,
    shortDescription: p.shortDescription,
    description: p.description,
    presentation: p.presentation,
    volumeMl: p.volumeMl,
    abv: p.abv === null ? null : Number(p.abv),
    origin: p.origin,
    tastingNotes: p.tastingNotes,
    priceCents: p.priceCents,
    salePriceCents: p.salePriceCents !== null && p.salePriceCents < p.priceCents ? p.salePriceCents : null,
    finalPriceCents: effectivePrice(p),
    stock: p.stock,
    inStock: p.stock > 0,
    isActive: p.isActive,
    isFeatured: p.isFeatured,
    soldCount: p.soldCount,
    accentColor: p.accentColor,
    bottleShape: p.bottleShape,
    images: p.images,
    createdAt: p.createdAt,
  };
}

export function slugify(input: string) {
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}
