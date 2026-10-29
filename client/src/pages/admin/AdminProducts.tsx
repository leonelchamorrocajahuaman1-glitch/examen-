import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ImagePlus, Pencil, Plus, Save, Search, Trash2, X } from 'lucide-react';
import { AdminHeader, Card, Pagination, Table, td, Toggle } from '../../components/admin/ui';
import { BottleArt } from '../../components/product/BottleArt';
import { ProductVisual } from '../../components/product/ProductVisual';
import { Badge } from '../../components/ui/Badge';
import { Button, LinkButton } from '../../components/ui/Button';
import { Input, Select, Textarea } from '../../components/ui/Field';
import { PageLoader, Spinner } from '../../components/ui/Spinner';
import { useDebounced, useFetch } from '../../hooks/useFetch';
import { api, ApiError, qs } from '../../lib/api';
import { formatPrice, formatVolume } from '../../lib/format';
import type { BottleShape, Brand, Category, Paginated, Product } from '../../lib/types';
import { toast } from '../../store/toast';

const shapes: { value: BottleShape; label: string }[] = [
  { value: 'CLASSIC', label: 'Clásica (whisky)' },
  { value: 'SQUARE', label: 'Cuadrada (gin)' },
  { value: 'TALL', label: 'Alta (vodka)' },
  { value: 'ROUND', label: 'Redonda (ron / tequila)' },
  { value: 'WINE', label: 'Vino' },
  { value: 'CHAMPAGNE', label: 'Champagne' },
  { value: 'CAN', label: 'Lata / pack' },
];

