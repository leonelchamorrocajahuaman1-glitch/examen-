import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, ArrowUpRight, Clock3, CreditCard, Gem, MousePointer2, ShieldCheck, Truck } from 'lucide-react';
import { Bottle3D } from '../components/three/Bottle3D';
import { BottleArt } from '../components/product/BottleArt';
import { ProductCard, ProductCardSkeleton, ProductGrid } from '../components/product/ProductCard';
import { LinkButton } from '../components/ui/Button';
import { Price, Reveal, SectionHeader } from '../components/ui/misc';
import { useFetch } from '../hooks/useFetch';
import { useStoreConfig } from '../hooks/useStoreConfig';
import { formatPrice } from '../lib/format';
import type { BottleShape, Brand, Category, Product } from '../lib/types';

interface HomeData {
  featured: Product[];
  onSale: Product[];
  bestSellers: Product[];
  newest: Product[];
  categories: Category[];
  brands: Brand[];
}

export const categoryShape: Record<string, BottleShape> = {
  whisky: 'CLASSIC',
  vodka: 'TALL',
  ron: 'ROUND',
  gin: 'SQUARE',
  tequila: 'ROUND',
  vino: 'WINE',
  'champagne-espumantes': 'CHAMPAGNE',
  licores: 'CLASSIC',
  'cocteles-preparados': 'CAN',
  'sin-alcohol': 'SQUARE',
};

const ease = [0.22, 1, 0.36, 1] as const;

function Hero({ highlight, stats }: { highlight?: Product; stats: { products: number; categories: number } | null }) {
  const reduce = useReducedMotion();
  const words = ['THE', 'FUTURE', 'OF', 'SPIRITS'];
  return (
    <section className="relative overflow-hidden">
      <div className="grid-lines absolute inset-0 opacity-70" aria-hidden />
      <div className="container-page relative grid min-h-[calc(100dvh-72px)] items-center gap-6 py-10 lg:grid-cols-[1.05fr_1fr] lg:py-0">
        <div className="relative z-10 order-2 lg:order-1">
          <motion.p
            className="eyebrow mb-5 flex items-center gap-3"
            initial={reduce ? false : { opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, ease }}
          >
            <span className="h-px w-10 bg-cyan" /> Destilados premium · Lima
          </motion.p>
          <h1 className="font-display text-[clamp(44px,8vw,104px)] leading-[0.95] font-bold tracking-tight">
            {words.map((w, i) => (
              <motion.span
                key={w}
                className={`mr-[0.22em] inline-block ${w === 'SPIRITS' ? 'text-cyan [text-shadow:0_0_42px_rgba(34,211,238,0.45)]' : ''}`}
                initial={reduce ? false : { opacity: 0, y: 40, filter: 'blur(8px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                transition={{ duration: 0.8, delay: 0.1 + i * 0.09, ease }}
              >
                {w}
                {i === 1 && <br className="hidden sm:block" />}
              </motion.span>
            ))}
          </h1>
          <motion.p
            className="mt-6 max-w-md text-lg text-fg-muted md:text-xl"
            initial={reduce ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.5, ease }}
          >
            Descubre una nueva dimensión del sabor.
          </motion.p>
          <motion.div
            className="mt-9 flex flex-wrap gap-3"
            initial={reduce ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.62, ease }}
          >
            <LinkButton to="/catalogo" size="lg" icon={<ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />}>
              EXPLORAR CATÁLOGO
            </LinkButton>
            <LinkButton to="/catalogo?coleccion=premium" variant="secondary" size="lg">
              VER COLECCIÓN
            </LinkButton>
          </motion.div>

          {stats && (
            <motion.dl
              className="mt-12 grid max-w-md grid-cols-3 gap-6 border-t border-line pt-6"
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.8 }}
            >
              <div>
                <dt className="text-xs text-fg-subtle">Etiquetas</dt>
                <dd className="font-display text-2xl font-semibold">{stats.products}</dd>
              </div>
              <div>
                <dt className="text-xs text-fg-subtle">Categorías</dt>
                <dd className="font-display text-2xl font-semibold">{stats.categories}</dd>
              </div>
              <div>
                <dt className="text-xs text-fg-subtle">Express</dt>
                <dd className="font-display text-2xl font-semibold">
                  2–4<span className="text-base text-fg-muted"> h</span>
                </dd>
              </div>
            </motion.dl>
          )}
        </div>

        <motion.div
          className="relative order-1 h-[40vh] min-h-[300px] lg:order-2 lg:h-[82vh]"
          initial={reduce ? false : { opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.1, delay: 0.15, ease }}
        >
          <div className="absolute inset-[12%] rounded-full bg-violet/30 blur-[90px]" aria-hidden />
          <div className="absolute inset-[28%] translate-x-[12%] rounded-full bg-cyan/20 blur-[80px]" aria-hidden />
          <Bottle3D className="size-full" shape="CLASSIC" color="#C9731F" brand="NEON RESERVE" autoRotate draggable />
          <p className="pointer-events-none absolute bottom-3 left-1/2 hidden -translate-x-1/2 items-center gap-2 text-xs text-fg-subtle md:flex">
            <MousePointer2 className="size-3.5" /> Arrastra para girar
          </p>

          {highlight && (
            <motion.div
              initial={reduce ? false : { opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, delay: 1, ease }}
              className="absolute right-0 bottom-[6%] hidden sm:block"
            >
              <Link
                to={`/producto/${highlight.slug}`}
                className="glass glow-border flex items-center gap-3 rounded-2xl p-3 pr-4 shadow-card transition-transform hover:-translate-y-0.5"
              >
                <div className="flex h-14 w-10 items-center justify-center">
                  <BottleArt shape={highlight.bottleShape} color={highlight.accentColor} brand={highlight.brand.name} className="h-14 w-auto" />
                </div>
                <div>
                  <p className="text-[10px] font-semibold tracking-[0.18em] text-cyan uppercase">Destacado</p>
                  <p className="max-w-44 truncate text-sm font-semibold">{highlight.name}</p>
                  <Price priceCents={highlight.priceCents} salePriceCents={highlight.salePriceCents} size="sm" />
                </div>
                <ArrowUpRight className="size-4 text-fg-subtle" />
              </Link>
            </motion.div>
          )}
        </motion.div>
      </div>
    </section>
  );
}

