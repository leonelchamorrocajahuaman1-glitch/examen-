import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import { AdminHeader, Card, Pagination, Table, td, Toggle } from '../../components/admin/ui';
import { Badge } from '../../components/ui/Badge';
import { Input, Select } from '../../components/ui/Field';
import { Modal } from '../../components/ui/Modal';
import { Spinner } from '../../components/ui/Spinner';
import { useDebounced, useFetch } from '../../hooks/useFetch';
import { api, ApiError, qs } from '../../lib/api';
import { formatDate, formatPrice, orderNumber, statusLabel, statusTone } from '../../lib/format';
import type { Address, Order, Paginated, Role } from '../../lib/types';
import { toast } from '../../store/toast';

interface CustomerRow {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  role: Role;
  isActive: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  orderCount: number;
  totalSpentCents: number;
}

interface CustomerDetail extends Omit<CustomerRow, 'orderCount' | 'totalSpentCents'> {
  birthDate: string;
  documentId: string | null;
  addresses: Address[];
  orders: Order[];
}

export function AdminCustomers() {
  const [search, setSearch] = useState('');
  const q = useDebounced(search.trim(), 300);
  const [role, setRole] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string | null>(null);
  const { data, loading, error, setData } = useFetch<Paginated<CustomerRow>>(`/admin/customers${qs({ search: q, role, page, pageSize: 20 })}`);
  const { data: detail, loading: loadingDetail } = useFetch<CustomerDetail>(selected ? `/admin/customers/${selected}` : null);

  const toggleActive = async (u: CustomerRow, isActive: boolean) => {
    if (!isActive && !window.confirm(`¿Desactivar la cuenta de ${u.email}? Se cerrarán sus sesiones.`)) return;
    try {
      await api(`/admin/customers/${u.id}`, { method: 'PATCH', body: { isActive } });
      setData((d) => (d ? { ...d, items: d.items.map((x) => (x.id === u.id ? { ...x, isActive } : x)) } : d!));
      toast.success(isActive ? 'Cuenta activada' : 'Cuenta desactivada');
    } catch (err) {
      toast.error('No se pudo actualizar', (err as ApiError).message);
    }
  };

  return (
    <div>
      <AdminHeader title="Clientes" description={data ? `${data.total} cuentas` : undefined} />
      <Card padded={false}>
        <div className="grid gap-3 border-b border-line p-4 sm:grid-cols-[1fr_200px]">
          <Input
            placeholder="Buscar por nombre o correo"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            leading={<Search className="size-4" />}
            aria-label="Buscar clientes"
          />
          <Select
            value={role}
            onChange={(e) => {
              setRole(e.target.value);
              setPage(1);
            }}
            aria-label="Rol"
          >
            <option value="">Todos los roles</option>
            <option value="CUSTOMER">Clientes</option>
            <option value="ADMIN">Administradores</option>
          </Select>
        </div>
        {error && <p className="p-4 text-sm text-danger">{error.message}</p>}
        <div className={loading ? 'opacity-60' : ''}>
          <Table head={['Cliente', 'Rol', 'Registro', 'Pedidos', 'Total comprado', 'Activo']}>
            {data?.items.map((u) => (
              <tr key={u.id} className="hover:bg-white/[.02]">
                <td className={td}>
                  <button onClick={() => setSelected(u.id)} className="text-left">
                    <p className="font-medium hover:text-cyan">
                      {u.firstName} {u.lastName}
                    </p>
                    <p className="text-xs text-fg-subtle">{u.email}</p>
                  </button>
                </td>
                <td className={td}>{u.role === 'ADMIN' ? <Badge tone="violet">Admin</Badge> : <Badge>Cliente</Badge>}</td>
                <td className={`${td} text-fg-subtle`}>{formatDate(u.createdAt)}</td>
                <td className={`${td} tabular-nums`}>{u.orderCount}</td>
                <td className={`${td} tabular-nums`}>{formatPrice(u.totalSpentCents)}</td>
                <td className={td}>
                  <Toggle checked={u.isActive} onChange={(v) => toggleActive(u, v)} label={`Cuenta activa: ${u.email}`} />
                </td>
              </tr>
            ))}
          </Table>
          {data && !data.items.length && <p className="p-6 text-center text-sm text-fg-subtle">Sin resultados.</p>}
        </div>
        {data && <Pagination page={data.page} totalPages={data.totalPages} onChange={setPage} />}
      </Card>

      <Modal open={Boolean(selected)} onClose={() => setSelected(null)} title={detail ? `${detail.firstName} ${detail.lastName}` : 'Cliente'} size="lg">
        {loadingDetail || !detail ? (
          <div className="flex justify-center py-10">
            <Spinner className="size-6 text-cyan" />
          </div>
        ) : (
          <div className="space-y-6 text-sm">
            <dl className="grid gap-3 sm:grid-cols-2">
              <div>
                <dt className="text-fg-subtle">Correo</dt>
                <dd>{detail.email}</dd>
              </div>
              <div>
                <dt className="text-fg-subtle">Teléfono</dt>
                <dd>{detail.phone ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-fg-subtle">Fecha de nacimiento</dt>
                <dd>{detail.birthDate.slice(0, 10)}</dd>
              </div>
              <div>
                <dt className="text-fg-subtle">Último acceso</dt>
                <dd>{detail.lastLoginAt ? formatDate(detail.lastLoginAt, true) : '—'}</dd>
              </div>
            </dl>
            {detail.addresses.length > 0 && (
              <div>
                <h3 className="mb-2 font-semibold">Direcciones</h3>
                <ul className="space-y-1 text-fg-muted">
                  {detail.addresses.map((a) => (
                    <li key={a.id}>
                      {a.label}: {a.line1}, {a.district}, {a.city}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div>
              <h3 className="mb-2 font-semibold">Pedidos</h3>
              {detail.orders.length === 0 ? (
                <p className="text-fg-subtle">Sin pedidos.</p>
              ) : (
                <ul className="divide-y divide-line rounded-xl border border-line">
                  {detail.orders.map((o) => (
                    <li key={o.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                      <Link to={`/admin/pedidos/${o.id}`} className="font-medium hover:text-cyan">
                        {orderNumber(o.number)}
                      </Link>
                      <span className="text-fg-subtle">{formatDate(o.createdAt)}</span>
                      <Badge tone={statusTone[o.status]}>{statusLabel[o.status]}</Badge>
                      <span className="tabular-nums">{formatPrice(o.totalCents)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
