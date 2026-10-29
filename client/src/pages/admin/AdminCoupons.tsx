import { useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { AdminHeader, Card, Table, td, Toggle } from '../../components/admin/ui';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input, Select } from '../../components/ui/Field';
import { Modal } from '../../components/ui/Modal';
import { PageLoader } from '../../components/ui/Spinner';
import { useFetch } from '../../hooks/useFetch';
import { api, ApiError } from '../../lib/api';
import { formatDate, formatPrice } from '../../lib/format';
import type { Coupon } from '../../lib/types';
import { toast } from '../../store/toast';

interface Form {
  code: string;
  description: string;
  type: 'PERCENT' | 'FIXED';
  value: string;
  minSubtotal: string;
  maxUses: string;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
}

const empty: Form = { code: '', description: '', type: 'PERCENT', value: '10', minSubtotal: '0', maxUses: '', startsAt: '', endsAt: '', isActive: true };

const limaDay = (iso: string | null) => (iso ? new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima' }).format(new Date(iso)) : '');

function couponState(c: Coupon) {
  const now = Date.now();
  if (!c.isActive) return { label: 'Inactivo', tone: 'neutral' as const };
  if (c.endsAt && new Date(c.endsAt).getTime() < now) return { label: 'Expirado', tone: 'danger' as const };
  if (c.startsAt && new Date(c.startsAt).getTime() > now) return { label: 'Programado', tone: 'info' as const };
  if (c.maxUses !== null && c.usedCount >= c.maxUses) return { label: 'Agotado', tone: 'warning' as const };
  return { label: 'Vigente', tone: 'success' as const };
}

export function AdminCoupons() {
  const { data, loading, reload } = useFetch<Coupon[]>('/admin/coupons');
  const [editing, setEditing] = useState<{ id: string | null; form: Form } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  if (loading && !data) return <PageLoader />;

  const toBody = (f: Form) => ({
    code: f.code,
    description: f.description || null,
    type: f.type,
    value: f.type === 'PERCENT' ? Number(f.value) : Math.round(Number(f.value) * 100),
    minSubtotalCents: Math.round(Number(f.minSubtotal || 0) * 100),
    maxUses: f.maxUses ? Number(f.maxUses) : null,
    startsAt: f.startsAt || null,
    endsAt: f.endsAt || null,
    isActive: f.isActive,
  });

  const open = (c?: Coupon) => {
    setErrors({});
    setEditing({
      id: c?.id ?? null,
      form: c
        ? {
            code: c.code,
            description: c.description ?? '',
            type: c.type,
            value: c.type === 'PERCENT' ? String(c.value) : (c.value / 100).toFixed(2),
            minSubtotal: (c.minSubtotalCents / 100).toFixed(2),
            maxUses: c.maxUses ? String(c.maxUses) : '',
            startsAt: limaDay(c.startsAt),
            endsAt: limaDay(c.endsAt),
            isActive: c.isActive,
          }
        : empty,
    });
  };

  const save = async (id: string | null, form: Form) => {
    setSaving(true);
    setErrors({});
    try {
      await api(id ? `/admin/coupons/${id}` : '/admin/coupons', { method: id ? 'PUT' : 'POST', body: toBody(form) });
      toast.success('Cupón guardado');
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

  const toggle = async (c: Coupon, isActive: boolean) => {
    try {
      await api(`/admin/coupons/${c.id}`, {
        method: 'PUT',
        body: { ...c, isActive, startsAt: c.startsAt, endsAt: c.endsAt },
      });
      reload();
    } catch (err) {
      toast.error('No se pudo actualizar', (err as ApiError).message);
    }
  };

  const remove = async (c: Coupon) => {
    if (!window.confirm(`¿Eliminar el cupón ${c.code}?`)) return;
    try {
      const res = await api<{ archived: boolean; message?: string }>(`/admin/coupons/${c.id}`, { method: 'DELETE' });
      toast.success(res.archived ? 'Cupón desactivado' : 'Cupón eliminado', res.message);
      reload();
    } catch (err) {
      toast.error('No se pudo eliminar', (err as ApiError).message);
    }
  };

  const f = editing?.form;
  const setF = (patch: Partial<Form>) => setEditing((s) => s && { ...s, form: { ...s.form, ...patch } });

  return (
    <div>
      <AdminHeader title="Cupones" description="Descuentos que los clientes aplican en el carrito." actions={<Button icon={<Plus className="size-4" />} onClick={() => open()}>Nuevo cupón</Button>} />
      <Card padded={false}>
        <Table head={['Código', 'Descuento', 'Mínimo', 'Usos', 'Vigencia', 'Estado', 'Activo', '']}>
          {data?.map((c) => {
            const state = couponState(c);
            return (
              <tr key={c.id} className="hover:bg-white/[.02]">
                <td className={td}>
                  <p className="font-mono font-semibold">{c.code}</p>
                  {c.description && <p className="max-w-56 truncate text-xs text-fg-subtle">{c.description}</p>}
                </td>
                <td className={`${td} tabular-nums`}>{c.type === 'PERCENT' ? `${c.value}%` : formatPrice(c.value)}</td>
                <td className={`${td} tabular-nums`}>{c.minSubtotalCents ? formatPrice(c.minSubtotalCents) : '—'}</td>
                <td className={`${td} tabular-nums`}>
                  {c.usedCount}
                  {c.maxUses ? ` / ${c.maxUses}` : ''}
                </td>
                <td className={`${td} text-xs whitespace-nowrap text-fg-subtle`}>
                  {c.startsAt ? formatDate(c.startsAt) : 'Siempre'} → {c.endsAt ? formatDate(c.endsAt) : 'Sin fin'}
                </td>
                <td className={td}>
                  <Badge tone={state.tone}>{state.label}</Badge>
                </td>
                <td className={td}>
                  <Toggle checked={c.isActive} onChange={(v) => toggle(c, v)} label={`Activo: ${c.code}`} />
                </td>
                <td className={td}>
                  <div className="flex justify-end gap-1">
                    <button onClick={() => open(c)} className="rounded-lg p-2 text-fg-subtle hover:bg-white/5 hover:text-fg" aria-label="Editar">
                      <Pencil className="size-4" />
                    </button>
                    <button onClick={() => remove(c)} className="rounded-lg p-2 text-fg-subtle hover:bg-danger/10 hover:text-danger" aria-label="Eliminar">
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </Table>
        {data && !data.length && <p className="p-6 text-center text-sm text-fg-subtle">No hay cupones.</p>}
      </Card>

      <Modal open={Boolean(editing)} onClose={() => setEditing(null)} title={editing?.id ? 'Editar cupón' : 'Nuevo cupón'}>
        {editing && f && (
          <form
            className="grid gap-4 sm:grid-cols-2"
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              save(editing.id, f);
            }}
          >
            <Input label="Código" value={f.code} onChange={(e) => setF({ code: e.target.value.toUpperCase() })} error={errors.code} />
            <Select label="Tipo" value={f.type} onChange={(e) => setF({ type: e.target.value as Form['type'] })}>
              <option value="PERCENT">Porcentaje (%)</option>
              <option value="FIXED">Monto fijo (S/)</option>
            </Select>
            <Input label={f.type === 'PERCENT' ? 'Descuento (%)' : 'Descuento (S/)'} type="number" min={1} step={f.type === 'PERCENT' ? 1 : 0.01} value={f.value} onChange={(e) => setF({ value: e.target.value })} error={errors.value} />
            <Input label="Compra mínima (S/)" type="number" min={0} step="0.01" value={f.minSubtotal} onChange={(e) => setF({ minSubtotal: e.target.value })} error={errors.minSubtotalCents} />
            <Input label="Usos máximos" type="number" min={1} value={f.maxUses} onChange={(e) => setF({ maxUses: e.target.value })} optional hint="Vacío = ilimitado" />
            <Input label="Descripción" value={f.description} onChange={(e) => setF({ description: e.target.value })} optional />
            <Input label="Desde" type="date" value={f.startsAt} onChange={(e) => setF({ startsAt: e.target.value })} optional />
            <Input label="Hasta" type="date" value={f.endsAt} onChange={(e) => setF({ endsAt: e.target.value })} error={errors.endsAt} optional />
            <label className="flex items-center gap-3 text-sm sm:col-span-2">
              <Toggle checked={f.isActive} onChange={(v) => setF({ isActive: v })} label="Activo" /> Cupón activo
            </label>
            <div className="flex justify-end gap-2 sm:col-span-2">
              <Button variant="quiet" onClick={() => setEditing(null)}>Cancelar</Button>
              <Button type="submit" loading={saving}>Guardar</Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
