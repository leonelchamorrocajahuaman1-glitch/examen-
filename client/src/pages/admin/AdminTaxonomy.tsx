import { useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { AdminHeader, Card, Table, td, Toggle } from '../../components/admin/ui';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input, Textarea } from '../../components/ui/Field';
import { Modal } from '../../components/ui/Modal';
import { PageLoader } from '../../components/ui/Spinner';
import { useFetch } from '../../hooks/useFetch';
import { api, ApiError } from '../../lib/api';
import type { Brand, Category } from '../../lib/types';
import { toast } from '../../store/toast';

function useCrud(base: string, reload: () => void) {
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const save = async (id: string | null, body: unknown) => {
    setSaving(true);
    setErrors({});
    try {
      await api(id ? `${base}/${id}` : base, { method: id ? 'PUT' : 'POST', body });
      toast.success('Guardado');
      reload();
      return true;
    } catch (err) {
      const e = err as ApiError;
      setErrors(e.fields ?? {});
      toast.error('No se pudo guardar', e.message);
      return false;
    } finally {
      setSaving(false);
    }
  };
  const remove = async (id: string, name: string) => {
    if (!window.confirm(`¿Eliminar "${name}"?`)) return;
    try {
      await api(`${base}/${id}`, { method: 'DELETE' });
      toast.success('Eliminado');
      reload();
    } catch (err) {
      toast.error('No se pudo eliminar', (err as ApiError).message);
    }
  };
  return { save, remove, saving, errors, setErrors };
}

type CategoryForm = { name: string; description: string; accentColor: string; isAlcoholic: boolean; sortOrder: string };

