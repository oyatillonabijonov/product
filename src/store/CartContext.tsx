import { createContext, useContext, useEffect, useState } from 'react';
import type { FC, ReactNode } from 'react';
import { addItem, removeItem, setQty, cartCount, parseCart, serializeCart, CART_KEY, type CartItem } from '../lib/cart';

interface CartApi {
  items: CartItem[];
  count: number;
  add(item: CartItem): void;
  remove(productId: string, variantId: string | null): void;
  changeQty(productId: string, variantId: string | null, qty: number): void;
  clear(): void;
}

const CartCtx = createContext<CartApi | null>(null);

export function useCart(): CartApi {
  const ctx = useContext(CartCtx);
  if (!ctx) throw new Error('useCart must be used inside CartProvider');
  return ctx;
}

export const CartProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      setItems(parseCart(window.localStorage.getItem(CART_KEY)));
    } catch {
      /* localStorage unavailable (private mode/quota) */
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      window.localStorage.setItem(CART_KEY, serializeCart(items));
    } catch {
      /* localStorage unavailable (private mode/quota) */
    }
  }, [items, loaded]);

  const api: CartApi = {
    items,
    count: cartCount(items),
    add: (item) => setItems((xs) => addItem(xs, item)),
    remove: (productId, variantId) => setItems((xs) => removeItem(xs, productId, variantId)),
    changeQty: (productId, variantId, qty) => setItems((xs) => setQty(xs, productId, variantId, qty)),
    clear: () => setItems([]),
  };

  return <CartCtx.Provider value={api}>{children}</CartCtx.Provider>;
};
