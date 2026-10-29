import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api } from '../lib/api';
import type { User } from '../lib/types';
import { toast } from '../store/toast';

export interface RegisterInput {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone?: string;
  birthDate: string;
  acceptTerms: boolean;
}

interface AuthState {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (input: RegisterInput) => Promise<User>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  setUser: (u: User) => void;
  favoriteIds: Set<string>;
  toggleFavorite: (productId: string) => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());

  const refresh = useCallback(async () => {
    try {
      const { user } = await api<{ user: User | null }>('/auth/me');
      setUser(user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!user || user.role !== 'CUSTOMER') {
      setFavoriteIds(new Set());
      return;
    }
    api<string[]>('/account/favorites/ids')
      .then((ids) => setFavoriteIds(new Set(ids)))
      .catch(() => undefined);
  }, [user]);

  const login = useCallback(async (email: string, password: string) => {
    const { user } = await api<{ user: User }>('/auth/login', { method: 'POST', body: { email, password } });
    setUser(user);
    return user;
  }, []);

  const register = useCallback(async (input: RegisterInput) => {
    const { user } = await api<{ user: User }>('/auth/register', { method: 'POST', body: input });
    setUser(user);
    return user;
  }, []);

  const logout = useCallback(async () => {
    await api('/auth/logout', { method: 'POST' }).catch(() => undefined);
    setUser(null);
  }, []);

  const toggleFavorite = useCallback(
    async (productId: string) => {
      if (!user) {
        toast.info('Inicia sesión para guardar favoritos');
        return;
      }
      const isFav = favoriteIds.has(productId);
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        if (isFav) next.delete(productId);
        else next.add(productId);
        return next;
      });
      try {
        await api(`/account/favorites/${productId}`, { method: isFav ? 'DELETE' : 'POST' });
      } catch (e) {
        setFavoriteIds((prev) => {
          const next = new Set(prev);
          if (isFav) next.add(productId);
          else next.delete(productId);
          return next;
        });
        toast.error('No se pudo actualizar favoritos', (e as Error).message);
      }
    },
    [user, favoriteIds],
  );

  const value = useMemo(
    () => ({ user, loading, login, register, logout, refresh, setUser, favoriteIds, toggleFavorite }),
    [user, loading, login, register, logout, refresh, favoriteIds, toggleFavorite],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
