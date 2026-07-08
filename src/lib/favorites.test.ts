import { describe, it, expect } from 'vitest';
import { toggleFavorite, removeFavorite, isFavorite, parseFavorites, serializeFavorites, type FavoriteItem } from './favorites';

const a: FavoriteItem = { productId: 'a', name: 'A', image: '/a.webp', priceUzs: 100 };
const b: FavoriteItem = { productId: 'b', name: 'B', image: '/b.webp', priceUzs: 200 };

describe('favorites', () => {
  it('toggle qo\'shadi va boshiga qo\'yadi', () => {
    const one = toggleFavorite([], a);
    expect(one).toEqual([a]);
    expect(toggleFavorite(one, b)).toEqual([b, a]);
  });
  it('toggle borini olib tashlaydi', () => {
    expect(toggleFavorite([a, b], a)).toEqual([b]);
  });
  it('isFavorite to\'g\'ri aniqlaydi', () => {
    expect(isFavorite([a], 'a')).toBe(true);
    expect(isFavorite([a], 'b')).toBe(false);
  });
  it('removeFavorite id bo\'yicha o\'chiradi', () => {
    expect(removeFavorite([a, b], 'a')).toEqual([b]);
  });
  it('parse buzuq qiymatga bardosh beradi', () => {
    expect(parseFavorites(null)).toEqual([]);
    expect(parseFavorites('not json')).toEqual([]);
    expect(parseFavorites('{"x":1}')).toEqual([]);
    expect(parseFavorites(JSON.stringify([a, { productId: 5 }]))).toEqual([a]);
  });
  it('serialize → parse aylanadi', () => {
    expect(parseFavorites(serializeFavorites([a, b]))).toEqual([a, b]);
  });
});
