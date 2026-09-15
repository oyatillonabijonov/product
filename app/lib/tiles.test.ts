import { describe, it, expect } from 'vitest';
import { categoryTiles } from './tiles';

describe('categoryTiles', () => {
  it("yo'nalishning hamma turi registr tartibida, har biri o'z ikonkasi bilan", () => {
    const tiles = categoryTiles('video', 'uz');
    expect(tiles.map((t) => t.id)).toEqual([
      'kamera', 'action-kamera', 'obyektiv', 'stabilizator', 'shtativ', 'yoruglik', 'post-production', 'mikrofon', 'xotira-kartasi', 'aksessuar',
    ]);
    expect(tiles[0]).toEqual({ id: 'kamera', label: 'Kamera', img: '/sections/digital-cameras.webp' });
  });

  it('localizes the label', () => {
    const tiles = categoryTiles('pc', 'ru');
    expect(tiles.slice(0, 2).map((t) => t.label)).toEqual(['Ноутбуки', 'Готовые ПК']);
  });

  it("noma'lum yo'nalishda qator yo'q", () => {
    expect(categoryTiles('yoq', 'uz')).toEqual([]);
  });
});
