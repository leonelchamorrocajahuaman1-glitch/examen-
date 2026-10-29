import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight, ShieldCheck, ShoppingBag, Tag, Trash2, X } from 'lucide-react';
import { ProductVisual } from '../components/product/ProductVisual';
import { Button, LinkButton } from '../components/ui/Button';
import { Input } from '../components/ui/Field';
import { EmptyState, QuantityStepper } from '../components/ui/misc';
import { useQuote } from '../hooks/useQuote';
import { useStoreConfig } from '../hooks/useStoreConfig';
import { cn, formatPrice, formatVolume } from '../lib/format';
import type { Quote } from '../lib/types';
import { cartCount, MAX_QTY, useCart } from '../store/cart';

export function CouponForm({ quote }: { quote: Quote | null }) {
  const couponCode = useCart((s) => s.couponCode);
  const setCoupon = useCart((s) => s.setCoupon);
  const [value, setValue] = useState(couponCode);

  if (couponCode && quote?.coupon.valid) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl border border-success/30 bg-success/10 px-3.5 py-2.5">
        <div className="flex min-w-0 items-center gap-2 text-sm">
          <Tag className="size-4 shrink-0 text-success" />
          <span className="font-semibold text-success">{couponCode}</span>
          <span className="truncate text-fg-muted">{quote.coupon.message}</span>
        </div>
        <button
          onClick={() => {
            setCoupon('');
            setValue('');
          }}
          className="rounded-lg p-1 text-fg-subtle hover:text-fg"
          aria-label="Quitar cupón"
        >
          <X className="size-4" />
        </button>
      </div>
    );
  }

  // No es un <form>: el cupón también vive dentro del formulario del checkout.
  return (
    <div className="flex items-start gap-2">
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value.toUpperCase())}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            setCoupon(value);
          }
        }}
        placeholder="Código de cupón"
        aria-label="Código de cupón"
        leading={<Tag className="size-4" />}
        wrapperClassName="flex-1"
        error={couponCode && quote && !quote.coupon.valid ? (quote.coupon.message ?? 'Cupón inválido') : undefined}
        maxLength={30}
      />
      <Button variant="secondary" disabled={!value.trim()} onClick={() => setCoupon(value)}>
        Aplicar
      </Button>
    </div>
  );
}

