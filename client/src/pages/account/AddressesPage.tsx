import { useState } from 'react';
import { MapPin, Pencil, Plus, Star, Trash2 } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Checkbox, Input } from '../../components/ui/Field';
import { Modal } from '../../components/ui/Modal';
import { EmptyState } from '../../components/ui/misc';
import { PageLoader } from '../../components/ui/Spinner';
import { useFetch } from '../../hooks/useFetch';
import { api, ApiError } from '../../lib/api';
import type { Address } from '../../lib/types';
import { toast } from '../../store/toast';

type Form = Omit<Address, 'id' | 'line2' | 'reference'> & { line2: string; reference: string };
const empty: Form = { label: 'Casa', recipient: '', phone: '', line1: '', line2: '', district: '', city: 'Lima', region: 'Lima', reference: '', isDefault: false };

export function AddressesPage() {
  const { data, loading, error, reload } = useFetch<Address[]>('/account/addresses');
  const [editing, setEditing] = useState<{ id: string | null; form: Form } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const open = (a?: Address) => {
    setErrors({});
    setEditing(
      a
        ? { id: a.id, form: { ...a, line2: a.line2 ?? '', reference: a.reference ?? '' } }
        : { id: null, form: { ...empty, isDefault: !data?.length } },
    );
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    try {
      const { id, form } = editing;
      await api(id ? `/account/addresses/${id}` : '/account/addresses', { method: id ? 'PATCH' : 'POST', body: form });
      toast.success(id ? 'Dirección actualizada' : 'Dirección guardada');
      setEditing(null);
      reload();
    } catch (err) {
      const e = err as ApiError;
      setErrors(e.fields ?? {});
      toast.error('No se pudo guardar', e.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (a: Address) => {
    if (!window.confirm(`¿Eliminar la dirección "${a.label}"?`)) return;
    try {
      await api(`/account/addresses/${a.id}`, { method: 'DELETE' });
      reload();
    } catch (err) {
      toast.error('No se pudo eliminar', (err as ApiError).message);
    }
  };

  const makeDefault = async (a: Address) => {
    await api(`/account/addresses/${a.id}`, { method: 'PATCH', body: { isDefault: true } }).catch(() => undefined);
    reload();
  };

  if (loading && !data) return <PageLoader />;
  if (error) return <p className="text-sm text-danger">{error.message}</p>;

  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setEditing((s) => s && { ...s, form: { ...s.form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value } });

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold">Direcciones de entrega</h2>
        <Button size="sm" icon={<Plus className="size-4" />} onClick={() => open()}>
          Nueva dirección
        </Button>
      </div>
      {!data?.length ? (
        <EmptyState icon={<MapPin className="size-6" />} title="Sin direcciones guardadas" description="Guarda tus direcciones para comprar más rápido." />
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {data.map((a) => (
            <li key={a.id} className="glass flex flex-col rounded-2xl p-5">
              <div className="flex items-center gap-2">
                <MapPin className="size-4 text-cyan" />
                <span className="font-semibold">{a.label}</span>
                {a.isDefault && <Badge tone="info">Principal</Badge>}
              </div>
              <p className="mt-3 text-sm text-fg-muted">
                {a.recipient} · {a.phone}
                <br />
                {a.line1}
                {a.line2 && `, ${a.line2}`}
                <br />
                {a.district}, {a.city}, {a.region}
              </p>
              {a.reference && <p className="mt-1 text-xs text-fg-subtle">Ref.: {a.reference}</p>}
              <div className="mt-4 flex gap-1 border-t border-line pt-3">
                <Button variant="quiet" size="sm" icon={<Pencil className="size-3.5" />} onClick={() => open(a)}>
                  Editar
                </Button>
                {!a.isDefault && (
                  <Button variant="quiet" size="sm" icon={<Star className="size-3.5" />} onClick={() => makeDefault(a)}>
                    Principal
                  </Button>
                )}
                <Button variant="quiet" size="sm" className="ml-auto hover:text-danger" icon={<Trash2 className="size-3.5" />} onClick={() => remove(a)}>
                  Eliminar
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal open={Boolean(editing)} onClose={() => setEditing(null)} title={editing?.id ? 'Editar dirección' : 'Nueva dirección'}>
        {editing && (
          <form onSubmit={save} className="grid gap-4 sm:grid-cols-2" noValidate>
            <Input label="Nombre (ej. Casa, Oficina)" value={editing.form.label} onChange={set('label')} error={errors.label} />
            <Input label="¿Quién recibe?" value={editing.form.recipient} onChange={set('recipient')} error={errors.recipient} />
            <Input label="Teléfono" type="tel" value={editing.form.phone} onChange={set('phone')} error={errors.phone} />
            <Input label="Distrito" value={editing.form.district} onChange={set('district')} error={errors.district} />
            <Input label="Dirección" value={editing.form.line1} onChange={set('line1')} error={errors.line1} wrapperClassName="sm:col-span-2" />
            <Input label="Dpto. / Interior" value={editing.form.line2} onChange={set('line2')} optional />
            <Input label="Ciudad" value={editing.form.city} onChange={set('city')} error={errors.city} />
            <Input label="Región" value={editing.form.region} onChange={set('region')} error={errors.region} />
            <Input label="Referencia" value={editing.form.reference} onChange={set('reference')} optional />
            <Checkbox label="Usar como dirección principal" checked={editing.form.isDefault} onChange={set('isDefault')} className="sm:col-span-2" />
            <div className="flex justify-end gap-2 sm:col-span-2">
              <Button variant="quiet" onClick={() => setEditing(null)}>
                Cancelar
              </Button>
              <Button type="submit" loading={saving}>
                Guardar
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
