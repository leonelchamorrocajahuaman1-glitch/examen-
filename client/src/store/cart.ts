import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { BottleShape, Product } from '../lib/types';

/** Copia mínima para pintar el carrito al instante; precios y stock reales los da el servidor (/cart/quote). */
export interface CartSnapshot {
  slug: string;
  name: string;
  brandName: string;
  volumeMl: number;
  finalPriceCents: number;
  accentColor: string;
  bottleShape: BottleShape;
  imageUrl: string | null;
  stock: number;
}

export interface CartItem {
  productId: string;
  quantity: number;
  snapshot: CartSnapshot;
}

interface CartState {
  items: CartItem[];
  couponCode: string;
  drawerOpen: boolean;
  add: (product: Product, quantity?: number) => void;
  setQuantity: (productId: string, quantity: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
  setCoupon: (code: string) => void;
  openDrawer: () => void;
  closeDrawer: () => void;
}

export const MAX_QTY = 24;

export function snapshotOf(p: Product): CartSnapshot {
  return {
    slug: p.slug,
    name: p.name,
    brandName: p.brand.name,
    volumeMl: p.volumeMl,
    finalPriceCents: p.finalPriceCents,
    accentColor: p.accentColor,
    bottleShape: p.bottleShape,
    imageUrl: p.images[0]?.url ?? null,
    stock: p.stock,
  };
}

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      couponCode: '',
      drawerOpen: false,
      add: (product, quantity = 1) =>
        set((s) => {
          const limit = Math.min(MAX_QTY, product.stock);
          const existing = s.items.find((i) => i.productId === product.id);
          if (existing) {
            return {
              items: s.items.map((i) =>
                i.productId === product.id
                  ? { ...i, quantity: Math.min(limit, i.quantity + quantity), snapshot: snapshotOf(product) }
                  : i,
              ),
            };
          }
          return {
            items: [...s.items, { productId: product.id, quantity: Math.min(limit, quantity), snapshot: snapshotOf(product) }],
          };
        }),
      setQuantity: (productId, quantity) =>
        set((s) => ({
          items: s.items.map((i) =>
            i.productId === productId ? { ...i, quantity: Math.max(1, Math.min(MAX_QTY, quantity)) } : i,
          ),
        })),
      remove: (productId) => set((s) => ({ items: s.items.filter((i) => i.productId !== productId) })),
      clear: () => set({ items: [], couponCode: '' }),
      setCoupon: (couponCode) => set({ couponCode: couponCode.trim().toUpperCase() }),
      openDrawer: () => set({ drawerOpen: true }),
      closeDrawer: () => set({ drawerOpen: false }),
    }),
    {
      name: 'nl-cart',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ items: s.items, couponCode: s.couponCode }),
    },
  ),
);

export const cartCount = (items: CartItem[]) => items.reduce((n, i) => n + i.quantity, 0);
