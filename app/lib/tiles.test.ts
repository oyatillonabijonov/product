import { describe, it, expect } from 'vitest';
import { categoryTiles, type TileRow } from './tiles';

const row = (type: string, imageUrl: string): TileRow => ({ type, imageUrl });

describe('categoryTiles', () => {
  it('keeps the registry order, not the product count', () => {
    const tiles = categoryTiles([
      row('gpu', '/gpu.jpg'),
      row('noutbuk', '/nb.jpg'),
      row('gpu', '/gpu2.jpg'),
      row('cpu', '/cpu.jpg'),
    ], 'pc', 'uz');
    expect(tiles).toEqual([
      { id: 'noutbuk', label: 'Noutbuk', img: '/nb.jpg', icon: false },
      { id: 'cpu', label: 'CPU', img: '/cpu.jpg', icon: false },
      { id: 'gpu', label: 'GPU', img: '/gpu.jpg', icon: false },
    ]);
  });

  it('registrda ikonka bo\'lsa mahsulot rasmi o\'rniga shu, bo\'lmasa mahsulot rasmi', () => {
    const tiles = categoryTiles([row('iphone', '/iph.webp'), row('aksessuar', '/acc.jpg')], 'apple', 'uz');
    expect(tiles).toEqual([
      { id: 'iphone', label: 'iPhone', img: '/sections/image-grid-iphone-nav_2x.png', icon: true },
      { id: 'aksessuar', label: 'Aksessuar', img: '/acc.jpg', icon: false },
    ]);
  });

  it('ikonkasi bor tur ham mahsuloti bo\'lmasa chiqmaydi', () => {
    const tiles = categoryTiles([row('iphone', '/i.webp'), row('ipad', '/p.webp')], 'apple', 'uz');
    expect(tiles.map((t) => t.id)).toEqual(['iphone', 'ipad']); // vision-pro, airpods… yo'q
  });

  it('localizes the label', () => {
    const tiles = categoryTiles([row('noutbuk', '/n.jpg'), row('gpu', '/g.jpg')], 'pc', 'ru');
    expect(tiles.map((t) => t.label)).toEqual(['Ноутбуки', 'GPU']);
  });

  it('skips types with no products and types foreign to the direction', () => {
    const tiles = categoryTiles([
      row('kamera', '/k.jpg'),
      row('iphone', '/x.jpg'), // video yo'nalishida bunday tur yo'q
      row('dron', '/d.jpg'),
    ], 'video', 'uz');
    expect(tiles.map((t) => t.id)).toEqual(['kamera', 'dron']);
  });

  it('no row for a single tile, an empty list or an unknown direction', () => {
    expect(categoryTiles([row('kamera', '/k.jpg')], 'video', 'uz')).toEqual([]);
    expect(categoryTiles([], 'apple', 'uz')).toEqual([]);
    expect(categoryTiles([row('kamera', '/k.jpg'), row('dron', '/d.jpg')], 'yoq', 'uz')).toEqual([]);
  });
});
