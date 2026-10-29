import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, FlaskConical, Search } from 'lucide-react';
import { AdminHeader, Card, Pagination, Table, td } from '../../components/admin/ui';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input, Select, Textarea } from '../../components/ui/Field';
import { PageLoader } from '../../components/ui/Spinner';
import { useDebounced, useFetch } from '../../hooks/useFetch';
import { api, ApiError, qs } from '../../lib/api';
import {
  deliveryLabel,
  formatDate,
  formatPrice,
  formatVolume,
  orderNumber,
  paymentMethodLabel,
  paymentStatusLabel,
  statusLabel,
  statusTone,
} from '../../lib/format';
import type { Order, OrderStatus, Paginated, PaymentStatus } from '../../lib/types';
import { toast } from '../../store/toast';

type AdminOrderRow = Order & { _count: { items: number } };
type AdminOrderDetail = Order & {
  allowedTransitions: OrderStatus[];
  user: { id: string; email: string; firstName: string; lastName: string; phone: string | null };
};

const statuses: OrderStatus[] = ['PENDING', 'CONFIRMED', 'PREPARING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];

const paymentTone = (s: PaymentStatus) =>
  s === 'PAID' ? 'success' : s === 'TEST_APPROVED' ? 'warning' : s === 'FAILED' ? 'danger' : s === 'REFUNDED' ? 'violet' : 'neutral';

export function AdminOrders() {
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState(params.get('q') ?? '');
  const q = useDebounced(search.trim(), 300);
  const status = params.get('estado') ?? '';
  const payment = params.get('pago') ?? '';
  const page = Number(params.get('pagina')) || 1;

  const { data, loading, error } = useFetch<Paginated<AdminOrderRow>>(
    `/admin/orders${qs({ search: q, status, payment, page, pageSize: 20 })}`,
  );

  const set = (k: string, v: string) => {
    const next = new URLSearchParams(params);
    if (v) next.set(k, v);
    else next.delete(k);
    if (k !== 'pagina') next.delete('pagina');
    setParams(next, { replace: true });
  };

  return (
    <div>
      <AdminHeader title="Pedidos" description={data ? `${data.total} pedidos` : undefined} />
      <Card padded={false}>
        <div className="grid gap-3 border-b border-line p-4 sm:grid-cols-[1fr_200px_200px]">
          <Input placeholder="Buscar por número, cliente o correo" value={search} onChange={(e) => setSearch(e.target.value)} leading={<Search className="size-4" />} aria-label="Buscar pedidos" />
          <Select value={status} onChange={(e) => set('estado', e.target.value)} aria-label="Filtrar por estado">
            <option value="">Todos los estados</option>
            {statuses.map((s) => (
              <option key={s} value={s}>
                {statusLabel[s]}
              </option>
            ))}
          </Select>
          <Select value={payment} onChange={(e) => set('pago', e.target.value)} aria-label="Filtrar por pago">
            <option value="">Todos los pagos</option>
            {(['CASH_ON_DELIVERY', 'BANK_TRANSFER', 'TEST'] as const).map((p) => (
              <option key={p} value={p}>
                {paymentMethodLabel[p]}
              </option>
            ))}
          </Select>
        </div>
        {error && <p className="p-4 text-sm text-danger">{error.message}</p>}
        <div className={loading ? 'opacity-60' : ''}>
          <Table head={['Pedido', 'Cliente', 'Fecha', 'Entrega', 'Pago', 'Estado', 'Total']}>
            {data?.items.map((o) => (
              <tr key={o.id} className="hover:bg-white/[.02]">
                <td className={td}>
                  <Link to={`/admin/pedidos/${o.id}`} className="font-semibold hover:text-cyan">
                    {orderNumber(o.number)}
                  </Link>
                  <p className="text-xs text-fg-subtle">{o._count.items} productos</p>
                </td>
                <td className={td}>
                  <p>{o.customerName}</p>
                  <p className="text-xs text-fg-subtle">{o.customerEmail}</p>
                </td>
                <td className={`${td} whitespace-nowrap text-fg-subtle`}>{formatDate(o.createdAt, true)}</td>
                <td className={`${td} whitespace-nowrap`}>{deliveryLabel[o.deliveryMethod]}</td>
                <td className={td}>
                  <p className="whitespace-nowrap">{paymentMethodLabel[o.paymentMethod]}</p>
                  <Badge tone={paymentTone(o.paymentStatus)} className="mt-1">
                    {paymentStatusLabel[o.paymentStatus]}
                  </Badge>
                </td>
                <td className={td}>
                  <Badge tone={statusTone[o.status]}>{statusLabel[o.status]}</Badge>
                </td>
                <td className={`${td} font-semibold whitespace-nowrap tabular-nums`}>{formatPrice(o.totalCents)}</td>
              </tr>
            ))}
          </Table>
          {data && !data.items.length && <p className="p-6 text-center text-sm text-fg-subtle">No hay pedidos con estos filtros.</p>}
        </div>
        {data && <Pagination page={data.page} totalPages={data.totalPages} onChange={(p) => set('pagina', String(p))} />}
      </Card>
    </div>
  );
}

export function AdminOrderDetail() {
  const { id } = useParams();
  const { data: order, loading, error, setData } = useFetch<AdminOrderDetail>(`/admin/orders/${id}`);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  if (loading && !order) return <PageLoader />;
  if (error || !order) return <p className="text-sm text-danger">{error?.message ?? 'Pedido no encontrado'}</p>;

  const changeStatus = async (status: OrderStatus) => {
    if (status === 'CANCELLED' && !window.confirm('¿Cancelar el pedido? El stock volverá al inventario.')) return;
    setBusy(status);
    try {
      const updated = await api<AdminOrderDetail>(`/admin/orders/${order.id}/status`, {
        method: 'PATCH',
        body: { status, note: note || undefined },
      });
      setData({ ...order, ...updated });
      setNote('');
      toast.success(`Pedido ${statusLabel[status].toLowerCase()}`);
    } catch (err) {
      toast.error('No se pudo actualizar', (err as ApiError).message);
    } finally {
      setBusy(null);
    }
  };

  const changePayment = async (paymentStatus: PaymentStatus) => {
    setBusy(paymentStatus);
    try {
      const updated = await api<AdminOrderDetail>(`/admin/orders/${order.id}/payment`, { method: 'PATCH', body: { paymentStatus } });
      setData({ ...order, ...updated });
      toast.success('Pago actualizado');
    } catch (err) {
      toast.error('No se pudo actualizar', (err as ApiError).message);
    } finally {
      setBusy(null);
    }
  };

  const isTest = order.paymentMethod === 'TEST';

  return (
    <div>
      <Link to="/admin/pedidos" className="mb-4 inline-flex items-center gap-2 text-sm text-fg-muted hover:text-fg">
        <ArrowLeft className="size-4" /> Pedidos
      </Link>
      <AdminHeader
        title={orderNumber(order.number)}
        description={`Creado el ${formatDate(order.createdAt, true)}`}
        actions={
          <>
            <Badge tone={statusTone[order.status]}>{statusLabel[order.status]}</Badge>
            <Badge tone={paymentTone(order.paymentStatus)}>Pago: {paymentStatusLabel[order.paymentStatus]}</Badge>
          </>
        }
      />

      {isTest && (
        <p className="mb-6 flex items-center gap-2 rounded-2xl border border-warning/30 bg-warning/10 p-4 text-sm text-warning">
          <FlaskConical className="size-4" /> Pedido de PRUEBA: no hubo cobro. No se incluye en las ventas del resumen.
        </p>
      )}

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <Card title="Productos" padded={false}>
            <Table head={['Producto', 'Precio', 'Cant.', 'Total']}>
              {order.items.map((it) => (
                <tr key={it.id}>
                  <td className={td}>
                    <p className="font-medium">{it.productName}</p>
                    <p className="text-xs text-fg-subtle">
                      {it.brandName} · {formatVolume(it.volumeMl)}
                    </p>
                  </td>
                  <td className={`${td} tabular-nums`}>{formatPrice(it.unitPriceCents)}</td>
                  <td className={`${td} tabular-nums`}>{it.quantity}</td>
                  <td className={`${td} font-semibold tabular-nums`}>{formatPrice(it.lineTotalCents)}</td>
                </tr>
              ))}
            </Table>
            <dl className="space-y-1.5 border-t border-line p-5 text-sm">
              <div className="flex justify-between">
                <dt className="text-fg-muted">Subtotal</dt>
                <dd>{formatPrice(order.subtotalCents)}</dd>
              </div>
              {order.discountCents > 0 && (
                <div className="flex justify-between text-success">
                  <dt>Descuento ({order.couponCode})</dt>
                  <dd>−{formatPrice(order.discountCents)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-fg-muted">Envío ({deliveryLabel[order.deliveryMethod]})</dt>
                <dd>{order.shippingCents ? formatPrice(order.shippingCents) : 'Gratis'}</dd>
              </div>
              <div className="flex justify-between pt-1 text-base font-semibold">
                <dt>Total</dt>
                <dd className="text-cyan">{formatPrice(order.totalCents)}</dd>
              </div>
            </dl>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            <Card title="Cliente">
              <p className="font-medium">{order.customerName}</p>
              <p className="text-sm text-fg-muted">{order.customerEmail}</p>
              <p className="text-sm text-fg-muted">{order.customerPhone}</p>
              {order.customerDocument && <p className="text-sm text-fg-muted">Doc.: {order.customerDocument}</p>}
              <p className="mt-3 text-xs text-fg-subtle">
                Cuenta: {order.user.firstName} {order.user.lastName} ({order.user.email})
              </p>
            </Card>
            <Card title="Entrega">
              <p className="font-medium">{deliveryLabel[order.deliveryMethod]}</p>
              {order.shipLine1 ? (
                <p className="mt-1 text-sm text-fg-muted">
                  {order.shipRecipient} · {order.shipPhone}
                  <br />
                  {order.shipLine1}
                  {order.shipLine2 && `, ${order.shipLine2}`}
                  <br />
                  {order.shipDistrict}, {order.shipCity}, {order.shipRegion}
                  {order.shipReference && (
                    <>
                      <br />
                      Ref.: {order.shipReference}
                    </>
                  )}
                </p>
              ) : (
                <p className="mt-1 text-sm text-fg-muted">Recojo en tienda</p>
              )}
              {order.notes && <p className="mt-3 rounded-xl bg-white/[.03] p-3 text-sm text-fg-muted">“{order.notes}”</p>}
            </Card>
          </div>
        </div>

        <div className="space-y-6">
          <Card title="Actualizar estado">
            {order.allowedTransitions.length === 0 ? (
              <p className="text-sm text-fg-subtle">El pedido está {statusLabel[order.status].toLowerCase()}; no admite más cambios.</p>
            ) : (
              <div className="space-y-3">
                <Textarea label="Nota (visible para el cliente)" value={note} onChange={(e) => setNote(e.target.value)} optional maxLength={300} className="min-h-16" />
                <div className="flex flex-wrap gap-2">
                  {order.allowedTransitions.map((s) => (
                    <Button
                      key={s}
                      size="sm"
                      variant={s === 'CANCELLED' ? 'danger' : 'primary'}
                      loading={busy === s}
                      disabled={Boolean(busy)}
                      onClick={() => changeStatus(s)}
                    >
                      {s === 'CANCELLED' ? 'Cancelar pedido' : `Marcar: ${statusLabel[s]}`}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </Card>

          <Card title="Pago">
            <p className="text-sm">{paymentMethodLabel[order.paymentMethod]}</p>
            {isTest ? (
              <p className="mt-2 text-xs text-fg-subtle">Los pedidos de prueba no admiten cambios de pago.</p>
            ) : (
              <div className="mt-3 flex flex-wrap gap-2">
                {(['PAID', 'PENDING', 'FAILED', 'REFUNDED'] as const)
                  .filter((s) => s !== order.paymentStatus)
                  .map((s) => (
                    <Button key={s} size="sm" variant="secondary" loading={busy === s} disabled={Boolean(busy)} onClick={() => changePayment(s)}>
                      {paymentStatusLabel[s]}
                    </Button>
                  ))}
              </div>
            )}
          </Card>

          <Card title="Historial">
            <ol className="space-y-4 border-l border-line pl-4 text-sm">
              {order.events?.map((ev) => (
                <li key={ev.id} className="relative">
                  <span className="absolute top-1.5 -left-[21px] size-2.5 rounded-full border-2 border-ink-900 bg-cyan" />
                  <p className="font-medium">{statusLabel[ev.status]}</p>
                  {ev.note && <p className="text-fg-muted">{ev.note}</p>}
                  <p className="text-xs text-fg-subtle">{formatDate(ev.createdAt, true)}</p>
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </div>
    </div>
  );
}
