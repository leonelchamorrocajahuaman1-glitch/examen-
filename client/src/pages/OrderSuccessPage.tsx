import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2, FlaskConical, Package } from 'lucide-react';
import { LinkButton } from '../components/ui/Button';
import { PageLoader } from '../components/ui/Spinner';
import { useFetch } from '../hooks/useFetch';
import { useStoreConfig } from '../hooks/useStoreConfig';
import { deliveryLabel, formatPrice, orderNumber, paymentMethodLabel } from '../lib/format';
import type { Order } from '../lib/types';

export default function OrderSuccessPage() {
  const { id } = useParams();
  const { data: order, loading, error } = useFetch<Order>(`/account/orders/${id}`);
  const config = useStoreConfig();
  const transfer = config?.paymentOptions.find((p) => p.id === 'BANK_TRANSFER');

  if (loading) return <PageLoader />;
  if (error || !order) {
    return (
      <div className="container-page py-20">
        <p className="rounded-2xl border border-danger/30 bg-danger/10 p-4 text-sm text-danger">{error?.message ?? 'Pedido no encontrado'}</p>
      </div>
    );
  }

  return (
    <div className="container-page flex justify-center py-14 md:py-20">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="glass relative w-full max-w-2xl overflow-hidden rounded-3xl p-8 text-center md:p-12"
      >
        <div className="absolute -top-28 left-1/2 size-72 -translate-x-1/2 rounded-full bg-success/25 blur-3xl" aria-hidden />
        <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.2, type: 'spring', stiffness: 220, damping: 14 }} className="relative">
          <CheckCircle2 className="mx-auto size-16 text-success" strokeWidth={1.5} />
        </motion.div>
        <p className="eyebrow relative mt-6">Pedido {orderNumber(order.number)}</p>
        <h1 className="relative mt-3 font-display text-3xl font-semibold">¡Gracias, {order.customerName.split(' ')[0]}!</h1>
        <p className="relative mt-3 text-fg-muted">
          Registramos tu pedido. Te enviaremos novedades a <span className="text-fg">{order.customerEmail}</span>.
        </p>

        {order.paymentMethod === 'TEST' && (
          <div className="relative mt-6 flex items-start gap-3 rounded-2xl border border-warning/30 bg-warning/10 p-4 text-left text-sm text-warning">
            <FlaskConical className="mt-0.5 size-4 shrink-0" />
            Este es un pedido de prueba: se aprobó automáticamente y no se realizó ningún cobro.
          </div>
        )}
        {order.paymentMethod === 'BANK_TRANSFER' && transfer?.instructions && (
          <div className="relative mt-6 rounded-2xl border border-cyan/25 bg-cyan/5 p-4 text-left text-sm">
            <p className="font-semibold text-cyan">Realiza tu transferencia</p>
            <p className="mt-1 whitespace-pre-line text-fg-muted">{transfer.instructions}</p>
            <p className="mt-2 text-xs text-fg-subtle">
              Monto: {formatPrice(order.totalCents)} · Referencia: {orderNumber(order.number)}
            </p>
          </div>
        )}

        <dl className="relative mt-8 grid gap-4 rounded-2xl border border-line p-5 text-left text-sm sm:grid-cols-3">
          <div>
            <dt className="text-fg-subtle">Total</dt>
            <dd className="mt-1 font-display text-lg font-semibold text-cyan">{formatPrice(order.totalCents)}</dd>
          </div>
          <div>
            <dt className="text-fg-subtle">Entrega</dt>
            <dd className="mt-1 font-medium">{deliveryLabel[order.deliveryMethod]}</dd>
          </div>
          <div>
            <dt className="text-fg-subtle">Pago</dt>
            <dd className="mt-1 font-medium">{paymentMethodLabel[order.paymentMethod]}</dd>
          </div>
        </dl>

        <div className="relative mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <LinkButton to={`/cuenta/pedidos/${order.id}`} icon={<Package className="size-4" />}>
            Seguir mi pedido
          </LinkButton>
          <LinkButton to="/catalogo" variant="secondary">
            Seguir comprando
          </LinkButton>
        </div>
      </motion.div>
    </div>
  );
}
