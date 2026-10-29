import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight, FlaskConical, ShoppingCart, Timer, Users } from 'lucide-react';
import { Card, StatTile, Table, td } from '../../components/admin/ui';
import { Badge } from '../../components/ui/Badge';
import { PageLoader } from '../../components/ui/Spinner';
import { useFetch } from '../../hooks/useFetch';
import { formatDate, formatPrice, orderNumber, statusLabel, statusTone } from '../../lib/format';
import type { OrderStatus, PaymentMethod, PaymentStatus } from '../../lib/types';

interface Dashboard {
  revenueCents: number;
  salesCount: number;
  ordersToday: number;
  pendingOrders: number;
  customers: number;
  testOrders: number;
  ordersByStatus: Partial<Record<OrderStatus, number>>;
  lowStock: { id: string; name: string; stock: number; brand: { name: string } }[];
  lowStockThreshold: number;
  topProducts: { id: string; name: string; soldCount: number; brand: { name: string } }[];
  recentOrders: {
    id: string;
    number: number;
    customerName: string;
    totalCents: number;
    status: OrderStatus;
    paymentMethod: PaymentMethod;
    paymentStatus: PaymentStatus;
    createdAt: string;
  }[];
  salesByDay: { date: string; totalCents: number; orders: number }[];
}

const compactSoles = (cents: number) => {
  const v = cents / 100;
  if (v >= 1000) return `S/ ${(v / 1000).toLocaleString('es-PE', { maximumFractionDigits: 1 })}K`;
  return `S/ ${Math.round(v)}`;
};

const dayLabel = (iso: string) =>
  new Intl.DateTimeFormat('es-PE', { day: '2-digit', month: 'short', timeZone: 'UTC' }).format(new Date(`${iso}T12:00:00Z`));

