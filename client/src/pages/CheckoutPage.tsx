import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { AlertTriangle, Banknote, Check, FlaskConical, Landmark, Lock, MapPin, Plus, Store, Truck, Zap } from 'lucide-react';
import { ProductVisual } from '../components/product/ProductVisual';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Checkbox, Input, Textarea } from '../components/ui/Field';
import { PageLoader } from '../components/ui/Spinner';
import { useAuth } from '../context/AuthContext';
import { useFetch } from '../hooks/useFetch';
import { useQuote } from '../hooks/useQuote';
import { useStoreConfig } from '../hooks/useStoreConfig';
import { api, ApiError } from '../lib/api';
import { cn, formatPrice } from '../lib/format';
import type { Address, DeliveryMethod, Order, PaymentMethod } from '../lib/types';
import { useCart } from '../store/cart';
import { toast } from '../store/toast';
import { CouponForm } from './CartPage';

const deliveryIcons: Record<DeliveryMethod, React.ReactNode> = {
  STANDARD: <Truck className="size-5" />,
  EXPRESS: <Zap className="size-5" />,
  PICKUP: <Store className="size-5" />,
};
const paymentIcons: Record<PaymentMethod, React.ReactNode> = {
  CASH_ON_DELIVERY: <Banknote className="size-5" />,
  BANK_TRANSFER: <Landmark className="size-5" />,
  TEST: <FlaskConical className="size-5" />,
};

type AddressForm = Omit<Address, 'id' | 'isDefault' | 'label' | 'line2' | 'reference'> & {
  line2: string;
  reference: string;
};

const emptyAddress: AddressForm = { recipient: '', phone: '', line1: '', line2: '', district: '', city: 'Lima', region: 'Lima', reference: '' };

