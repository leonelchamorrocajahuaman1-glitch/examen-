import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, PackageSearch, Search, SlidersHorizontal, X } from 'lucide-react';
import { ProductGrid } from '../components/product/ProductCard';
import { Button } from '../components/ui/Button';
import { Checkbox, Input, Select } from '../components/ui/Field';
import { Modal } from '../components/ui/Modal';
import { EmptyState } from '../components/ui/misc';
import { useDebounced, useFetch } from '../hooks/useFetch';
import { qs } from '../lib/api';
import { cn } from '../lib/format';
import type { Brand, Category, Paginated, Product } from '../lib/types';

const sorts = [
  { value: 'popular', label: 'Popularidad' },
  { value: 'newest', label: 'Novedades' },
  { value: 'price_asc', label: 'Precio: menor a mayor' },
  { value: 'price_desc', label: 'Precio: mayor a menor' },
  { value: 'name', label: 'Nombre (A–Z)' },
];

const csv = (v: string | null) => (v ? v.split(',').filter(Boolean) : []);

export default function CatalogPage() {
  const [params, setParams] = useSearchParams();
  const [filtersOpen, setFiltersOpen] = useState(false);

  const q = params.get('q') ?? '';
  const categories = csv(params.get('categoria'));
  const brands = csv(params.get('marca'));
  const min = params.get('min') ?? '';
  const max = params.get('max') ?? '';
  const inStock = params.get('stock') === '1';
  const sort = params.get('orden') ?? 'popular';
  const page = Math.max(1, Number(params.get('pagina')) || 1);
  const premium = params.get('coleccion') === 'premium';
  const onSale = params.get('ofertas') === '1';

  // La búsqueda se escribe al instante en el input y se aplica con un pequeño retraso.
  const [term, setTerm] = useState(q);
  const debouncedTerm = useDebounced(term.trim(), 250);
  useEffect(() => setTerm(q), [q]);
  useEffect(() => {
    if (debouncedTerm !== q) update({ q: debouncedTerm || null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedTerm]);

  const update = (patch: Record<string, string | null>, resetPage = true) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) {
      if (v === null || v === '') next.delete(k);
      else next.set(k, v);
    }
    if (resetPage) next.delete('pagina');
    setParams(next, { replace: true });
  };

  const toggleIn = (key: 'categoria' | 'marca', list: string[], slug: string) => {
    const nextList = list.includes(slug) ? list.filter((s) => s !== slug) : [...list, slug];
    update({ [key]: nextList.join(',') || null });
  };

  const path = `/products${qs({
    search: q,
    category: categories,
    brand: brands,
    minPrice: min,
    maxPrice: max,
    availability: inStock ? 'in_stock' : undefined,
    featured: premium ? 'true' : undefined,
    onSale: onSale ? 'true' : undefined,
    sort,
    page,
    pageSize: 12,
  })}`;
  const { data, loading, error } = useFetch<Paginated<Product>>(path);
  const { data: allCategories } = useFetch<Category[]>('/categories');
  const { data: allBrands } = useFetch<Brand[]>('/brands');

  const title = useMemo(() => {
    if (premium) return 'Colección premium';
    if (onSale) return 'Ofertas especiales';
    if (categories.length === 1) return allCategories?.find((c) => c.slug === categories[0])?.name ?? 'Catálogo';
    return 'Catálogo de bebidas';
  }, [premium, onSale, categories, allCategories]);

  const activeChips = [
    ...categories.map((slug) => ({ key: `c-${slug}`, label: allCategories?.find((c) => c.slug === slug)?.name ?? slug, clear: () => toggleIn('categoria', categories, slug) })),
    ...brands.map((slug) => ({ key: `b-${slug}`, label: allBrands?.find((b) => b.slug === slug)?.name ?? slug, clear: () => toggleIn('marca', brands, slug) })),
    ...(min ? [{ key: 'min', label: `Desde S/ ${min}`, clear: () => update({ min: null }) }] : []),
    ...(max ? [{ key: 'max', label: `Hasta S/ ${max}`, clear: () => update({ max: null }) }] : []),
    ...(inStock ? [{ key: 'stock', label: 'Solo disponibles', clear: () => update({ stock: null }) }] : []),
    ...(premium ? [{ key: 'premium', label: 'Colección premium', clear: () => update({ coleccion: null }) }] : []),
    ...(onSale ? [{ key: 'sale', label: 'En oferta', clear: () => update({ ofertas: null }) }] : []),
  ];

  const filters = (
    <Filters
      categories={allCategories ?? []}
      brands={allBrands ?? []}
      selectedCategories={categories}
      selectedBrands={brands}
      min={min}
      max={max}
      inStock={inStock}
      onSale={onSale}
      onToggleCategory={(slug) => toggleIn('categoria', categories, slug)}
      onToggleBrand={(slug) => toggleIn('marca', brands, slug)}
      onPrice={(lo, hi) => update({ min: lo || null, max: hi || null })}
      onStock={(v) => update({ stock: v ? '1' : null })}
      onSale_={(v) => update({ ofertas: v ? '1' : null })}
    />
  );

  return (
    <div className="container-page py-10 md:py-14">
      <header className="mb-8">
        <p className="eyebrow mb-3">NEON LIQUOR · Tienda</p>
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="font-display text-3xl font-semibold md:text-5xl">{title}</h1>
            <p className="mt-2 text-fg-muted" aria-live="polite">
              {data ? `${data.total} ${data.total === 1 ? 'producto' : 'productos'}` : 'Cargando productos…'}
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <Input
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Buscar en el catálogo…"
              aria-label="Buscar productos"
              leading={<Search className="size-4" />}
              wrapperClassName="sm:w-72"
              type="search"
            />
            <div className="flex gap-3">
              <Select
                value={sort}
                onChange={(e) => update({ orden: e.target.value === 'popular' ? null : e.target.value })}
                aria-label="Ordenar por"
                wrapperClassName="flex-1 sm:w-56"
              >
                {sorts.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </Select>
              <Button
                variant="secondary"
                className="lg:hidden"
                icon={<SlidersHorizontal className="size-4" />}
                onClick={() => setFiltersOpen(true)}
              >
                Filtros
              </Button>
            </div>
          </div>
        </div>
        {activeChips.length > 0 && (
          <div className="mt-5 flex flex-wrap items-center gap-2">
            {activeChips.map((chip) => (
              <button
                key={chip.key}
                onClick={chip.clear}
                className="group flex items-center gap-1.5 rounded-full border border-cyan/30 bg-cyan/10 py-1 pr-2 pl-3 text-xs font-medium text-cyan transition-colors hover:border-cyan/60"
              >
                {chip.label} <X className="size-3.5 opacity-70 group-hover:opacity-100" />
              </button>
            ))}
            <button onClick={() => setParams(new URLSearchParams(), { replace: true })} className="ml-1 text-xs text-fg-subtle hover:text-fg">
              Limpiar todo
            </button>
          </div>
        )}
      </header>

      <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
        <aside className="hidden lg:block">
          <div className="glass sticky top-24 rounded-2xl p-5">{filters}</div>
        </aside>

        <div>
          {error ? (
            <p className="rounded-2xl border border-danger/30 bg-danger/10 p-4 text-sm text-danger">{error.message}</p>
          ) : data && data.items.length === 0 && !loading ? (
            <EmptyState
              icon={<PackageSearch className="size-6" />}
              title="Sin resultados"
              description="Prueba con otra búsqueda o quita algunos filtros."
              action={
                <Button variant="secondary" onClick={() => setParams(new URLSearchParams(), { replace: true })}>
                  Quitar filtros
                </Button>
              }
            />
          ) : (
            <div className={cn('transition-opacity duration-200', loading && data ? 'opacity-50' : '')}>
              <ProductGrid products={data?.items} loading={loading} count={12} />
            </div>
          )}

          {data && data.totalPages > 1 && (
            <nav className="mt-10 flex items-center justify-center gap-2" aria-label="Paginación">
              <Button
                variant="secondary"
                size="sm"
                disabled={page <= 1}
                onClick={() => {
                  update({ pagina: String(page - 1) }, false);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                icon={<ChevronLeft className="size-4" />}
                aria-label="Página anterior"
              />
              {Array.from({ length: data.totalPages }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  onClick={() => {
                    update({ pagina: n === 1 ? null : String(n) }, false);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className={cn(
                    'size-9 rounded-xl text-sm font-semibold transition-colors',
                    n === page ? 'bg-violet text-white' : 'text-fg-muted hover:bg-white/5 hover:text-fg',
                  )}
                  aria-current={n === page ? 'page' : undefined}
                >
                  {n}
                </button>
              ))}
              <Button
                variant="secondary"
                size="sm"
                disabled={page >= data.totalPages}
                onClick={() => {
                  update({ pagina: String(page + 1) }, false);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                icon={<ChevronRight className="size-4" />}
                aria-label="Página siguiente"
              />
            </nav>
          )}
        </div>
      </div>

      <Modal open={filtersOpen} onClose={() => setFiltersOpen(false)} title="Filtros">
        {filters}
        <Button className="mt-6 w-full" onClick={() => setFiltersOpen(false)}>
          Ver {data?.total ?? ''} productos
        </Button>
      </Modal>
    </div>
  );
}

interface FiltersProps {
  categories: Category[];
  brands: Brand[];
  selectedCategories: string[];
  selectedBrands: string[];
  min: string;
  max: string;
  inStock: boolean;
  onSale: boolean;
  onToggleCategory: (slug: string) => void;
  onToggleBrand: (slug: string) => void;
  onPrice: (min: string, max: string) => void;
  onStock: (v: boolean) => void;
  onSale_: (v: boolean) => void;
}

function Filters(p: FiltersProps) {
  const [lo, setLo] = useState(p.min);
  const [hi, setHi] = useState(p.max);
  const [showAllBrands, setShowAllBrands] = useState(false);
  useEffect(() => setLo(p.min), [p.min]);
  useEffect(() => setHi(p.max), [p.max]);
  const visibleBrands = showAllBrands ? p.brands : p.brands.slice(0, 8);

  return (
    <div className="space-y-7">
      <FilterGroup title="Categoría">
        <ul className="space-y-1">
          {p.categories.map((c) => {
            const active = p.selectedCategories.includes(c.slug);
            return (
              <li key={c.id}>
                <button
                  onClick={() => p.onToggleCategory(c.slug)}
                  className={cn(
                    'flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-sm transition-colors',
                    active ? 'bg-violet/15 text-fg' : 'text-fg-muted hover:bg-white/5 hover:text-fg',
                  )}
                  aria-pressed={active}
                >
                  <span className="flex min-w-0 items-center gap-2.5">
                    <span className="size-2 shrink-0 rounded-full" style={{ background: c.accentColor }} />
                    <span className="truncate">{c.name}</span>
                  </span>
                  <span className="ml-2 shrink-0 text-xs text-fg-subtle">{c.productCount}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </FilterGroup>

      <FilterGroup title="Precio (S/)">
        <form
          className="flex items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            p.onPrice(lo, hi);
          }}
        >
          <Input type="number" min={0} inputMode="numeric" placeholder="Mín." value={lo} onChange={(e) => setLo(e.target.value)} onBlur={() => p.onPrice(lo, hi)} aria-label="Precio mínimo" className="h-10" />
          <span className="pb-2.5 text-fg-subtle">–</span>
          <Input type="number" min={0} inputMode="numeric" placeholder="Máx." value={hi} onChange={(e) => setHi(e.target.value)} onBlur={() => p.onPrice(lo, hi)} aria-label="Precio máximo" className="h-10" />
        </form>
      </FilterGroup>

      <FilterGroup title="Disponibilidad">
        <div className="space-y-3">
          <Checkbox label="Solo productos disponibles" checked={p.inStock} onChange={(e) => p.onStock(e.target.checked)} />
          <Checkbox label="Solo ofertas" checked={p.onSale} onChange={(e) => p.onSale_(e.target.checked)} />
        </div>
      </FilterGroup>

      <FilterGroup title="Marca">
        <div className="space-y-2.5">
          {visibleBrands.map((b) => (
            <Checkbox
              key={b.id}
              label={
                <span className="flex w-full justify-between gap-2">
                  {b.name} <span className="text-xs text-fg-subtle">{b.productCount}</span>
                </span>
              }
              checked={p.selectedBrands.includes(b.slug)}
              onChange={() => p.onToggleBrand(b.slug)}
            />
          ))}
          {p.brands.length > 8 && (
            <button onClick={() => setShowAllBrands((v) => !v)} className="text-xs font-semibold text-cyan hover:underline">
              {showAllBrands ? 'Ver menos' : `Ver las ${p.brands.length} marcas`}
            </button>
          )}
        </div>
      </FilterGroup>
    </div>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset>
      <legend className="mb-3 font-display text-[11px] font-semibold tracking-[0.2em] text-fg-subtle uppercase">{title}</legend>
      {children}
    </fieldset>
  );
}