/** Columnas de ventas diarias: una sola serie (sin leyenda), tooltip por columna y tabla accesible. */
function SalesChart({ data }: { data: Dashboard['salesByDay'] }) {
  const [hover, setHover] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);

  const W = 720;
  const H = 240;
  const pad = { top: 16, right: 8, bottom: 28, left: 56 };
  const innerW = W - pad.left - pad.right;
  const innerH = H - pad.top - pad.bottom;

  const { ticks, max } = useMemo(() => {
    const peak = Math.max(...data.map((d) => d.totalCents), 0);
    if (peak === 0) return { ticks: [0], max: 1 };
    const raw = peak / 4;
    const mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw;
    const top = Math.ceil(peak / step) * step;
    return { ticks: Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step), max: top };
  }, [data]);

  const band = innerW / data.length;
  const barW = Math.min(24, band - 2);
  const y = (v: number) => pad.top + innerH - (v / max) * innerH;
  const empty = data.every((d) => d.totalCents === 0);
  const h = hover !== null ? data[hover] : null;

  return (
    <div>
      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Ventas por día, últimos 14 días">
          {ticks.map((t) => (
            <g key={t}>
              <line x1={pad.left} x2={W - pad.right} y1={y(t)} y2={y(t)} stroke="rgb(255 255 255 / .07)" strokeWidth="1" />
              <text x={pad.left - 10} y={y(t)} dy="0.32em" textAnchor="end" className="fill-fg-subtle text-[11px]">
                {compactSoles(t)}
              </text>
            </g>
          ))}
          {data.map((d, i) => {
            const x = pad.left + i * band + (band - barW) / 2;
            const top = y(d.totalCents);
            const hgt = pad.top + innerH - top;
            const r = Math.min(4, hgt);
            return (
              <g key={d.date}>
                {hgt > 0 && (
                  <path
                    d={`M${x},${pad.top + innerH} V${top + r} Q${x},${top} ${x + r},${top} H${x + barW - r} Q${x + barW},${top} ${x + barW},${top + r} V${pad.top + innerH} Z`}
                    fill="#22d3ee"
                    opacity={hover === null || hover === i ? 1 : 0.45}
                  />
                )}
                {(data.length - 1 - i) % 2 === 0 && (
                  <text x={pad.left + i * band + band / 2} y={H - 8} textAnchor="middle" className="fill-fg-subtle text-[11px]">
                    {dayLabel(d.date)}
                  </text>
                )}
                {/* Zona de hover más grande que la barra */}
                <rect
                  x={pad.left + i * band}
                  y={pad.top}
                  width={band}
                  height={innerH}
                  fill="transparent"
                  onMouseEnter={() => setHover(i)}
                  onMouseLeave={() => setHover(null)}
                  onFocus={() => setHover(i)}
                  onBlur={() => setHover(null)}
                  tabIndex={0}
                  aria-label={`${dayLabel(d.date)}: ${formatPrice(d.totalCents)}, ${d.orders} pedidos`}
                />
              </g>
            );
          })}
          <line x1={pad.left} x2={W - pad.right} y1={pad.top + innerH} y2={pad.top + innerH} stroke="rgb(255 255 255 / .16)" strokeWidth="1" />
        </svg>
        {h && hover !== null && (
          <div
            className="pointer-events-none absolute top-2 z-10 rounded-xl border border-line bg-ink-800 px-3 py-2 text-xs whitespace-nowrap shadow-card"
            style={{
              left: `${((pad.left + hover * band + band / 2) / W) * 100}%`,
              // En los extremos el tooltip se alinea hacia dentro para no salirse del gráfico.
              transform: `translateX(${hover > data.length * 0.75 ? '-100%' : hover < data.length * 0.25 ? '0%' : '-50%'})`,
            }}
          >
            <p className="font-semibold text-fg">{dayLabel(h.date)}</p>
            <p className="text-fg-muted">
              {formatPrice(h.totalCents)} · {h.orders} {h.orders === 1 ? 'pedido' : 'pedidos'}
            </p>
          </div>
        )}
        {empty && (
          <p className="absolute inset-0 flex items-center justify-center text-sm text-fg-subtle">Aún no hay ventas reales en este periodo.</p>
        )}
      </div>
      <button onClick={() => setShowTable((v) => !v)} className="mt-2 text-xs font-medium text-fg-muted hover:text-fg">
        {showTable ? 'Ocultar tabla' : 'Ver como tabla'}
      </button>
      {showTable && (
        <table className="mt-2 w-full text-xs">
          <thead>
            <tr className="text-fg-subtle">
              <th className="py-1 text-left font-medium">Día</th>
              <th className="py-1 text-right font-medium">Pedidos</th>
              <th className="py-1 text-right font-medium">Ventas</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.date} className="border-t border-line">
                <td className="py-1">{dayLabel(d.date)}</td>
                <td className="py-1 text-right tabular-nums">{d.orders}</td>
                <td className="py-1 text-right tabular-nums">{formatPrice(d.totalCents)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

const statusOrder: OrderStatus[] = ['PENDING', 'CONFIRMED', 'PREPARING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];

export function AdminDashboard() {
  const { data, loading, error } = useFetch<Dashboard>('/admin/dashboard');
  if (loading && !data) return <PageLoader />;
  if (error || !data) return <p className="text-sm text-danger">{error?.message}</p>;

  const totalOrders = Object.values(data.ordersByStatus).reduce((a, b) => a + (b ?? 0), 0);
  const maxStatus = Math.max(1, ...Object.values(data.ordersByStatus).map((v) => v ?? 0));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Resumen</h1>
        <p className="mt-1 text-sm text-fg-muted">Datos en tiempo real desde la base de datos.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr_1fr]">
        <div className="relative overflow-hidden rounded-2xl border border-line bg-ink-900/70 p-6 lg:row-span-2">
          <div className="absolute -top-20 -right-16 size-56 rounded-full bg-violet/20 blur-3xl" aria-hidden />
          <p className="relative text-sm text-fg-muted">Ventas acumuladas</p>
          <p className="relative mt-3 text-5xl font-semibold tracking-tight tabular-nums">{formatPrice(data.revenueCents)}</p>
          <p className="relative mt-2 text-sm text-fg-subtle">
            {data.salesCount} pedidos · excluye cancelados y pedidos de prueba
          </p>
        </div>
        <StatTile label="Pedidos hoy" value={data.ordersToday} icon={<ShoppingCart className="size-4" />} />
        <StatTile label="Por confirmar" value={data.pendingOrders} icon={<Timer className="size-4" />} hint="Estado: recibido" />
        <StatTile label="Clientes registrados" value={data.customers} icon={<Users className="size-4" />} />
        <StatTile label="Pedidos de prueba" value={data.testOrders} icon={<FlaskConical className="size-4" />} hint="Sin cobro real" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <Card title="Ventas por día · últimos 14 días">
          <SalesChart data={data.salesByDay} />
        </Card>
        <Card title="Pedidos por estado">
          {totalOrders === 0 ? (
            <p className="text-sm text-fg-subtle">Todavía no hay pedidos.</p>
          ) : (
            <ul className="space-y-3">
              {statusOrder.map((s) => {
                const n = data.ordersByStatus[s] ?? 0;
                return (
                  <li key={s}>
                    <div className="flex items-center justify-between text-sm">
                      <Badge tone={statusTone[s]}>{statusLabel[s]}</Badge>
                      <span className="tabular-nums text-fg-muted">{n}</span>
                    </div>
                    <div className="mt-1.5 h-1.5 rounded-full bg-white/5">
                      <div className="h-full rounded-full bg-violet-glow" style={{ width: `${(n / maxStatus) * 100}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <Card
          title="Pedidos recientes"
          padded={false}
          actions={
            <Link to="/admin/pedidos" className="flex items-center gap-1 text-xs font-semibold text-cyan hover:underline">
              Ver todos <ArrowRight className="size-3.5" />
            </Link>
          }
        >
          <Table head={['Pedido', 'Cliente', 'Fecha', 'Estado', 'Total']}>
            {data.recentOrders.map((o) => (
              <tr key={o.id} className="hover:bg-white/[.02]">
                <td className={td}>
                  <Link to={`/admin/pedidos/${o.id}`} className="font-semibold hover:text-cyan">
                    {orderNumber(o.number)}
                  </Link>
                  {o.paymentMethod === 'TEST' && <Badge tone="warning" className="ml-2">Prueba</Badge>}
                </td>
                <td className={td}>{o.customerName}</td>
                <td className={`${td} text-fg-subtle`}>{formatDate(o.createdAt, true)}</td>
                <td className={td}>
                  <Badge tone={statusTone[o.status]}>{statusLabel[o.status]}</Badge>
                </td>
                <td className={`${td} font-semibold tabular-nums`}>{formatPrice(o.totalCents)}</td>
              </tr>
            ))}
          </Table>
          {!data.recentOrders.length && <p className="p-5 text-sm text-fg-subtle">Sin pedidos todavía.</p>}
        </Card>

        <div className="space-y-6">
          <Card title={`Stock bajo (≤ ${data.lowStockThreshold})`}>
            {data.lowStock.length === 0 ? (
              <p className="text-sm text-fg-subtle">Todo el inventario está por encima del mínimo.</p>
            ) : (
              <ul className="space-y-2.5">
                {data.lowStock.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 text-sm">
                    <Link to={`/admin/productos/${p.id}`} className="min-w-0 truncate hover:text-cyan">
                      {p.name}
                    </Link>
                    <span className={`flex shrink-0 items-center gap-1 text-xs font-semibold ${p.stock === 0 ? 'text-danger' : 'text-warning'}`}>
                      <AlertTriangle className="size-3.5" /> {p.stock === 0 ? 'Agotado' : `${p.stock} uds.`}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card title="Más vendidos">
            {data.topProducts.length === 0 ? (
              <p className="text-sm text-fg-subtle">Aún no hay ventas registradas.</p>
            ) : (
              <ol className="space-y-2.5">
                {data.topProducts.map((p, i) => (
                  <li key={p.id} className="flex items-center gap-3 text-sm">
                    <span className="w-4 text-fg-subtle tabular-nums">{i + 1}</span>
                    <span className="min-w-0 flex-1 truncate">{p.name}</span>
                    <span className="text-fg-muted tabular-nums">{p.soldCount} uds.</span>
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
