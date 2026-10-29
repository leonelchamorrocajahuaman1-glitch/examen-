import { useCallback, useEffect, useRef, useState } from 'react';
import { api, ApiError } from '../lib/api';

interface State<T> {
  data: T | null;
  error: ApiError | null;
  loading: boolean;
}

/** GET con estado de carga/error. `path = null` desactiva la petición. */
export function useFetch<T>(path: string | null) {
  const [state, setState] = useState<State<T>>({ data: null, error: null, loading: Boolean(path) });
  const [nonce, setNonce] = useState(0);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!path) {
      setState({ data: null, error: null, loading: false });
      return;
    }
    const controller = new AbortController();
    setState((s) => ({ ...s, loading: true, error: null }));
    api<T>(path, { signal: controller.signal })
      .then((data) => setState({ data, error: null, loading: false }))
      .catch((error) => {
        if (error.name === 'AbortError') return;
        setState((s) => ({ data: s.data, error, loading: false }));
      });
    return () => controller.abort();
  }, [path, nonce]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  const setData = useCallback((updater: T | ((prev: T | null) => T)) => {
    setState((s) => ({
      ...s,
      data: typeof updater === 'function' ? (updater as (p: T | null) => T)(s.data) : updater,
    }));
  }, []);

  return { ...state, reload, setData };
}

export function useDebounced<T>(value: T, delay = 250) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}
