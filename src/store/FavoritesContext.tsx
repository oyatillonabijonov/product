import { createContext, useContext, useEffect, useState } from 'react';
import type { FC, ReactNode } from 'react';
import { toggleFavorite, removeFavorite, isFavorite, parseFavorites, serializeFavorites, FAVORITES_KEY, type FavoriteItem } from '../lib/favorites';

interface FavoritesApi {
  items: FavoriteItem[];
  count: number;
  isFavorite(productId: string): boolean;
  toggle(item: FavoriteItem): void;
  remove(productId: string): void;
}

const FavoritesCtx = createContext<FavoritesApi | null>(null);

export function useFavorites(): FavoritesApi {
  const ctx = useContext(FavoritesCtx);
  if (!ctx) throw new Error('useFavorites must be used inside FavoritesProvider');
  return ctx;
}

// CartProvider bilan bir xil SSR-xavfsiz naqsh: dastlab [], localStorage faqat effektlarda.
export const FavoritesProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<FavoriteItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      setItems(parseFavorites(window.localStorage.getItem(FAVORITES_KEY)));
    } catch {
      /* localStorage unavailable (private mode/quota) */
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      window.localStorage.setItem(FAVORITES_KEY, serializeFavorites(items));
    } catch {
      /* localStorage unavailable (private mode/quota) */
    }
  }, [items, loaded]);

  const api: FavoritesApi = {
    items,
    count: items.length,
    isFavorite: (productId) => isFavorite(items, productId),
    toggle: (item) => setItems((xs) => toggleFavorite(xs, item)),
    remove: (productId) => setItems((xs) => removeFavorite(xs, productId)),
  };

  return <FavoritesCtx.Provider value={api}>{children}</FavoritesCtx.Provider>;
};