function StockCell({ product, onSaved }: { product: Product; onSaved: (p: Product) => void }) {
  const [value, setValue] = useState(String(product.stock));
  const [saving, setSaving] = useState(false);
  useEffect(() => setValue(String(product.stock)), [product.stock]);
  const dirty = Number(value) !== product.stock;

  const save = async () => {
    if (!dirty || value === '' || Number(value) < 0) return setValue(String(product.stock));
    setSaving(true);
    try {
      onSaved(await api<Product>(`/admin/products/${product.id}`, { method: 'PATCH', body: { stock: Number(value) } }));
      toast.success('Stock actualizado', product.name);
    } catch (err) {
      toast.error('No se pudo actualizar', (err as ApiError).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        min={0}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
        className={`h-9 w-20 rounded-lg border bg-ink-800 px-2 text-sm tabular-nums outline-none focus:border-cyan/70 ${
          product.stock === 0 ? 'border-danger/50' : product.stock <= 6 ? 'border-warning/50' : 'border-line'
        }`}
        aria-label={`Stock de ${product.name}`}
      />
      {saving && <Spinner className="size-4 text-fg-subtle" />}
    </div>
  );
}

export function AdminProducts() {
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState(params.get('q') ?? '');
  const q = useDebounced(search.trim(), 300);
  const status = params.get('estado') ?? 'all';
  const category = params.get('categoria') ?? '';
  const page = Number(params.get('pagina')) || 1;
  const { data, loading, error, setData, reload } = useFetch<Paginated<Product>>(
    `/admin/products${qs({ search: q, status, category, page, pageSize: 20 })}`,
  );
  const { data: categories } = useFetch<Category[]>('/admin/categories');

  const set = (k: string, v: string) => {
    const next = new URLSearchParams(params);
    if (v && v !== 'all') next.set(k, v);
    else next.delete(k);
    if (k !== 'pagina') next.delete('pagina');
    setParams(next, { replace: true });
  };

  const replace = (p: Product) => setData((d) => (d ? { ...d, items: d.items.map((x) => (x.id === p.id ? p : x)) } : d!));

  const quick = async (p: Product, patch: Partial<Pick<Product, 'isActive' | 'isFeatured'>>) => {
    try {
      replace(await api<Product>(`/admin/products/${p.id}`, { method: 'PATCH', body: patch }));
    } catch (err) {
      toast.error('No se pudo actualizar', (err as ApiError).message);
    }
  };

  const remove = async (p: Product) => {
    if (!window.confirm(`¿Eliminar "${p.name}"? Si tiene pedidos, se desactivará en su lugar.`)) return;
    try {
      const res = await api<{ archived: boolean; message?: string }>(`/admin/products/${p.id}`, { method: 'DELETE' });
      toast.success(res.archived ? 'Producto desactivado' : 'Producto eliminado', res.message);
      reload();
    } catch (err) {
      toast.error('No se pudo eliminar', (err as ApiError).message);
    }
  };

  return (
    <div>
      <AdminHeader
        title="Productos"
        description={data ? `${data.total} productos` : undefined}
        actions={
          <LinkButton to="/admin/productos/nuevo" icon={<Plus className="size-4" />}>
            Nuevo producto
          </LinkButton>
        }
      />
      <Card padded={false}>
        <div className="grid gap-3 border-b border-line p-4 sm:grid-cols-[1fr_220px_200px]">
          <Input placeholder="Buscar por nombre, marca o slug" value={search} onChange={(e) => setSearch(e.target.value)} leading={<Search className="size-4" />} aria-label="Buscar" />
          <Select value={category} onChange={(e) => set('categoria', e.target.value)} aria-label="Categoría">
            <option value="">Todas las categorías</option>
            {categories?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          <Select value={status} onChange={(e) => set('estado', e.target.value)} aria-label="Estado">
            <option value="all">Todos</option>
            <option value="active">Activos</option>
            <option value="inactive">Inactivos</option>
            <option value="low_stock">Stock bajo</option>
            <option value="out_of_stock">Agotados</option>
          </Select>
        </div>
        {error && <p className="p-4 text-sm text-danger">{error.message}</p>}
        <div className={loading ? 'opacity-60' : ''}>
          <Table head={['Producto', 'Categoría', 'Precio', 'Stock', 'Vendidos', 'Activo', 'Destacado', '']}>
            {data?.items.map((p) => (
              <tr key={p.id} className="hover:bg-white/[.02]">
                <td className={td}>
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-9 shrink-0 items-center justify-center">
                      <ProductVisual name={p.name} brand={p.brand.name} shape={p.bottleShape} color={p.accentColor} imageUrl={p.images[0]?.url} className="h-12 w-auto" imgClassName="h-12 w-9" />
                    </div>
                    <div className="min-w-0">
                      <Link to={`/admin/productos/${p.id}`} className="block max-w-64 truncate font-medium hover:text-cyan">
                        {p.name}
                      </Link>
                      <p className="text-xs text-fg-subtle">
                        {p.brand.name} · {formatVolume(p.volumeMl)}
                      </p>
                    </div>
                  </div>
                </td>
                <td className={`${td} text-fg-muted`}>{p.category.name}</td>
                <td className={`${td} whitespace-nowrap tabular-nums`}>
                  {formatPrice(p.finalPriceCents)}
                  {p.salePriceCents !== null && <Badge tone="sale" className="ml-2">Oferta</Badge>}
                </td>
                <td className={td}>
                  <StockCell product={p} onSaved={replace} />
                </td>
                <td className={`${td} tabular-nums text-fg-muted`}>{p.soldCount}</td>
                <td className={td}>
                  <Toggle checked={p.isActive} onChange={(v) => quick(p, { isActive: v })} label={`Activo: ${p.name}`} />
                </td>
                <td className={td}>
                  <Toggle checked={p.isFeatured} onChange={(v) => quick(p, { isFeatured: v })} label={`Destacado: ${p.name}`} />
                </td>
                <td className={td}>
                  <div className="flex justify-end gap-1">
                    <Link to={`/admin/productos/${p.id}`} className="rounded-lg p-2 text-fg-subtle hover:bg-white/5 hover:text-fg" aria-label="Editar">
                      <Pencil className="size-4" />
                    </Link>
                    <button onClick={() => remove(p)} className="rounded-lg p-2 text-fg-subtle hover:bg-danger/10 hover:text-danger" aria-label="Eliminar">
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </Table>
          {data && !data.items.length && <p className="p-6 text-center text-sm text-fg-subtle">No hay productos con estos filtros.</p>}
        </div>
        {data && <Pagination page={data.page} totalPages={data.totalPages} onChange={(p) => set('pagina', String(p))} />}
      </Card>
    </div>
  );
}

interface ProductForm {
  name: string;
  slug: string;
  brandId: string;
  categoryId: string;
  shortDescription: string;
  description: string;
  presentation: string;
  volumeMl: string;
  abv: string;
  origin: string;
  tastingNotes: string;
  price: string;
  salePrice: string;
  stock: string;
  isActive: boolean;
  isFeatured: boolean;
  accentColor: string;
  bottleShape: BottleShape;
}

const emptyForm: ProductForm = {
  name: '',
  slug: '',
  brandId: '',
  categoryId: '',
  shortDescription: '',
  description: '',
  presentation: 'Botella de vidrio',
  volumeMl: '750',
  abv: '40',
  origin: '',
  tastingNotes: '',
  price: '',
  salePrice: '',
  stock: '0',
  isActive: true,
  isFeatured: false,
  accentColor: '#C9731F',
  bottleShape: 'CLASSIC',
};

const toForm = (p: Product): ProductForm => ({
  name: p.name,
  slug: p.slug,
  brandId: p.brand.id,
  categoryId: p.category.id,
  shortDescription: p.shortDescription,
  description: p.description,
  presentation: p.presentation,
  volumeMl: String(p.volumeMl),
  abv: p.abv === null ? '' : String(p.abv),
  origin: p.origin ?? '',
  tastingNotes: p.tastingNotes.join(', '),
  price: (p.priceCents / 100).toFixed(2),
  salePrice: p.salePriceCents === null ? '' : (p.salePriceCents / 100).toFixed(2),
  stock: String(p.stock),
  isActive: p.isActive,
  isFeatured: p.isFeatured,
  accentColor: p.accentColor,
  bottleShape: p.bottleShape,
});

const toCents = (v: string) => Math.round(Number(v.replace(',', '.')) * 100);

export function AdminProductForm() {
  const { id } = useParams();
  const isNew = !id;
  const navigate = useNavigate();
  const { data: product, loading, setData: setProduct } = useFetch<Product>(isNew ? null : `/admin/products/${id}`);
  const { data: brands } = useFetch<Brand[]>('/admin/brands');
  const { data: categories } = useFetch<Category[]>('/admin/categories');
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (product) setForm(toForm(product));
  }, [product]);

  if (!isNew && loading && !product) return <PageLoader />;

  const set = <K extends keyof ProductForm>(k: K, v: ProductForm[K]) => setForm((f) => ({ ...f, [k]: v }));
  const field = (k: keyof ProductForm) => ({
    value: form[k] as string,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => set(k, e.target.value as never),
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    const body = {
      name: form.name,
      slug: form.slug || undefined,
      brandId: form.brandId,
      categoryId: form.categoryId,
      shortDescription: form.shortDescription,
      description: form.description,
      presentation: form.presentation,
      volumeMl: Number(form.volumeMl),
      abv: form.abv === '' ? null : Number(form.abv),
      origin: form.origin || null,
      tastingNotes: form.tastingNotes.split(',').map((s) => s.trim()).filter(Boolean),
      priceCents: toCents(form.price || '0'),
      salePriceCents: form.salePrice ? toCents(form.salePrice) : null,
      stock: Number(form.stock),
      isActive: form.isActive,
      isFeatured: form.isFeatured,
      accentColor: form.accentColor,
      bottleShape: form.bottleShape,
    };
    try {
      const saved = await api<Product>(isNew ? '/admin/products' : `/admin/products/${id}`, { method: isNew ? 'POST' : 'PUT', body });
      toast.success(isNew ? 'Producto creado' : 'Cambios guardados', saved.name);
      if (isNew) navigate(`/admin/productos/${saved.id}`, { replace: true });
      else setProduct(saved);
    } catch (err) {
      const e = err as ApiError;
      const f = e.fields ?? {};
      if (f.priceCents) f.price = f.priceCents;
      if (f.salePriceCents) f.salePrice = f.salePriceCents;
      setErrors(f);
      toast.error('Revisa el formulario', e.message);
    } finally {
      setSaving(false);
    }
  };

  const upload = async (files: FileList | null) => {
    if (!files?.length || !product) return;
    const fd = new FormData();
    Array.from(files).forEach((f) => fd.append('images', f));
    setUploading(true);
    try {
      setProduct(await api<Product>(`/admin/products/${product.id}/images`, { method: 'POST', form: fd }));
      toast.success('Imágenes subidas');
    } catch (err) {
      toast.error('No se pudieron subir', (err as ApiError).message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const removeImage = async (imageId: string) => {
    if (!product) return;
    try {
      setProduct(await api<Product>(`/admin/products/${product.id}/images/${imageId}`, { method: 'DELETE' }));
    } catch (err) {
      toast.error('No se pudo eliminar la imagen', (err as ApiError).message);
    }
  };

  const brandName = brands?.find((b) => b.id === form.brandId)?.name ?? 'MARCA';

  return (
    <form onSubmit={submit} noValidate>
      <Link to="/admin/productos" className="mb-4 inline-flex items-center gap-2 text-sm text-fg-muted hover:text-fg">
        <ArrowLeft className="size-4" /> Productos
      </Link>
      <AdminHeader
        title={isNew ? 'Nuevo producto' : form.name || 'Editar producto'}
        actions={
          <>
            {!isNew && product && (
              <LinkButton to={`/producto/${product.slug}`} target="_blank" variant="secondary">
                Ver en tienda
              </LinkButton>
            )}
            <Button type="submit" loading={saving} icon={<Save className="size-4" />}>
              Guardar
            </Button>
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <Card title="Información">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Nombre" {...field('name')} error={errors.name} wrapperClassName="sm:col-span-2" />
              <Select label="Marca" {...field('brandId')} error={errors.brandId}>
                <option value="">Selecciona…</option>
                {brands?.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </Select>
              <Select label="Categoría" {...field('categoryId')} error={errors.categoryId}>
                <option value="">Selecciona…</option>
                {categories?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
              <Input label="Descripción corta" {...field('shortDescription')} error={errors.shortDescription} wrapperClassName="sm:col-span-2" maxLength={200} />
              <Textarea label="Descripción detallada" {...field('description')} error={errors.description} wrapperClassName="sm:col-span-2" className="min-h-32" />
              <Input label="Notas de cata" {...field('tastingNotes')} hint="Separadas por comas" optional wrapperClassName="sm:col-span-2" />
              <Input label="Slug (URL)" {...field('slug')} error={errors.slug} hint="Se genera a partir del nombre si lo dejas vacío" optional />
              <Input label="Origen" {...field('origin')} optional />
            </div>
          </Card>

          <Card title="Presentación">
            <div className="grid gap-4 sm:grid-cols-3">
              <Input label="Presentación" {...field('presentation')} error={errors.presentation} />
              <Input label="Volumen (ml)" type="number" min={1} {...field('volumeMl')} error={errors.volumeMl} />
              <Input label="Graduación (% vol.)" type="number" min={0} max={96} step="0.1" {...field('abv')} error={errors.abv} hint="Vacío si no aplica" />
            </div>
          </Card>

          <Card title="Precio e inventario">
            <div className="grid gap-4 sm:grid-cols-3">
              <Input label="Precio (S/)" type="number" min={0} step="0.01" {...field('price')} error={errors.price} />
              <Input label="Precio de oferta (S/)" type="number" min={0} step="0.01" {...field('salePrice')} error={errors.salePrice} optional />
              <Input label="Stock (unidades)" type="number" min={0} {...field('stock')} error={errors.stock} />
            </div>
            <div className="mt-5 flex flex-wrap gap-6">
              <label className="flex items-center gap-3 text-sm">
                <Toggle checked={form.isActive} onChange={(v) => set('isActive', v)} label="Activo" /> Visible en la tienda
              </label>
              <label className="flex items-center gap-3 text-sm">
                <Toggle checked={form.isFeatured} onChange={(v) => set('isFeatured', v)} label="Destacado" /> Destacado en inicio
              </label>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Imágenes">
            {isNew ? (
              <p className="text-sm text-fg-subtle">Guarda el producto para poder subir fotos.</p>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-2">
                  {product?.images.map((img) => (
                    <div key={img.id} className="group relative aspect-[3/4] overflow-hidden rounded-xl border border-line bg-white/[.03]">
                      <img src={img.url} alt="" className="size-full object-contain p-1" />
                      <button
                        type="button"
                        onClick={() => removeImage(img.id)}
                        className="absolute top-1 right-1 rounded-lg bg-ink-950/80 p-1 text-fg-muted opacity-0 transition-opacity group-hover:opacity-100 hover:text-danger focus:opacity-100"
                        aria-label="Eliminar imagen"
                      >
                        <X className="size-4" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                    className="flex aspect-[3/4] flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-line-strong text-xs text-fg-muted hover:border-cyan/50 hover:text-cyan"
                  >
                    {uploading ? <Spinner className="size-5" /> : <ImagePlus className="size-5" />}
                    Subir
                  </button>
                </div>
                <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple hidden onChange={(e) => upload(e.target.files)} />
                <p className="mt-3 text-xs text-fg-subtle">JPG, PNG, WEBP o AVIF · máx. 5 MB · hasta 8 imágenes. Fondo transparente recomendado.</p>
              </>
            )}
          </Card>

          <Card title="Ilustración y 3D">
            <p className="mb-4 text-xs text-fg-subtle">Se usa cuando no hay foto y para la vista 3D del producto.</p>
            <div className="mb-4 flex h-48 items-center justify-center rounded-xl bg-white/[.02]">
              <BottleArt shape={form.bottleShape} color={form.accentColor} brand={brandName} className="h-44 w-auto" />
            </div>
            <div className="grid gap-4">
              <Select label="Forma de botella" value={form.bottleShape} onChange={(e) => set('bottleShape', e.target.value as BottleShape)}>
                {shapes.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </Select>
              <div className="flex items-end gap-3">
                <Input label="Color del líquido" {...field('accentColor')} error={errors.accentColor} wrapperClassName="flex-1" />
                <input
                  type="color"
                  value={form.accentColor}
                  onChange={(e) => set('accentColor', e.target.value.toUpperCase())}
                  className="h-11 w-12 cursor-pointer rounded-xl border border-line bg-ink-800 p-1"
                  aria-label="Elegir color"
                />
              </div>
            </div>
          </Card>
        </div>
      </div>
    </form>
  );
}
