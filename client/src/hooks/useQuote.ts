import { useEffect, useMemo, useState } from 'react';
import { api, ApiError } from '../lib/api';
import type { DeliveryMethod, Quote } from '../lib/types';
import { useCart } from '../store/cart';
import { useDebounced } from './useFetch';

/** Pide al servidor el cálculo real del carrito (precios, stock, cupón y envío). */
export function useQuote(deliveryMethod?: DeliveryMethod, enabled = true) {
  const items = useCart((s) => s.items);
  const couponCode = useCart((s) => s.couponCode);
  const payload = useMemo(
    () => ({
      items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
      couponCode: couponCode || undefined,
      deliveryMethod,
    }),
    [items, couponCode, deliveryMethod],
  );
  const debounced = useDebounced(payload, 200);

  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  useEffect(() => {
    if (!enabled) return;
    if (!debounced.items.length) {
      setQuote(null);
      setLoading(false);
      return;
    }
    let alive = true;
    setLoading(true);
    api<Quote>('/cart/quote', { method: 'POST', body: debounced })
      .then((q) => {
        if (!alive) return;
        setQuote(q);
        setError(null);
      })
      .catch((e) => alive && setError(e))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [debounced, enabled]);

  return { quote, loading: loading || payload !== debounced, error };
}