export default function CartPage() {
  const { items, setQuantity, remove, clear } = useCart();
  const { quote, loading, error } = useQuote();
  const config = useStoreConfig();

  if (!items.length) {
    return (
      <div className="container-page py-16">
        <h1 className="mb-8 font-display text-3xl font-semibold md:text-4xl">Tu carrito</h1>
        <EmptyState
          icon={<ShoppingBag className="size-6" />}
          title="Tu carrito está vacío"
          description="Explora el catálogo y añade tus botellas favoritas."
          action={<LinkButton to="/catalogo">Explorar catálogo</LinkButton>}
        />
      </div>
    );
  }

  return (
    <div className="container-page py-10 md:py-14">
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <p className="eyebrow mb-3">Carrito</p>
          <h1 className="font-display text-3xl font-semibold md:text-4xl">
            Tu carrito <span className="text-fg-subtle">({cartCount(items)})</span>
          </h1>
        </div>
        <button onClick={clear} className="text-sm text-fg-subtle hover:text-danger">
          Vaciar carrito
        </button>
      </div>

      {quote?.hasIssues && (
        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-warning/30 bg-warning/10 p-4 text-sm text-warning">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <p>Algunos productos cambiaron de disponibilidad. Ajusta las cantidades marcadas para continuar con la compra.</p>
        </div>
      )}
      {error && <p className="mb-6 rounded-2xl border border-danger/30 bg-danger/10 p-4 text-sm text-danger">{error.message}</p>}

      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
        <ul className="glass divide-y divide-line rounded-3xl">
          {items.map((item) => {
            const line = quote?.lines.find((l) => l.productId === item.productId);
            const unit = line?.unitPriceCents ?? item.snapshot.finalPriceCents;
            const max = Math.max(1, Math.min(MAX_QTY, line?.maxQuantity ?? item.snapshot.stock));
            return (
              <li key={item.productId} className={cn('flex gap-4 p-4 sm:gap-6 sm:p-6', line && !line.available && 'bg-warning/[.04]')}>
                <Link
                  to={`/producto/${item.snapshot.slug}`}
                  className="relative flex h-28 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white/[.03] sm:h-32 sm:w-24"
                >
                  <div className="absolute inset-4 rounded-full opacity-40 blur-2xl" style={{ background: item.snapshot.accentColor }} />
                  <ProductVisual
                    name={item.snapshot.name}
                    brand={item.snapshot.brandName}
                    shape={item.snapshot.bottleShape}
                    color={item.snapshot.accentColor}
                    imageUrl={item.snapshot.imageUrl}
                    className="relative h-24 w-auto sm:h-28"
                    imgClassName="relative size-full p-2"
                  />
                </Link>
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold tracking-[0.14em] text-fg-subtle uppercase">{item.snapshot.brandName}</p>
                      <Link to={`/producto/${item.snapshot.slug}`} className="mt-0.5 block font-semibold hover:text-cyan">
                        {item.snapshot.name}
                      </Link>
                      <p className="mt-0.5 text-sm text-fg-subtle">
                        {formatVolume(item.snapshot.volumeMl)} · {formatPrice(unit)} c/u
                      </p>
                    </div>
                    <button
                      onClick={() => remove(item.productId)}
                      className="rounded-lg p-2 text-fg-subtle hover:bg-danger/10 hover:text-danger"
                      aria-label={`Quitar ${item.snapshot.name}`}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                  {line?.issue && (
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-warning">
                      <AlertTriangle className="size-4" /> {line.issue}
                      {line.maxQuantity > 0 && line.quantity > line.maxQuantity && (
                        <button
                          onClick={() => setQuantity(item.productId, line.maxQuantity)}
                          className="font-semibold underline underline-offset-2"
                        >
                          Ajustar a {line.maxQuantity}
                        </button>
                      )}
                      {line.maxQuantity === 0 && (
                        <button onClick={() => remove(item.productId)} className="font-semibold underline underline-offset-2">
                          Quitar
                        </button>
                      )}
                    </div>
                  )}
                  <div className="mt-auto flex items-center justify-between gap-3 pt-3">
                    <QuantityStepper value={item.quantity} max={max} onChange={(n) => setQuantity(item.productId, n)} />
                    <span className="font-display text-lg font-semibold tabular-nums">{formatPrice(unit * item.quantity)}</span>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="glass space-y-5 rounded-3xl p-6">
            <h2 className="font-display text-lg font-semibold">Resumen</h2>
            <CouponForm quote={quote} />
            <dl className={cn('space-y-3 text-sm transition-opacity', loading && 'opacity-60')}>
              <div className="flex justify-between">
                <dt className="text-fg-muted">Subtotal</dt>
                <dd className="font-semibold tabular-nums">{quote ? formatPrice(quote.subtotalCents) : '—'}</dd>
              </div>
              {quote && quote.discountCents > 0 && (
                <div className="flex justify-between text-success">
                  <dt>Descuento</dt>
                  <dd className="font-semibold tabular-nums">−{formatPrice(quote.discountCents)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-fg-muted">Envío</dt>
                <dd className="text-fg-subtle">Se calcula en el checkout</dd>
              </div>
              <div className="flex items-baseline justify-between border-t border-line pt-4">
                <dt className="font-semibold">Total parcial</dt>
                <dd className="font-display text-2xl font-semibold text-cyan tabular-nums">
                  {quote ? formatPrice(quote.subtotalCents - quote.discountCents) : '—'}
                </dd>
              </div>
            </dl>
            {config?.freeShippingThresholdCents && quote && (
              <p className="text-xs text-fg-subtle">
                {quote.subtotalCents - quote.discountCents >= config.freeShippingThresholdCents
                  ? 'Tu pedido tiene delivery estándar gratis.'
                  : `Delivery estándar gratis desde ${formatPrice(config.freeShippingThresholdCents)}.`}
              </p>
            )}
            <LinkButton
              to="/checkout"
              size="lg"
              className={cn('w-full', (quote?.hasIssues || !quote) && 'pointer-events-none opacity-40')}
              aria-disabled={quote?.hasIssues || !quote}
              icon={<ArrowRight className="size-4" />}
            >
              Continuar con la compra
            </LinkButton>
            <p className="flex items-center justify-center gap-2 text-xs text-fg-subtle">
              <ShieldCheck className="size-3.5 text-success" /> Precios y stock verificados por el servidor
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
