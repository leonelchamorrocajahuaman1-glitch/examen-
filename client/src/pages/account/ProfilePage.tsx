import { useState } from 'react';
import { KeyRound, Save } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Field';
import { useAuth } from '../../context/AuthContext';
import { api, ApiError } from '../../lib/api';
import { formatDate } from '../../lib/format';
import type { User } from '../../lib/types';
import { toast } from '../../store/toast';

export function Panel({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="glass rounded-3xl p-6 sm:p-8">
      <h2 className="font-display text-lg font-semibold">{title}</h2>
      {description && <p className="mt-1 text-sm text-fg-muted">{description}</p>}
      <div className="mt-6">{children}</div>
    </section>
  );
}

export function ProfilePage() {
  const { user, setUser } = useAuth();
  const [form, setForm] = useState({
    firstName: user?.firstName ?? '',
    lastName: user?.lastName ?? '',
    phone: user?.phone ?? '',
    documentId: user?.documentId ?? '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const [pw, setPw] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [pwErrors, setPwErrors] = useState<Record<string, string>>({});
  const [pwSaving, setPwSaving] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    try {
      const { user: updated } = await api<{ user: User }>('/account/profile', { method: 'PATCH', body: form });
      setUser(updated);
      toast.success('Datos actualizados');
    } catch (err) {
      const e = err as ApiError;
      setErrors(e.fields ?? {});
      toast.error('No se pudo guardar', e.message);
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw.newPassword !== pw.confirm) return setPwErrors({ confirm: 'Las contraseñas no coinciden' });
    setPwSaving(true);
    setPwErrors({});
    try {
      await api('/account/change-password', {
        method: 'POST',
        body: { currentPassword: pw.currentPassword, newPassword: pw.newPassword },
      });
      setPw({ currentPassword: '', newPassword: '', confirm: '' });
      toast.success('Contraseña actualizada', 'Se cerraron tus otras sesiones abiertas.');
    } catch (err) {
      const e = err as ApiError;
      setPwErrors(e.fields ?? {});
      toast.error('No se pudo cambiar la contraseña', e.message);
    } finally {
      setPwSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Panel title="Datos personales" description={`Cliente desde ${user?.createdAt ? formatDate(user.createdAt) : '—'}`}>
        <form onSubmit={save} className="grid gap-4 sm:grid-cols-2" noValidate>
          <Input label="Nombre" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} error={errors.firstName} />
          <Input label="Apellido" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} error={errors.lastName} />
          <Input label="Correo electrónico" value={user?.email ?? ''} disabled hint="El correo no se puede cambiar" />
          <Input label="Fecha de nacimiento" value={user?.birthDate ?? ''} disabled />
          <Input label="Celular" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} error={errors.phone} optional />
          <Input label="DNI / CE" value={form.documentId} onChange={(e) => setForm({ ...form, documentId: e.target.value })} error={errors.documentId} optional />
          <div className="sm:col-span-2">
            <Button type="submit" loading={saving} icon={<Save className="size-4" />}>
              Guardar cambios
            </Button>
          </div>
        </form>
      </Panel>

      <Panel title="Cambiar contraseña" description="Por seguridad, se cerrarán tus sesiones en otros dispositivos.">
        <form onSubmit={changePassword} className="grid gap-4 sm:grid-cols-3" noValidate>
          <Input label="Contraseña actual" type="password" value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} error={pwErrors.currentPassword} autoComplete="current-password" />
          <Input label="Nueva contraseña" type="password" value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} error={pwErrors.newPassword} autoComplete="new-password" />
          <Input label="Repite la nueva" type="password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} error={pwErrors.confirm} autoComplete="new-password" />
          <div className="sm:col-span-3">
            <Button type="submit" variant="secondary" loading={pwSaving} disabled={!pw.currentPassword || !pw.newPassword} icon={<KeyRound className="size-4" />}>
              Actualizar contraseña
            </Button>
          </div>
        </form>
      </Panel>
    </div>
  );
}