export function AdminCategories() {
  const { data, loading, reload } = useFetch<Category[]>('/admin/categories');
  const crud = useCrud('/admin/categories', reload);
  const [editing, setEditing] = useState<{ id: string | null; form: CategoryForm } | null>(null);

  if (loading && !data) return <PageLoader />;

  const open = (c?: Category) => {
    crud.setErrors({});
    setEditing({
      id: c?.id ?? null,
      form: c
        ? { name: c.name, description: c.description ?? '', accentColor: c.accentColor, isAlcoholic: c.isAlcoholic, sortOrder: String(c.sortOrder) }
        : { name: '', description: '', accentColor: '#8B5CF6', isAlcoholic: true, sortOrder: String(data?.length ?? 0) },
    });
  };

  return (
    <div>
      <AdminHeader title="Categorías" description="Organizan el catálogo y los filtros de la tienda." actions={<Button icon={<Plus className="size-4" />} onClick={() => open()}>Nueva categoría</Button>} />
      <Card padded={false}>
        <Table head={['Orden', 'Categoría', 'Productos', 'Tipo', '']}>
          {data?.map((c) => (
            <tr key={c.id} className="hover:bg-white/[.02]">
              <td className={`${td} w-16 tabular-nums text-fg-subtle`}>{c.sortOrder}</td>
              <td className={td}>
                <div className="flex items-center gap-3">
                  <span className="size-3 rounded-full" style={{ background: c.accentColor }} />
                  <div>
                    <p className="font-medium">{c.name}</p>
                    {c.description && <p className="max-w-md truncate text-xs text-fg-subtle">{c.description}</p>}
                  </div>
                </div>
              </td>
              <td className={`${td} tabular-nums`}>{c.productCount}</td>
              <td className={td}>{c.isAlcoholic ? <Badge>Con alcohol</Badge> : <Badge tone="success">Sin alcohol</Badge>}</td>
              <td className={td}>
                <div className="flex justify-end gap-1">
                  <button onClick={() => open(c)} className="rounded-lg p-2 text-fg-subtle hover:bg-white/5 hover:text-fg" aria-label="Editar">
                    <Pencil className="size-4" />
                  </button>
                  <button onClick={() => crud.remove(c.id, c.name)} className="rounded-lg p-2 text-fg-subtle hover:bg-danger/10 hover:text-danger" aria-label="Eliminar">
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </Table>
      </Card>

      <Modal open={Boolean(editing)} onClose={() => setEditing(null)} title={editing?.id ? 'Editar categoría' : 'Nueva categoría'}>
        {editing && (
          <form
            className="grid gap-4"
            noValidate
            onSubmit={async (e) => {
              e.preventDefault();
              const f = editing.form;
              const ok = await crud.save(editing.id, { ...f, description: f.description || null, sortOrder: Number(f.sortOrder) });
              if (ok) setEditing(null);
            }}
          >
            <Input label="Nombre" value={editing.form.name} onChange={(e) => setEditing({ ...editing, form: { ...editing.form, name: e.target.value } })} error={crud.errors.name} />
            <Textarea label="Descripción" value={editing.form.description} onChange={(e) => setEditing({ ...editing, form: { ...editing.form, description: e.target.value } })} optional />
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-end gap-2">
                <Input label="Color" value={editing.form.accentColor} onChange={(e) => setEditing({ ...editing, form: { ...editing.form, accentColor: e.target.value } })} error={crud.errors.accentColor} wrapperClassName="flex-1" />
                <input type="color" value={editing.form.accentColor} onChange={(e) => setEditing({ ...editing, form: { ...editing.form, accentColor: e.target.value.toUpperCase() } })} className="h-11 w-12 cursor-pointer rounded-xl border border-line bg-ink-800 p-1" aria-label="Elegir color" />
              </div>
              <Input label="Orden" type="number" min={0} value={editing.form.sortOrder} onChange={(e) => setEditing({ ...editing, form: { ...editing.form, sortOrder: e.target.value } })} />
            </div>
            <label className="flex items-center gap-3 text-sm">
              <Toggle checked={editing.form.isAlcoholic} onChange={(v) => setEditing({ ...editing, form: { ...editing.form, isAlcoholic: v } })} label="Contiene alcohol" /> Contiene alcohol
            </label>
            <div className="flex justify-end gap-2">
              <Button variant="quiet" onClick={() => setEditing(null)}>Cancelar</Button>
              <Button type="submit" loading={crud.saving}>Guardar</Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}

type BrandForm = { name: string; country: string; description: string; isPremium: boolean };

export function AdminBrands() {
  const { data, loading, reload } = useFetch<Brand[]>('/admin/brands');
  const crud = useCrud('/admin/brands', reload);
  const [editing, setEditing] = useState<{ id: string | null; form: BrandForm } | null>(null);

  if (loading && !data) return <PageLoader />;

  const open = (b?: Brand) => {
    crud.setErrors({});
    setEditing({
      id: b?.id ?? null,
      form: b ? { name: b.name, country: b.country ?? '', description: b.description ?? '', isPremium: b.isPremium } : { name: '', country: '', description: '', isPremium: false },
    });
  };

  return (
    <div>
      <AdminHeader title="Marcas" description="Las marcas premium aparecen en la página de inicio." actions={<Button icon={<Plus className="size-4" />} onClick={() => open()}>Nueva marca</Button>} />
      <Card padded={false}>
        <Table head={['Marca', 'País', 'Productos', 'Premium', '']}>
          {data?.map((b) => (
            <tr key={b.id} className="hover:bg-white/[.02]">
              <td className={td}>
                <p className="font-medium">{b.name}</p>
                {b.description && <p className="max-w-md truncate text-xs text-fg-subtle">{b.description}</p>}
              </td>
              <td className={`${td} text-fg-muted`}>{b.country}</td>
              <td className={`${td} tabular-nums`}>{b.productCount}</td>
              <td className={td}>
                <Toggle checked={b.isPremium} onChange={(v) => crud.save(b.id, { name: b.name, country: b.country, description: b.description, isPremium: v })} label={`Premium: ${b.name}`} />
              </td>
              <td className={td}>
                <div className="flex justify-end gap-1">
                  <button onClick={() => open(b)} className="rounded-lg p-2 text-fg-subtle hover:bg-white/5 hover:text-fg" aria-label="Editar">
                    <Pencil className="size-4" />
                  </button>
                  <button onClick={() => crud.remove(b.id, b.name)} className="rounded-lg p-2 text-fg-subtle hover:bg-danger/10 hover:text-danger" aria-label="Eliminar">
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </Table>
      </Card>

      <Modal open={Boolean(editing)} onClose={() => setEditing(null)} title={editing?.id ? 'Editar marca' : 'Nueva marca'}>
        {editing && (
          <form
            className="grid gap-4"
            noValidate
            onSubmit={async (e) => {
              e.preventDefault();
              const f = editing.form;
              const ok = await crud.save(editing.id, { ...f, country: f.country || null, description: f.description || null });
              if (ok) setEditing(null);
            }}
          >
            <Input label="Nombre" value={editing.form.name} onChange={(e) => setEditing({ ...editing, form: { ...editing.form, name: e.target.value } })} error={crud.errors.name} />
            <Input label="País de origen" value={editing.form.country} onChange={(e) => setEditing({ ...editing, form: { ...editing.form, country: e.target.value } })} optional />
            <Textarea label="Descripción" value={editing.form.description} onChange={(e) => setEditing({ ...editing, form: { ...editing.form, description: e.target.value } })} optional />
            <label className="flex items-center gap-3 text-sm">
              <Toggle checked={editing.form.isPremium} onChange={(v) => setEditing({ ...editing, form: { ...editing.form, isPremium: v } })} label="Marca premium" /> Marca premium
            </label>
            <div className="flex justify-end gap-2">
              <Button variant="quiet" onClick={() => setEditing(null)}>Cancelar</Button>
              <Button type="submit" loading={crud.saving}>Guardar</Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
