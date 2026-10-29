import { memo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, Heart, ShoppingBag } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { cn, discountPercent, formatAbv, formatVolume } from '../../lib/format';
import type { Product } from '../../lib/types';
import { useCart } from '../../store/cart';
import { toast } from '../../store/toast';
import { Badge } from '../ui/Badge';
import { Price } from '../ui/misc';
import { ProductVisual } from './ProductVisual';

export function useAddToCart() {
  const add = useCart((s) => s.add);
  const items = useCart((s) => s.items);
  const openDrawer = useCart((s) => s.openDrawer);
  return (product: Product, quantity = 1, { open = true } = {}): boolean => {
    const inCart = items.find((i) => i.productId === product.id)?.quantity ?? 0;
    if (!product.inStock) {
      toast.error('Producto agotado');
      return false;
    }
    if (inCart + quantity > product.stock) {
      toast.error('Stock insuficiente', `Solo hay ${product.stock} unidades disponibles.`);
      return false;
    }
    add(product, quantity);
    if (open) openDrawer();
    else toast.success('Añadido al carrito', product.name);
    return true;
  };
}

export const ProductCard = memo(function ProductCard({ product, index = 0 }: { product: Product; index?: number }) {
  const { favoriteIds, toggleFavorite, user } = useAuth();
  const addToCart = useAddToCart();
  const isFav = favoriteIds.has(product.id);
  const lowStock = product.inStock && product.stock <= 5;
  const off = discountPercent(product.priceCents, product.salePriceCents);
  const url = `/producto/${product.slug}`;

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.5, delay: Math.min(index, 8) * 0.05, ease: [0.22, 1, 0.36, 1] }}
      className="glass glow-border group flex h-full flex-col overflow-hidden rounded-2xl shadow-card transition-transform duration-300 ease-out-soft hover:-translate-y-1"
    >
      <Link to={url} className="relative block aspect-[4/5] overflow-hidden" aria-label={`Ver ${product.name}`}>
        {/* Halo del color del producto */}
        <div
          className="absolute inset-x-6 top-1/4 bottom-6 rounded-full opacity-40 blur-3xl transition-opacity duration-500 group-hover:opacity-70"
          style={{ background: product.accentColor }}
          aria-hidden
        />
        <div className="grid-lines absolute inset-0 opacity-60" aria-hidden />
        <ProductVisual
          name={product.name}
          brand={product.brand.name}
          shape={product.bottleShape}
          color={product.accentColor}
          imageUrl={product.images[0]?.url}
          className="relative mx-auto h-full w-auto py-5 transition-transform duration-500 ease-out-soft group-hover:scale-[1.04] group-hover:-rotate-2"
          imgClassName="relative size-full p-6 transition-transform duration-500 ease-out-soft group-hover:scale-[1.04]"
        />
        <div className="absolute top-3 left-3 flex flex-col items-start gap-1.5">
          {off > 0 && <Badge tone="sale">-{off}%</Badge>}
          {!product.inStock && <Badge tone="danger">Agotado</Badge>}
          {lowStock && <Badge tone="warning">Últimas {product.stock}</Badge>}
          {product.brand.isPremium && <Badge tone="violet">Premium</Badge>}
        </div>
      </Link>

      {user?.role !== 'ADMIN' && (
        <button
          onClick={() => toggleFavorite(product.id)}
          className={cn(
            'absolute top-3 right-3 z-10 flex size-9 items-center justify-center rounded-full border border-line bg-ink-950/60 backdrop-blur transition-colors',
            isFav ? 'text-magenta' : 'text-fg-muted hover:text-fg',
          )}
          aria-label={isFav ? 'Quitar de favoritos' : 'Guardar en favoritos'}
          aria-pressed={isFav}
        >
          <Heart className={cn('size-4', isFav && 'fill-current')} />
        </button>
      )}

      <div className="flex flex-1 flex-col gap-3 border-t border-line p-4">
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold tracking-[0.14em] text-fg-subtle uppercase">
            {product.brand.name} · {product.category.name}
          </p>
          <h3 className="mt-1 line-clamp-2 text-[15px] leading-snug font-semibold text-fg">
            <Link to={url} className="hover:text-cyan">
              {product.name}
            </Link>
          </h3>
          <p className="mt-1 text-xs text-fg-subtle">
            {product.presentation} · {formatVolume(product.volumeMl)}
            {formatAbv(product.abv) && ` · ${formatAbv(product.abv)}`}
          </p>
        </div>
        <p className="line-clamp-2 hidden text-sm text-fg-muted sm:block">{product.shortDescription}</p>
        <div className="mt-auto flex flex-wrap items-end justify-between gap-x-2 gap-y-1">
          <Price priceCents={product.priceCents} salePriceCents={product.salePriceCents} />
          <span className={cn('text-xs font-medium', product.inStock ? 'text-success' : 'text-danger')}>
            {product.inStock ? 'Disponible' : 'Sin stock'}
          </span>
        </div>
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <button
            onClick={() => addToCart(product)}
            disabled={!product.inStock}
            className="flex h-10 items-center justify-center gap-2 rounded-xl bg-violet text-sm font-semibold text-white transition-all duration-200 hover:bg-[#8b4ef5] hover:shadow-glow active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-white/5 disabled:text-fg-subtle"
          >
            <ShoppingBag className="size-4" />
            {product.inStock ? 'Añadir' : 'Agotado'}
          </button>
          <Link
            to={url}
            className="flex size-10 items-center justify-center rounded-xl border border-line text-fg-muted transition-colors hover:border-cyan/50 hover:text-cyan"
            aria-label={`Detalles de ${product.name}`}
            title="Ver detalles"
          >
            <Eye className="size-4" />
          </Link>
        </div>
      </div>
    </motion.article>
  );
});

export function ProductCardSkeleton() {
  return (
    <div className="glass overflow-hidden rounded-2xl">
      <div className="skeleton aspect-[4/5] rounded-none" />
      <div className="space-y-3 p-4">
        <div className="skeleton h-3 w-1/2" />
        <div className="skeleton h-4 w-4/5" />
        <div className="skeleton h-3 w-2/3" />
        <div className="skeleton h-10 w-full" />
      </div>
    </div>
  );
}

export function ProductGrid({ products, loading, count = 8 }: { products?: Product[]; loading?: boolean; count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
      {loading && !products?.length
        ? Array.from({ length: count }, (_, i) => <ProductCardSkeleton key={i} />)
        : products?.map((p, i) => (
            <div key={p.id} className="relative">
              <ProductCard product={p} index={i} />
            </div>
          ))}
    </div>
  );
}