function Section({ step, title, children }: { step: number; title: string; children: React.ReactNode }) {
  return (
    <section className="glass rounded-3xl p-5 sm:p-7">
      <h2 className="mb-5 flex items-center gap-3 font-display text-lg font-semibold">
        <span className="flex size-7 items-center justify-center rounded-full border border-cyan/40 bg-cyan/10 text-xs text-cyan">{step}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

function OptionCard({
  selected,
  onSelect,
  icon,
  title,
  subtitle,
  aside,
  name,
}: {
  selected: boolean;
  onSelect: () => void;
  icon: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  aside?: React.ReactNode;
  name: string;
}) {
  return (
    <label
      className={cn(
        'flex cursor-pointer items-start gap-4 rounded-2xl border p-4 transition-[border-color,background-color,box-shadow]',
        selected ? 'border-violet/70 bg-violet/10 shadow-glow' : 'border-line hover:border-line-strong',
      )}
    >
      <input type="radio" name={name} checked={selected} onChange={onSelect} className="sr-only" />
      <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-xl', selected ? 'bg-violet text-white' : 'bg-white/5 text-fg-muted')}>
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">{title}</span>
        {subtitle && <span className="mt-0.5 block text-sm text-fg-muted">{subtitle}</span>}
      </span>
      {aside && <span className="shrink-0 text-sm font-semibold">{aside}</span>}
    </label>
  );
}

export default function CheckoutPage() {
  const { user } = useAuth();
  const config = useStoreConfig();
  const items = useCart((s) => s.items);
  const couponCode = useCart((s) => s.couponCode);
  const clear = useCart((s) => s.clear);
  const navigate = useNavigate();

  const [delivery, setDelivery] = useState<DeliveryMethod>('STANDARD');
  const [payment, setPayment] = useState<PaymentMethod | null>(null);
  const { quote, loading: quoting } = useQuote(delivery);
  const { data: addresses, loading: loadingAddresses } = useFetch<Address[]>('/account/addresses');

  const [customer, setCustomer] = useState({
    name: user ? `${user.firstName} ${user.lastName}` : '',
    email: user?.email ?? '',
    phone: user?.phone ?? '',
    document: user?.documentId ?? '',
  });
  const [addressId, setAddressId] = useState<string | 'new'>('new');
  const [address, setAddress] = useState<AddressForm>({ ...emptyAddress, recipient: customer.name, phone: customer.phone });
  const [saveAddress, setSaveAddress] = useState(true);
  const [notes, setNotes] = useState('');
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [placed, setPlaced] = useState(false);

  useEffect(() => {
    if (!addresses?.length) return;
    setAddressId((prev) => (prev === 'new' ? (addresses.find((a) => a.isDefault) ?? addresses[0]).id : prev));
  }, [addresses]);

  useEffect(() => {
    if (config && !payment && config.paymentOptions.length) setPayment(config.paymentOptions[0].id);
  }, [config, payment]);

  const deliveryOption = config?.deliveryOptions.find((d) => d.id === delivery);
  const paymentOption = config?.paymentOptions.find((p) => p.id === payment);
  const needsAddress = deliveryOption?.requiresAddress ?? true;
  const selectedAddress = useMemo(() => addresses?.find((a) => a.id === addressId), [addresses, addressId]);

  if (!items.length && !placed) return <Navigate to="/carrito" replace />;
  if (!config) return <PageLoader />;

  const setField = <K extends keyof AddressForm>(k: K, v: string) => setAddress((a) => ({ ...a, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payment) return toast.error('Selecciona un método de pago');
    setSubmitting(true);
    setErrors({});
    try {
      let shipping: Record<string, string | undefined> | undefined;
      if (needsAddress) {
        if (addressId !== 'new' && selectedAddress) {
          const { recipient, phone, line1, line2, district, city, region, reference } = selectedAddress;
          shipping = { recipient, phone, line1, line2: line2 ?? undefined, district, city, region, reference: reference ?? undefined };
        } else {
          shipping = { ...address, line2: address.line2 || undefined, reference: address.reference || undefined };
          if (saveAddress) {
            await api('/account/addresses', {
              method: 'POST',
              body: { label: 'Mi dirección', ...address, isDefault: !addresses?.length },
            }).catch(() => undefined);
          }
        }
      }

      const order = await api<Order>('/account/orders', {
        method: 'POST',
        body: {
          items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
          couponCode: couponCode || undefined,
          deliveryMethod: delivery,
          paymentMethod: payment,
          customer: { ...customer, document: customer.document || undefined },
          address: shipping,
          notes: notes || undefined,
          ageConfirmed,
        },
      });
      setPlaced(true);
      clear();
      navigate(`/pedido/${order.id}/confirmacion`, { replace: true });
    } catch (err) {
      const e = err as ApiError;
      if (e.fields) setErrors(e.fields);
      toast.error('No pudimos registrar tu pedido', e.message);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSubmitting(false);
    }
  };

  const err = (k: string) => errors[k];

  return (
    <form onSubmit={submit} className="container-page py-10 md:py-14" noValidate>
      <p className="eyebrow mb-3">Checkout</p>
      <h1 className="mb-8 font-display text-3xl font-semibold md:text-4xl">Finalizar compra</h1>

      {config.paymentsTestMode && (
        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-warning/30 bg-warning/10 p-4 text-sm text-warning">
          <FlaskConical className="mt-0.5 size-4 shrink-0" />
          <p>
            <strong>Tienda en modo de prueba.</strong> El método “Pago de prueba” no realiza cobros reales. No hay pasarela de pagos con
            tarjeta configurada y nunca se solicitan ni almacenan datos de tarjetas.
          </p>
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-[1fr_400px]">
        <div className="space-y-6">
          <Section step={1} title="Datos del cliente">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Nombre completo" value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} error={err('customer.name')} autoComplete="name" required />
              <Input label="Correo electrónico" type="email" value={customer.email} onChange={(e) => setCustomer({ ...customer, email: e.target.value })} error={err('customer.email')} autoComplete="email" required />
              <Input label="Teléfono / celular" type="tel" value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} error={err('customer.phone')} autoComplete="tel" placeholder="9XX XXX XXX" required />
              <Input label="DNI / CE" value={customer.document} onChange={(e) => setCustomer({ ...customer, document: e.target.value })} error={err('customer.document')} optional hint="Para tu comprobante" />
            </div>
          </Section>

          <Section step={2} title="Entrega">
            <div className="grid gap-3">
              {config.deliveryOptions.map((d) => {
                const free = d.priceCents === 0 || (d.freeOverCents !== null && quote && quote.subtotalCents - quote.discountCents >= d.freeOverCents);
                return (
                  <OptionCard
                    key={d.id}
                    name="delivery"
                    selected={delivery === d.id}
                    onSelect={() => setDelivery(d.id)}
                    icon={deliveryIcons[d.id]}
                    title={d.name}
                    subtitle={`${d.description} · ${d.eta}`}
                    aside={free ? <span className="text-success">Gratis</span> : formatPrice(d.priceCents)}
                  />
                );
              })}
            </div>

            {needsAddress && (
              <div className="mt-6">
                <h3 className="mb-3 text-sm font-semibold text-fg-muted">Dirección de entrega</h3>
                {loadingAddresses ? (
                  <div className="skeleton h-20" />
                ) : (
                  <div className="grid gap-3">
                    {addresses?.map((a) => (
                      <OptionCard
                        key={a.id}
                        name="address"
                        selected={addressId === a.id}
                        onSelect={() => setAddressId(a.id)}
                        icon={<MapPin className="size-5" />}
                        title={
                          <>
                            {a.label} {a.isDefault && <Badge tone="info" className="ml-1">Principal</Badge>}
                          </>
                        }
                        subtitle={`${a.line1}${a.line2 ? `, ${a.line2}` : ''} · ${a.district}, ${a.city} · ${a.recipient}`}
                      />
                    ))}
                    {!!addresses?.length && (
                      <OptionCard name="address" selected={addressId === 'new'} onSelect={() => setAddressId('new')} icon={<Plus className="size-5" />} title="Usar otra dirección" />
                    )}
                  </div>
                )}
                {addressId === 'new' && !loadingAddresses && (
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <Input label="¿Quién recibe?" value={address.recipient} onChange={(e) => setField('recipient', e.target.value)} error={err('address.recipient') ?? err('address')} required />
                    <Input label="Teléfono de contacto" type="tel" value={address.phone} onChange={(e) => setField('phone', e.target.value)} error={err('address.phone')} required />
                    <Input label="Dirección" value={address.line1} onChange={(e) => setField('line1', e.target.value)} error={err('address.line1')} placeholder="Av. / Calle y número" wrapperClassName="sm:col-span-2" autoComplete="address-line1" required />
                    <Input label="Dpto. / Interior" value={address.line2} onChange={(e) => setField('line2', e.target.value)} optional />
                    <Input label="Distrito" value={address.district} onChange={(e) => setField('district', e.target.value)} error={err('address.district')} required />
                    <Input label="Ciudad" value={address.city} onChange={(e) => setField('city', e.target.value)} error={err('address.city')} required />
                    <Input label="Región" value={address.region} onChange={(e) => setField('region', e.target.value)} error={err('address.region')} required />
                    <Input label="Referencia" value={address.reference} onChange={(e) => setField('reference', e.target.value)} optional wrapperClassName="sm:col-span-2" placeholder="Frente al parque, edificio azul…" />
                    <Checkbox label="Guardar esta dirección en mi cuenta" checked={saveAddress} onChange={(e) => setSaveAddress(e.target.checked)} className="sm:col-span-2" />
                  </div>
                )}
              </div>
            )}
          </Section>

          <Section step={3} title="Método de pago">
            {config.paymentOptions.length === 0 ? (
              <p className="rounded-2xl border border-danger/30 bg-danger/10 p-4 text-sm text-danger">
                No hay métodos de pago habilitados. El administrador debe configurarlos en el servidor.
              </p>
            ) : (
              <div className="grid gap-3">
                {config.paymentOptions.map((p) => (
                  <OptionCard
                    key={p.id}
                    name="payment"
                    selected={payment === p.id}
                    onSelect={() => setPayment(p.id)}
                    icon={paymentIcons[p.id]}
                    title={
                      <>
                        {p.name} {p.isTest && <Badge tone="warning" className="ml-1">MODO DE PRUEBA</Badge>}
                      </>
                    }
                    subtitle={p.description}
                  />
                ))}
              </div>
            )}
            {paymentOption?.instructions && (
              <div className="mt-4 rounded-2xl border border-cyan/25 bg-cyan/5 p-4 text-sm">
                <p className="font-semibold text-cyan">Datos para el pago</p>
                <p className="mt-1 whitespace-pre-line text-fg-muted">{paymentOption.instructions}</p>
                <p className="mt-2 text-xs text-fg-subtle">Envía el comprobante indicando tu número de pedido. Confirmaremos el pedido tras verificar el pago.</p>
              </div>
            )}
          </Section>

          <Section step={4} title="Confirmación">
            <Textarea label="Notas para la entrega" value={notes} onChange={(e) => setNotes(e.target.value)} optional maxLength={500} placeholder="Horario preferido, indicaciones para el repartidor…" />
            <div className="mt-5 space-y-3">
              <Checkbox
                checked={ageConfirmed}
                onChange={(e) => setAgeConfirmed(e.target.checked)}
                error={err('ageConfirmed')}
                label={
                  <>
                    Declaro ser mayor de {config.legalAge} años y acepto los{' '}
                    <Link to="/legal/terminos" className="text-cyan hover:underline" target="_blank">
                      términos y condiciones
                    </Link>
                    . Se podrá solicitar un documento de identidad al entregar el pedido.
                  </>
                }
              />
            </div>
          </Section>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="glass space-y-5 rounded-3xl p-6">
            <h2 className="font-display text-lg font-semibold">Tu pedido</h2>
            <ul className="max-h-72 space-y-3 overflow-y-auto pr-1">
              {items.map((item) => {
                const line = quote?.lines.find((l) => l.productId === item.productId);
                return (
                  <li key={item.productId} className="flex items-center gap-3">
                    <div className="relative flex h-14 w-10 shrink-0 items-center justify-center">
                      <ProductVisual
                        name={item.snapshot.name}
                        brand={item.snapshot.brandName}
                        shape={item.snapshot.bottleShape}
                        color={item.snapshot.accentColor}
                        imageUrl={item.snapshot.imageUrl}
                        className="h-14 w-auto"
                        imgClassName="h-14 w-10"
                      />
                      <span className="absolute -top-1 -right-1 flex size-5 items-center justify-center rounded-full bg-violet text-[10px] font-bold text-white">
                        {item.quantity}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{item.snapshot.name}</p>
                      {line?.issue ? <p className="text-xs text-warning">{line.issue}</p> : <p className="text-xs text-fg-subtle">{item.snapshot.brandName}</p>}
                    </div>
                    <span className="text-sm font-semibold tabular-nums">{formatPrice(line?.lineTotalCents ?? item.snapshot.finalPriceCents * item.quantity)}</span>
                  </li>
                );
              })}
            </ul>
            <CouponForm quote={quote} />
            <dl className={cn('space-y-3 border-t border-line pt-5 text-sm transition-opacity', quoting && 'opacity-60')}>
              <div className="flex justify-between">
                <dt className="text-fg-muted">Subtotal</dt>
                <dd className="tabular-nums">{quote ? formatPrice(quote.subtotalCents) : '—'}</dd>
              </div>
              {!!quote?.discountCents && (
                <div className="flex justify-between text-success">
                  <dt>Descuento {quote.coupon.code && `(${quote.coupon.code})`}</dt>
                  <dd className="tabular-nums">−{formatPrice(quote.discountCents)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-fg-muted">Envío · {deliveryOption?.name}</dt>
                <dd className="tabular-nums">{quote ? (quote.shippingCents ? formatPrice(quote.shippingCents) : 'Gratis') : '—'}</dd>
              </div>
              <div className="flex items-baseline justify-between border-t border-line pt-4">
                <dt className="font-semibold">Total</dt>
                <dd className="font-display text-2xl font-semibold text-cyan tabular-nums">{quote ? formatPrice(quote.totalCents) : '—'}</dd>
              </div>
            </dl>

            {quote?.hasIssues && (
              <p className="flex items-start gap-2 rounded-xl bg-warning/10 p-3 text-xs text-warning">
                <AlertTriangle className="size-4 shrink-0" /> Hay productos sin stock suficiente.{' '}
                <Link to="/carrito" className="font-semibold underline">
                  Revisar carrito
                </Link>
              </p>
            )}

            <Button
              type="submit"
              size="lg"
              className="w-full"
              loading={submitting}
              disabled={!quote || quote.hasIssues || !payment || !ageConfirmed}
              icon={<Check className="size-4" />}
            >
              {paymentOption?.isTest ? 'Confirmar pedido de prueba' : 'Confirmar pedido'}
            </Button>
            {!ageConfirmed && <p className="text-center text-xs text-fg-subtle">Confirma tu mayoría de edad para continuar.</p>}
            <p className="flex items-center justify-center gap-2 text-xs text-fg-subtle">
              <Lock className="size-3.5" /> Conexión protegida · No almacenamos datos de tarjetas
            </p>
          </div>
        </aside>
      </div>
    </form>
  );
}
