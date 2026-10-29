import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ChevronRight, FlaskConical, Package, XCircle } from 'lucide-react';
import { useState } from 'react';
import { ProductVisual } from '../../components/product/ProductVisual';
import { Badge } from '../../components/ui/Badge';
import { Button, LinkButton } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/misc';
import { PageLoader } from '../../components/ui/Spinner';
import { useFetch } from '../../hooks/useFetch';
import { api, ApiError } from '../../lib/api';
import {
  cn,
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
import type { Order, OrderStatus } from '../../lib/types';
import { toast } from '../../store/toast';

const FLOW: OrderStatus[] = ['PENDING', 'CONFIRMED', 'PREPARING', 'SHIPPED', 'DELIVERED'];

export function OrderTimeline({ order }: { order: Order }) {
  const cancelled = order.status === 'CANCELLED';
  const current = FLOW.indexOf(order.status);
  return (
    <ol className="grid grid-cols-5 gap-2" aria-label="Estado del pedido">
      {FLOW.map((s, i) => {
        const done = !cancelled && i <= current;
        return (
          <li key={s} className="flex flex-col gap-2">
            <span
              className={cn(
                'h-1.5 rounded-full transition-colors',
                done ? 'bg-gradient-to-r from-violet to-cyan shadow-[0_0_12px_rgba(34,211,238,.5)]' : 'bg-white/8',
              )}
            />
            <span className={cn('text-[11px] leading-tight sm:text-xs', done ? 'text-fg' : 'text-fg-subtle')}>
              {s === 'SHIPPED' && order.deliveryMethod === 'PICKUP' ? 'Listo para recojo' : statusLabel[s]}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export function OrdersPage() {
  const { data, loading, error } = useFetch<(Order & { items: { productName: string; quantity: number }[] })[]>('/account/orders');
  if (loading) return <PageLoader />;
  if (error) return <p className="text-sm text-danger">{error.message}</p>;
  if (!data?.length) {
    return (
      <EmptyState
        icon={<Package className="size-6" />}
        title="Aún no tienes pedidos"
        description="Cuando compres, aquí podrás seguir el estado de tus pedidos."
        action={<LinkButton to="/catalogo">Ir al catálogo</LinkButton>}
      />
    );
  }
  return (
    <ul className="space-y-3">
      {data.map((o) => (
        <li key={o.id}>
          <Link to={`/cuenta/pedidos/${o.id}`} className="glass glow-border group flex flex-col gap-4 rounded-2xl p-5 sm:flex-row sm:items-center">
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-display font-semibold">{orderNumber(o.number)}</span>
                <Badge tone={statusTone[o.status]}>{statusLabel[o.status]}</Badge>
                {o.paymentMethod === 'TEST' && <Badge tone="warning">Prueba</Badge>}
              </div>
              <p className="mt-1 text-sm text-fg-subtle">
                {formatDate(o.createdAt, true)} · {o.items.reduce((n, i) => n + i.quantity, 0)} productos
              </p>
              <p className="mt-1 line-clamp-1 text-sm text-fg-muted">{o.items.map((i) => i.productName).join(', ')}</p>
            </div>
            <div className="flex items-center justify-between gap-4 sm:justify-end">
              <span className="font-display text-lg font-semibold text-cyan">{formatPrice(o.totalCents)}</span>
              <ChevronRight className="size-5 text-fg-subtle transition-transform group-hover:translate-x-0.5" />
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function OrderDetailPage() {
  const { id } = useParams();
  const { data: order, loading, error, setData } = useFetch<Order>(`/account/orders/${id}`);
  const [cancelling, setCancelling] = useState(false);

  if (loading) return <PageLoader />;
  if (error || !order) return <p className="text-sm text-danger">{error?.message ?? 'Pedido no encontrado'}</p>;

  const cancel = async () => {
    if (!window.confirm('¿Seguro que quieres cancelar este pedido?')) return;
    setCancelling(true);
    try {
      const updated = await api<Order>(`/account/orders/${order.id}/cancel`, { method: 'POST' });
      setData(updated);
      toast.success('Pedido cancelado');
    } catch (err) {
      toast.error('No se pudo cancelar', (err as ApiError).message);
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="space-y-6">
      <Link to="/cuenta/pedidos" className="inline-flex items-center gap-2 text-sm text-fg-muted hover:text-fg">
        <ArrowLeft className="size-4" /> Mis pedidos
      </Link>

      <section className="glass rounded-3xl p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-semibold">{orderNumber(order.number)}</h2>
            <p className="mt-1 text-sm text-fg-subtle">Realizado el {formatDate(order.createdAt, true)}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge tone={statusTone[order.status]}>{statusLabel[order.status]}</Badge>
            <Badge tone={order.paymentStatus === 'PAID' ? 'success' : order.paymentStatus === 'TEST_APPROVED' ? 'warning' : 'neutral'}>
              Pago: {paymentStatusLabel[order.paymentStatus]}
            </Badge>
          </div>
        </div>

        <div className="mt-8">
          {order.status === 'CANCELLED' ? (
            <p className="flex items-center gap-2 rounded-xl border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
              <XCircle className="size-4" /> Este pedido fue cancelado.
            </p>
          ) : (
            <OrderTimeline order={order} />
          )}
        </div>

        {order.paymentMethod === 'TEST' && (
          <p className="mt-6 flex items-center gap-2 text-sm text-warning">
            <FlaskConical className="size-4" /> Pedido de prueba: no se realizó ningún cobro.
          </p>
        )}

        {order.status === 'PENDING' && (
          <Button variant="danger" size="sm" className="mt-6" onClick={cancel} loading={cancelling}>
            Cancelar pedido
          </Button>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <section className="glass rounded-3xl p-6">
          <h3 className="font-display font-semibold">Productos</h3>
          <ul className="mt-4 divide-y divide-line">
            {order.items.map((item) => (
              <li key={item.id} className="flex items-center gap-4 py-3">
                <div className="flex h-16 w-12 shrink-0 items-center justify-center">
                  {item.product ? (
                    <ProductVisual
                      name={item.productName}
                      brand={item.brandName}
                      shape={item.product.bottleShape}
                      color={item.product.accentColor}
                      imageUrl={item.product.images[0]?.url}
                      className="h-16 w-auto"
                      imgClassName="h-16 w-12"
                    />
                  ) : (
                    <Package className="size-6 text-fg-subtle" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  {item.product ? (
                    <Link to={`/producto/${item.product.slug}`} className="font-medium hover:text-cyan">
                      {item.productName}
                    </Link>
                  ) : (
                    <p className="font-medium">{item.productName}</p>
                  )}
                  <p className="text-xs text-fg-subtle">
                    {item.brandName} · {formatVolume(item.volumeMl)} · {item.quantity} × {formatPrice(item.unitPriceCents)}
                  </p>
                </div>
                <span className="font-semibold tabular-nums">{formatPrice(item.lineTotalCents)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-4 space-y-2 border-t border-line pt-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-fg-muted">Subtotal</dt>
              <dd>{formatPrice(order.subtotalCents)}</dd>
            </div>
            {order.discountCents > 0 && (
              <div className="flex justify-between text-success">
                <dt>Descuento {order.couponCode && `(${order.couponCode})`}</dt>
                <dd>−{formatPrice(order.discountCents)}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-fg-muted">Envío</dt>
              <dd>{order.shippingCents ? formatPrice(order.shippingCents) : 'Gratis'}</dd>
            </div>
            <div className="flex justify-between pt-2 font-display text-lg font-semibold">
              <dt>Total</dt>
              <dd className="text-cyan">{formatPrice(order.totalCents)}</dd>
            </div>
          </dl>
        </section>

        <aside className="space-y-6">
          <section className="glass rounded-3xl p-6 text-sm">
            <h3 className="font-display font-semibold">Entrega</h3>
            <p className="mt-3 font-medium">{deliveryLabel[order.deliveryMethod]}</p>
            {order.shipLine1 ? (
              <p className="mt-1 text-fg-muted">
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
              <p className="mt-1 text-fg-muted">Recoge tu pedido en tienda presentando tu DNI.</p>
            )}
          </section>
          <section className="glass rounded-3xl p-6 text-sm">
            <h3 className="font-display font-semibold">Pago</h3>
            <p className="mt-3 text-fg-muted">{paymentMethodLabel[order.paymentMethod]}</p>
          </section>
          {order.events && order.events.length > 0 && (
            <section className="glass rounded-3xl p-6 text-sm">
              <h3 className="font-display font-semibold">Historial</h3>
              <ol className="mt-4 space-y-4 border-l border-line pl-4">
                {order.events.map((ev) => (
                  <li key={ev.id} className="relative">
                    <span className="absolute top-1.5 -left-[21px] size-2.5 rounded-full border-2 border-ink-950 bg-cyan" />
                    <p className="font-medium">{statusLabel[ev.status]}</p>
                    {ev.note && <p className="text-fg-muted">{ev.note}</p>}
                    <p className="text-xs text-fg-subtle">{formatDate(ev.createdAt, true)}</p>
                  </li>
                ))}
              </ol>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