function Categories({ categories }: { categories: Category[] }) {
  return (
    <section className="container-page py-16 md:py-24">
      <Reveal>
        <SectionHeader
          eyebrow="Categorías populares"
          title="Encuentra tu estilo"
          description="Desde single malts de larga crianza hasta destilados 0.0% para la noche siguiente."
          action={
            <LinkButton to="/catalogo" variant="quiet" icon={<ArrowRight className="size-4" />} className="flex-row-reverse">
              Todo el catálogo
            </LinkButton>
          }
        />
      </Reveal>
      <div className="grid auto-rows-[160px] grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4 md:auto-rows-[180px]">
        {categories.map((c, i) => {
          const large = i < 2;
          return (
            <Reveal key={c.id} delay={Math.min(i, 6) * 0.05} className={large ? 'col-span-2 row-span-2 md:col-span-2' : ''}>
              <Link
                to={`/catalogo?categoria=${c.slug}`}
                className="glass glow-border group relative flex size-full flex-col justify-between overflow-hidden rounded-2xl p-5 transition-transform duration-300 hover:-translate-y-1"
              >
                <div
                  className="absolute -right-10 -bottom-10 size-48 rounded-full opacity-25 blur-3xl transition-opacity duration-500 group-hover:opacity-50"
                  style={{ background: c.accentColor }}
                  aria-hidden
                />
                <BottleArt
                  shape={categoryShape[c.slug] ?? 'CLASSIC'}
                  color={c.accentColor}
                  brand={c.name}
                  className={`absolute right-3 bottom-0 w-auto opacity-90 transition-transform duration-500 ease-out-soft group-hover:-translate-y-2 group-hover:-rotate-3 ${large ? 'h-[88%]' : 'h-[78%]'}`}
                />
                <div className="relative">
                  <p className="text-xs text-fg-subtle">{c.productCount} productos</p>
                  <h3 className={`mt-1 max-w-[60%] font-display font-semibold ${large ? 'text-2xl md:text-3xl' : 'text-base md:text-lg'}`}>{c.name}</h3>
                  {large && c.description && <p className="mt-2 max-w-[55%] text-sm text-fg-muted">{c.description}</p>}
                </div>
                <span className="relative flex size-9 items-center justify-center rounded-full border border-line text-fg-muted transition-colors group-hover:border-cyan/60 group-hover:text-cyan">
                  <ArrowUpRight className="size-4" />
                </span>
              </Link>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}

function Offers({ products }: { products: Product[] }) {
  const config = useStoreConfig();
  if (!products.length) return null;
  return (
    <section className="relative py-16 md:py-24">
      <div className="absolute inset-x-0 top-1/2 h-72 -translate-y-1/2 bg-magenta/[.06] blur-3xl" aria-hidden />
      <div className="container-page relative">
        <Reveal>
          <SectionHeader
            eyebrow="Ofertas especiales"
            title="Precios que brillan"
            description={
              config?.freeShippingThresholdCents
                ? `Además, delivery estándar gratis en compras desde ${formatPrice(config.freeShippingThresholdCents)}.`
                : undefined
            }
            action={
              <LinkButton to="/catalogo?ofertas=1" variant="secondary" icon={<ArrowRight className="size-4" />} className="flex-row-reverse">
                Ver todas las ofertas
              </LinkButton>
            }
          />
        </Reveal>
        <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6 lg:mx-0 lg:grid lg:grid-cols-4 lg:overflow-visible lg:px-0">
          {products.slice(0, 8).map((p, i) => (
            <div key={p.id} className="relative w-[70%] shrink-0 snap-start sm:w-[42%] lg:w-auto">
              <ProductCard product={p} index={i} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Brands({ brands }: { brands: Brand[] }) {
  if (!brands.length) return null;
  const loop = [...brands, ...brands];
  return (
    <section className="py-16 md:py-24">
      <div className="container-page">
        <Reveal>
          <SectionHeader
            eyebrow="Marcas premium"
            title="Casas que definen el estándar"
            action={
              <LinkButton to="/marcas" variant="quiet" icon={<ArrowRight className="size-4" />} className="flex-row-reverse">
                Todas las marcas
              </LinkButton>
            }
          />
        </Reveal>
      </div>
      <div className="relative overflow-hidden border-y border-line py-8 [mask-image:linear-gradient(90deg,transparent,black_12%,black_88%,transparent)]">
        <div className="flex w-max animate-marquee gap-14 hover:[animation-play-state:paused]">
          {loop.map((b, i) => (
            <Link
              key={`${b.id}-${i}`}
              to={`/catalogo?marca=${b.slug}`}
              className="group flex shrink-0 flex-col items-start"
              tabIndex={i >= brands.length ? -1 : undefined}
              aria-hidden={i >= brands.length || undefined}
            >
              <span className="font-display text-2xl font-semibold tracking-[0.08em] whitespace-nowrap text-fg/70 uppercase transition-colors group-hover:text-fg md:text-3xl">
                {b.name}
              </span>
              <span className="mt-1 text-xs text-fg-subtle">{b.country}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function Benefits() {
  const config = useStoreConfig();
  const express = config?.deliveryOptions.find((d) => d.id === 'EXPRESS');
  const cod = config?.paymentOptions.some((p) => p.id === 'CASH_ON_DELIVERY');
  const benefits = [
    { icon: Truck, title: 'Delivery express', text: `${express?.eta ?? 'En pocas horas'} en zonas con cobertura de Lima.` },
    cod
      ? { icon: CreditCard, title: 'Pago contra entrega', text: 'Efectivo o POS al recibir. Nunca guardamos datos de tarjetas.' }
      : { icon: CreditCard, title: 'Pago verificado', text: 'Confirmamos cada pago antes de despachar. Sin datos de tarjetas.' },
    { icon: Gem, title: 'Selección curada', text: 'Etiquetas elegidas por su origen, crianza y carácter.' },
    { icon: ShieldCheck, title: 'Compra segura', text: 'Cuentas protegidas y venta solo a mayores de 18 años.' },
  ];
  return (
    <section className="container-page py-16 md:py-24">
      <Reveal>
        <div className="glass relative overflow-hidden rounded-3xl">
          <div className="absolute -top-32 -left-20 size-80 rounded-full bg-violet/25 blur-3xl" aria-hidden />
          <div className="relative grid divide-y divide-line md:grid-cols-4 md:divide-x md:divide-y-0">
            {benefits.map(({ icon: Icon, title, text }) => (
              <div key={title} className="flex gap-4 p-6 md:flex-col md:p-8">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-cyan/25 bg-cyan/10 text-cyan">
                  <Icon className="size-5" strokeWidth={1.75} />
                </span>
                <div>
                  <h3 className="font-display text-base font-semibold">{title}</h3>
                  <p className="mt-1.5 text-sm text-fg-muted">{text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Reveal>
    </section>
  );
}

export default function HomePage() {
  const { data, loading, error } = useFetch<HomeData>('/home');
  const totalProducts = data?.categories.reduce((n, c) => n + (c.productCount ?? 0), 0) ?? 0;

  return (
    <>
      <Hero
        highlight={data?.featured[0]}
        stats={data ? { products: totalProducts, categories: data.categories.length } : null}
      />

      {error && (
        <div className="container-page">
          <p className="rounded-2xl border border-danger/30 bg-danger/10 p-4 text-sm text-danger">{error.message}</p>
        </div>
      )}

      <section className="container-page py-16 md:py-24">
        <Reveal>
          <SectionHeader
            eyebrow="Productos destacados"
            title="Selección de la casa"
            description="Botellas que nuestro equipo recomienda esta temporada."
            action={
              <LinkButton to="/catalogo?coleccion=premium" variant="quiet" icon={<ArrowRight className="size-4" />} className="flex-row-reverse">
                Ver colección
              </LinkButton>
            }
          />
        </Reveal>
        <ProductGrid products={data?.featured.slice(0, 8)} loading={loading} count={4} />
      </section>

      {data && <Categories categories={data.categories} />}
      {data && <Offers products={data.onSale} />}

      <section className="container-page py-16 md:py-24">
        {data && data.bestSellers.length > 0 ? (
          <>
            <Reveal>
              <SectionHeader eyebrow="Más vendidos" title="Los favoritos de la comunidad" />
            </Reveal>
            <ProductGrid products={data.bestSellers.slice(0, 4)} />
          </>
        ) : (
          <>
            <Reveal>
              <SectionHeader
                eyebrow="Novedades"
                title="Recién llegados"
                description="Cuando haya ventas registradas, aquí verás los más vendidos."
                action={
                  <LinkButton to="/catalogo?orden=newest" variant="quiet" icon={<Clock3 className="size-4" />}>
                    Ver novedades
                  </LinkButton>
                }
              />
            </Reveal>
            {loading ? (
              <div className="grid grid-cols-2 gap-5 md:grid-cols-4">
                {Array.from({ length: 4 }, (_, i) => (
                  <ProductCardSkeleton key={i} />
                ))}
              </div>
            ) : (
              <ProductGrid products={data?.newest.slice(0, 4)} />
            )}
          </>
        )}
      </section>

      {data && <Brands brands={data.brands} />}
      <Benefits />
    </>
  );
}
