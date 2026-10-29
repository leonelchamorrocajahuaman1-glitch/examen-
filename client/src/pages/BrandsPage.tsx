import { Link } from 'react-router-dom';
import { ArrowUpRight, Gem } from 'lucide-react';
import { Reveal } from '../components/ui/misc';
import { PageLoader } from '../components/ui/Spinner';
import { useFetch } from '../hooks/useFetch';
import type { Brand } from '../lib/types';

export default function BrandsPage() {
  const { data, loading, error } = useFetch<Brand[]>('/brands');
  if (loading) return <PageLoader />;

  const premium = data?.filter((b) => b.isPremium) ?? [];
  const others = data?.filter((b) => !b.isPremium) ?? [];

  const card = (b: Brand, i: number) => (
    <Reveal key={b.id} delay={Math.min(i, 8) * 0.04}>
      <Link
        to={`/catalogo?marca=${b.slug}`}
        className="glass glow-border group flex h-full flex-col justify-between gap-6 rounded-2xl p-6 transition-transform duration-300 hover:-translate-y-1"
      >
        <div>
          <div className="flex items-start justify-between gap-3">
            <h3 className="font-display text-xl font-semibold tracking-[0.04em] uppercase">{b.name}</h3>
            <ArrowUpRight className="size-5 shrink-0 text-fg-subtle transition-colors group-hover:text-cyan" />
          </div>
          <p className="mt-1 text-sm text-cyan">{b.country}</p>
          {b.description && <p className="mt-3 text-sm text-fg-muted">{b.description}</p>}
        </div>
        <p className="text-xs text-fg-subtle">{b.productCount} productos</p>
      </Link>
    </Reveal>
  );

  return (
    <div className="container-page py-10 md:py-14">
      <p className="eyebrow mb-3">Marcas</p>
      <h1 className="font-display text-3xl font-semibold md:text-5xl">Nuestras casas</h1>
      <p className="mt-3 max-w-2xl text-fg-muted">Destilerías, bodegas y casas de champagne que forman parte de nuestro catálogo.</p>
      {error && <p className="mt-6 text-sm text-danger">{error.message}</p>}

      {premium.length > 0 && (
        <section className="mt-12">
          <h2 className="mb-5 flex items-center gap-2 font-display text-sm font-semibold tracking-[0.18em] text-fg-subtle uppercase">
            <Gem className="size-4 text-violet-glow" /> Premium
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{premium.map(card)}</div>
        </section>
      )}
      {others.length > 0 && (
        <section className="mt-12">
          <h2 className="mb-5 font-display text-sm font-semibold tracking-[0.18em] text-fg-subtle uppercase">Más marcas</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{others.map(card)}</div>
        </section>
      )}
    </div>
  );
}
