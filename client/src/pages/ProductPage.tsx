import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Box, ChevronRight, Heart, ImageIcon, MapPin, Package, ShoppingBag, Truck, Zap } from 'lucide-react';
import { useAddToCart, ProductGrid } from '../components/product/ProductCard';
import { ProductVisual } from '../components/product/ProductVisual';
import { Bottle3D } from '../components/three/Bottle3D';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Price, QuantityStepper, Reveal, SectionHeader } from '../components/ui/misc';
import { PageLoader } from '../components/ui/Spinner';
import { useAuth } from '../context/AuthContext';
import { useFetch } from '../hooks/useFetch';
import { useStoreConfig } from '../hooks/useStoreConfig';
import { cn, formatAbv, formatPrice, formatVolume } from '../lib/format';
import type { Product } from '../lib/types';
import { MAX_QTY, useCart } from '../store/cart';
import NotFoundPage from './NotFoundPage';

export default function ProductPage() {
  const { slug } = useParams();
  const { data, loading, error } = useFetch<{ product: Product; related: Product[] }>(`/products/${slug}`);

  useEffect(() => {
    if (data) document.title = `${data.product.name} — NEON LIQUOR`;
    return () => {
      document.title = 'NEON LIQUOR — The Future of Spirits';
    };
  }, [data]);

  if (loading && !data) return <PageLoader />;
  if (error?.status === 404) return <NotFoundPage />;
  if (error || !data) {
    return (
      <div className="container-page py-20">
        <p className="rounded-2xl border border-danger/30 bg-danger/10 p-4 text-sm text-danger">{error?.message}</p>
      </div>
    );
  }
  return <ProductDetail key={data.product.id} product={data.product} related={data.related} />;
}

