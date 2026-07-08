// Sevimlilar — savat kabi localStorage'da (mehmon ham ishlatadi, login shart emas).
// Minimal snapshot saqlaymiz: kabinetdagi mini-kartani ko'rsatishga yetadi, narx havola
// ortidagi jonli narxdan farq qilishi mumkin (bu — yorliq, batafsili mahsulot sahifasida).
export interface FavoriteItem {
  productId: string;
  name: string;
  image: string;
  priceUzs: number;
}

export const FAVORITES_KEY = 'product-favorites-v1';

export function isFavorite(items: FavoriteItem[], productId: string): boolean {
  return items.some((x) => x.productId === productId);
}

/** Bosilganda: bor bo'lsa olib tashlaydi, yo'q bo'lsa boshiga qo'shadi. */
export function toggleFavorite(items: FavoriteItem[], item: FavoriteItem): FavoriteItem[] {
  return isFavorite(items, item.productId)
    ? items.filter((x) => x.productId !== item.productId)
    : [item, ...items];
}

export function removeFavorite(items: FavoriteItem[], productId: string): FavoriteItem[] {
  return items.filter((x) => x.productId !== productId);
}

export function serializeFavorites(items: FavoriteItem[]): string {
  return JSON.stringify(items);
}

/** Buzuq/eski localStorage qiymatiga bardoshli. */
export function parseFavorites(raw: string | null): FavoriteItem[] {
  if (!raw) return [];
  try {
    const data: unknown = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    return data.filter(
      (x): x is FavoriteItem =>
        typeof x === 'object' && x !== null &&
        typeof (x as FavoriteItem).productId === 'string' &&
        typeof (x as FavoriteItem).name === 'string' &&
        typeof (x as FavoriteItem).image === 'string' &&
        typeof (x as FavoriteItem).priceUzs === 'number',
    );
  } catch {
    return [];
  }
}
