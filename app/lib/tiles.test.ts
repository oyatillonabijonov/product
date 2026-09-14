import { describe, it, expect } from 'vitest';
import { categoryTiles, type TileRow } from './tiles';

const row = (type: string, imageUrl: string): TileRow => ({ type, imageUrl });

describe('categoryTiles', () => {
  it("yo'nalishning hamma turi registr tartibida chiqadi — mahsuloti yo'qlari ham", () => {
    const tiles = categoryTiles([
      row('gpu', '/gpu.jpg'),
      row('noutbuk', '/nb.jpg'),
      row('gpu', '/gpu2.jpg'),
    ], 'pc', 'uz');
    expect(tiles.map((t) => t.id)).toEqual([
      'noutbuk', 'tayyor-pc', 'cpu', 'gpu', 'motherboard', 'ram', 'xotira', 'korpus', 'psu', 'sovutish', 'monitor', 'aksessuar',
    ]);
    // Rasm — o'sha turdagi birinchi mahsulotniki; mahsuloti yo'q turda null (UI chiziqli ikonka chizadi).
    expect(tiles.find((t) => t.id === 'gpu')).toEqual({ id: 'gpu', label: 'GPU', img: '/gpu.jpg', icon: false });
    expect(tiles.find((t) => t.id === 'cpu')).toEqual({ id: 'cpu', label: 'CPU', img: null, icon: false });
  });

  it("registrda ikonka bo'lsa mahsulot rasmi o'rniga shu — mahsuloti bo'lmasa ham", () => {
    const tiles = categoryTiles([row('iphone', '/iph.webp'), row('aksessuar', '/acc.jpg')], 'apple', 'uz');
    expect(tiles.find((t) => t.id === 'iphone')).toEqual({ id: 'iphone', label: 'iPhone', img: '/sections/image-grid-iphone-nav_2x.png', icon: true });
    expect(tiles.find((t) => t.id === 'vision-pro')?.img).toBe('/sections/image-grid-apple-vision-pro_2x.png');
    expect(tiles.find((t) => t.id === 'aksessuar')).toEqual({ id: 'aksessuar', label: 'Aksessuar', img: '/acc.jpg', icon: false });
    expect(tiles.find((t) => t.id === 'imac')?.img).toBeNull();
  });

  it('localizes the label', () => {
    const tiles = categoryTiles([], 'pc', 'ru');
    expect(tiles.slice(0, 2).map((t) => t.label)).toEqual(['Ноутбуки', 'Готовые ПК']);
  });

  it("boshqa yo'nalish turi qo'shilmaydi, bo'sh rasm yo'li rasm hisoblanmaydi", () => {
    const tiles = categoryTiles([row('iphone', '/x.jpg'), row('kamera', '')], 'video', 'uz');
    expect(tiles.map((t) => t.id)).not.toContain('iphone');
    expect(tiles.find((t) => t.id === 'kamera')?.img).toBeNull();
  });

  it("noma'lum yo'nalishda qator yo'q", () => {
    expect(categoryTiles([row('kamera', '/k.jpg')], 'yoq', 'uz')).toEqual([]);
  });
});