function ProductDetail({ product, related }: { product: Product; related: Product[] }) {
  const [view, setView] = useState<'3d' | number>(product.images.length ? 0 : '3d');
  const [qty, setQty] = useState(1);
  const addToCart = useAddToCart();
  const inCart = useCart((s) => s.items.find((i) => i.productId === product.id)?.quantity ?? 0);
  const { favoriteIds, toggleFavorite, user } = useAuth();
  const config = useStoreConfig();
  const navigate = useNavigate();
  const maxQty = Math.max(1, Math.min(MAX_QTY, product.stock - inCart));
  const isFav = favoriteIds.has(product.id);
  const abv = formatAbv(product.abv);

  const specs = [
    { label: 'Marca', value: product.brand.name },
    { label: 'Categoría', value: product.category.name },
    { label: 'Presentación', value: product.presentation },
    { label: 'Volumen', value: formatVolume(product.volumeMl) },
    ...(abv ? [{ label: 'Graduación', value: abv }] : []),
    ...(product.origin ? [{ label: 'Origen', value: product.origin }] : []),
  ];

  const buyNow = () => {
    if (inCart > 0 || addToCart(product, Math.min(qty, maxQty), { open: false })) navigate('/checkout');
  };

  return (
    <div className="container-page py-8 md:py-12">
      <nav className="mb-6 flex flex-wrap items-center gap-1.5 text-sm text-fg-subtle" aria-label="Ruta">
        <Link to="/" className="hover:text-fg">
          Inicio
        </Link>
        <ChevronRight className="size-3.5" />
        <Link to="/catalogo" className="hover:text-fg">
          Catálogo
        </Link>
        <ChevronRight className="size-3.5" />
        <Link to={`/catalogo?categoria=${product.category.slug}`} className="hover:text-fg">
          {product.category.name}
        </Link>
        <ChevronRight className="size-3.5" />
        <span className="truncate text-fg-muted">{product.name}</span>
      </nav>

      <div className="grid gap-10 lg:grid-cols-[1.1fr_1fr] lg:gap-14">
        {/* Galería */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <div className="glass relative aspect-square overflow-hidden rounded-3xl">
            <div className="grid-lines absolute inset-0" aria-hidden />
            <div
              className="absolute inset-[18%] rounded-full opacity-40 blur-[80px]"
              style={{ background: product.accentColor }}
              aria-hidden
            />
            <AnimatePresence mode="wait">
              <motion.div
                key={String(view)}
                className="absolute inset-0"
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.35 }}
              >
                {view === '3d' ? (
                  <Bottle3D
                    className="size-full"
                    shape={product.bottleShape}
                    color={product.accentColor}
                    brand={product.brand.name}
                    autoRotate
                    draggable
                  />
                ) : (
                  <img
                    src={product.images[view]?.url}
                    alt={product.images[view]?.alt ?? product.name}
                    className="size-full object-contain p-8"
                  />
                )}
              </motion.div>
            </AnimatePresence>
            <div className="absolute top-4 left-4 flex flex-col gap-1.5">
              {product.salePriceCents !== null && <Badge tone="sale">Oferta</Badge>}
              {product.brand.isPremium && <Badge tone="violet">Premium</Badge>}
            </div>
            {view === '3d' && (
              <span className="absolute right-4 bottom-4 flex items-center gap-1.5 rounded-full border border-line bg-ink-950/60 px-3 py-1 text-xs text-fg-muted backdrop-blur">
                <Box className="size-3.5 text-cyan" /> Vista 3D · arrastra para girar
              </span>
            )}
          </div>

          <div className="mt-3 flex gap-3">
            {product.images.map((img, i) => (
              <button
                key={img.id}
                onClick={() => setView(i)}
                className={cn(
                  'glass size-20 overflow-hidden rounded-xl p-1.5 transition-colors',
                  view === i ? 'border-cyan/70' : 'hover:border-line-strong',
                )}
                aria-label={`Ver imagen ${i + 1}`}
              >
                <img src={img.url} alt="" className="size-full object-contain" />
              </button>
            ))}
            <button
              onClick={() => setView('3d')}
              className={cn(
                'glass flex size-20 flex-col items-center justify-center gap-1 rounded-xl text-xs font-semibold transition-colors',
                view === '3d' ? 'border-cyan/70 text-cyan' : 'text-fg-muted hover:border-line-strong',
              )}
              aria-label="Ver en 3D"
            >
              <Box className="size-5" /> 3D
            </button>
            {!product.images.length && (
              <div className="glass flex size-20 items-center justify-center overflow-hidden rounded-xl" title="Ilustración del producto">
                <ProductVisual name={product.name} brand={product.brand.name} shape={product.bottleShape} color={product.accentColor} className="h-16 w-auto" />
              </div>
            )}
          </div>
          {!product.images.length && (
            <p className="mt-2 flex items-center gap-1.5 text-xs text-fg-subtle">
              <ImageIcon className="size-3.5" /> Representación ilustrativa. La botella real puede variar.
            </p>
          )}
        </div>

        {/* Información */}
        <div>
          <p className="eyebrow">
            {product.brand.name} · {product.brand.country}
          </p>
          <h1 className="mt-3 font-display text-3xl leading-tight font-semibold md:text-[42px]">{product.name}</h1>
          <p className="mt-3 text-lg text-fg-muted">{product.shortDescription}</p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Price priceCents={product.priceCents} salePriceCents={product.salePriceCents} size="lg" />
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
            {product.inStock ? (
              <span className="flex items-center gap-2 text-success">
                <span className="size-2 rounded-full bg-success shadow-[0_0_10px_#34d399]" />
                {product.stock <= 5 ? `Últimas ${product.stock} unidades` : 'Disponible'}
              </span>
            ) : (
              <span className="flex items-center gap-2 text-danger">
                <span className="size-2 rounded-full bg-danger" /> Agotado
              </span>
            )}
            {inCart > 0 && <span className="text-fg-subtle">· {inCart} en tu carrito</span>}
          </div>

          <div className="glass mt-8 rounded-2xl p-5">
            <div className="flex flex-wrap items-center gap-3">
              <QuantityStepper value={Math.min(qty, maxQty)} max={maxQty} onChange={setQty} />
              <Button
                size="lg"
                className="flex-1"
                disabled={!product.inStock || inCart >= product.stock}
                icon={<ShoppingBag className="size-4" />}
                onClick={() => {
                  addToCart(product, Math.min(qty, maxQty));
                  setQty(1);
                }}
              >
                Añadir al carrito
              </Button>
              {user?.role !== 'ADMIN' && (
                <button
                  onClick={() => toggleFavorite(product.id)}
                  className={cn(
                    'flex size-13 items-center justify-center rounded-xl border border-line transition-colors',
                    isFav ? 'border-magenta/40 text-magenta' : 'text-fg-muted hover:text-fg',
                  )}
                  aria-label={isFav ? 'Quitar de favoritos' : 'Guardar en favoritos'}
                  aria-pressed={isFav}
                >
                  <Heart className={cn('size-5', isFav && 'fill-current')} />
                </button>
              )}
            </div>
            <Button
              variant="accent"
              size="lg"
              className="mt-3 w-full"
              disabled={!product.inStock}
              icon={<Zap className="size-4" />}
              onClick={buyNow}
            >
              Comprar ahora
            </Button>
            {product.stock > 0 && inCart >= product.stock && (
              <p className="mt-2 text-xs text-warning">Ya tienes en el carrito todas las unidades disponibles.</p>
            )}
          </div>

          <ul className="mt-5 grid gap-2 text-sm text-fg-muted sm:grid-cols-3">
            <li className="flex items-center gap-2">
              <Truck className="size-4 text-cyan" />
              {config?.freeShippingThresholdCents ? `Gratis desde ${formatPrice(config.freeShippingThresholdCents)}` : 'Delivery en Lima'}
            </li>
            <li className="flex items-center gap-2">
              <Zap className="size-4 text-cyan" /> Express 2–4 h
            </li>
            <li className="flex items-center gap-2">
              <MapPin className="size-4 text-cyan" /> Recojo en tienda
            </li>
          </ul>

          <section className="mt-10">
            <h2 className="font-display text-sm font-semibold tracking-[0.18em] text-fg-subtle uppercase">Descripción</h2>
            <p className="mt-3 leading-relaxed text-fg-muted">{product.description}</p>
            {product.tastingNotes.length > 0 && (
              <div className="mt-5 flex flex-wrap gap-2">
                {product.tastingNotes.map((n) => (
                  <span key={n} className="rounded-full border border-line bg-white/[.03] px-3 py-1 text-xs text-fg-muted">
                    {n}
                  </span>
                ))}
              </div>
            )}
          </section>

          <section className="mt-10">
            <h2 className="font-display text-sm font-semibold tracking-[0.18em] text-fg-subtle uppercase">Ficha técnica</h2>
            <dl className="mt-3 divide-y divide-line rounded-2xl border border-line">
              {specs.map((s) => (
                <div key={s.label} className="flex justify-between gap-4 px-4 py-3 text-sm">
                  <dt className="text-fg-subtle">{s.label}</dt>
                  <dd className="text-right font-medium">{s.value}</dd>
                </div>
              ))}
            </dl>
          </section>

          {product.category.isAlcoholic && (
            <p className="mt-6 flex items-center gap-2 text-xs text-fg-subtle">
              <Package className="size-3.5" /> Venta exclusiva para mayores de 18 años. Tomar bebidas alcohólicas en exceso es dañino.
            </p>
          )}
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-20 md:mt-28">
          <Reveal>
            <SectionHeader eyebrow="También te puede gustar" title="Productos relacionados" />
          </Reveal>
          <ProductGrid products={related} />
        </section>
      )}
    </div>
  );
}
