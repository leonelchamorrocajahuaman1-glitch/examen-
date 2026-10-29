import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { StoreConfig } from '../lib/types';

let cache: StoreConfig | null = null;
let pending: Promise<StoreConfig> | null = null;

export function loadStoreConfig() {
  if (cache) return Promise.resolve(cache);
  pending ??= api<StoreConfig>('/store/config').then((c) => {
    cache = c;
    return c;
  });
  pending.catch(() => {
    pending = null;
  });
  return pending;
}

export function useStoreConfig() {
  const [config, setConfig] = useState<StoreConfig | null>(cache);
  useEffect(() => {
    if (cache) return;
    let alive = true;
    loadStoreConfig()
      .then((c) => alive && setConfig(c))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);
  return config;
}
