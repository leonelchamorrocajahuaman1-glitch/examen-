import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ShoppingBag, Trash2, X } from 'lucide-react';
import { useQuote } from '../../hooks/useQuote';
import { useStoreConfig } from '../../hooks/useStoreConfig';
import { formatPrice, formatVolume } from '../../lib/format';
import { cartCount, MAX_QTY, useCart } from '../../store/cart';
import { buttonClass } from '../ui/Button';
import { QuantityStepper } from '../ui/misc';
import { ProductVisual } from '../product/ProductVisual';

export function CartDrawer() {
  const { items, drawerOpen, closeDrawer, setQuantity, remove } = useCart();
  const { quote, loading } = useQuote(undefined, drawerOpen);
  const config = useStoreConfig();
  const location = useLocation();

  useEffect(() => {
    closeDrawer();
  }, [location.pathname, closeDrawer]);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeDrawer();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [drawerOpen, closeDrawer]);

  const subtotal = quote?.subtotalCents ?? items.reduce((s, i) => s + i.snapshot.finalPriceCents * i.quantity, 0);
  const threshold = config?.freeShippingThresholdCents ?? null;
  const progress = threshold ? Math.min(1, subtotal / threshold) : 0;

  return createPortal(
    <AnimatePresence>
      {drawerOpen && (
        <motion.div className="fixed inset-0 z-[75]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeDrawer} />
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
            className="glass-strong absolute inset-y-0 right-0 flex w-full max-w-md flex-col border-l border-line"
            role="dialog"
            aria-label="Carrito de compras"
          >
            <header className="flex items-center justify-between border-b border-line px-5 py-4">
              <h2 className="font-display text-lg font-semibold">
                Tu carrito <span className="text-fg-subtle">({cartCount(items)})</span>
              </h2>
              <button onClick={closeDrawer} className="rounded-lg p-2 text-fg-subtle hover:bg-white/5 hover:text-fg" aria-label="Cerrar carrito">
                <X className="size-5" />
              </button>
            </header>

            {items.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
                <div className="flex size-16 items-center justify-center rounded-2xl bg-white/5">
                  <ShoppingBag className="size-7 text-fg-subtle" />
                </div>
                <p className="text-fg-muted">Tu carrito está vacío.</p>
                <Link to="/catalogo" className={buttonClass('primary')} onClick={closeDrawer}>
                  Explorar catálogo
                </Link>
              </div>
            ) : (
              <>
                {threshold && (
                  <div className="border-b border-line px-5 py-3">
                    <p className="text-xs text-fg-muted">
                      {progress >= 1 ? (
                        <span className="text-success">¡Tienes delivery estándar gratis!</span>
                      ) : (
                        <>
                          Te faltan <span className="font-semibold text-cyan">{formatPrice(threshold - subtotal)}</span> para el delivery
                          estándar gratis
                        </>
                      )}
                    </p>
                    <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/8">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-violet to-cyan transition-[width] duration-500"
                        style={{ width: `${progress * 100}%` }}
                      />
                    </div>
                  </div>
                )}
                <ul className="flex-1 divide-y divide-line overflow-y-auto px-5">
                  {items.map((item) => {
                    const line = quote?.lines.find((l) => l.productId === item.productId);
                    const max = Math.max(1, Math.min(MAX_QTY, line?.maxQuantity ?? item.snapshot.stock));
                    return (
                      <li key={item.productId} className="flex gap-4 py-4">
                        <Link
                          to={`/producto/${item.snapshot.slug}`}
                          className="flex h-24 w-16 shrink-0 items-center justify-center rounded-xl bg-white/[.03]"
                        >
                          <ProductVisual
                            name={item.snapshot.name}
                            brand={item.snapshot.brandName}
                            shape={item.snapshot.bottleShape}
                            color={item.snapshot.accentColor}
                            imageUrl={item.snapshot.imageUrl}
                            className="h-20 w-auto"
                            imgClassName="h-20 w-14"
                          />
                        </Link>
                        <div className="flex min-w-0 flex-1 flex-col">
                          <p className="text-xs text-fg-subtle">{item.snapshot.brandName}</p>
                          <Link to={`/producto/${item.snapshot.slug}`} className="truncate text-sm font-semibold hover:text-cyan">
                            {item.snapshot.name}
                          </Link>
                          <p className="text-xs text-fg-subtle">{formatVolume(item.snapshot.volumeMl)}</p>
                          {line?.issue && <p className="mt-1 text-xs font-medium text-warning">{line.issue}</p>}
                          <div className="mt-auto flex items-center justify-between pt-2">
                            <QuantityStepper size="sm" value={item.quantity} max={max} onChange={(n) => setQuantity(item.productId, n)} />
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold tabular-nums">
                                {formatPrice((line?.unitPriceCents ?? item.snapshot.finalPriceCents) * item.quantity)}
                              </span>
                              <button
                                onClick={() => remove(item.productId)}
                                className="rounded-lg p-1.5 text-fg-subtle hover:bg-danger/10 hover:text-danger"
                                aria-label={`Quitar ${item.snapshot.name}`}
                              >
                                <Trash2 className="size-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
                <footer className="space-y-3 border-t border-line p-5">
                  <div className="flex items-center justify-between">
                    <span className="text-fg-muted">Subtotal</span>
                    <span className={`font-display text-lg font-semibold tabular-nums ${loading ? 'opacity-60' : ''}`}>
                      {formatPrice(subtotal)}
                    </span>
                  </div>
                  <p className="text-xs text-fg-subtle">Envío y descuentos se calculan en el siguiente paso.</p>
                  <div className="grid grid-cols-2 gap-2">
                    <Link to="/carrito" className={buttonClass('secondary', 'md')}>
                      Ver carrito
                    </Link>
                    <Link
                      to="/checkout"
                      className={buttonClass('primary', 'md', quote?.hasIssues ? 'pointer-events-none opacity-40' : '')}
                      aria-disabled={quote?.hasIssues}
                    >
                      Finalizar compra
                    </Link>
                  </div>
                </footer>
              </>
            )}
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
