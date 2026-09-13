import { describe, it, expect } from 'vitest';
import { categoryTiles, type TileRow } from './tiles';

const row = (type: string, imageUrl: string): TileRow => ({ type, imageUrl });

describe('categoryTiles', () => {
  it('keeps the registry order, not the product count', () => {
    const tiles = categoryTiles([
      row('macbook', '/mac.webp'),
      row('iphone', '/iph.webp'),
      row('macbook', '/mac2.webp'),
      row('ipad', '/pad.webp'),
    ], 'apple', 'uz');
    expect(tiles).toEqual([
      { id: 'iphone', label: 'iPhone', img: '/iph.webp' },
      { id: 'ipad', label: 'iPad', img: '/pad.webp' },
      { id: 'macbook', label: 'MacBook', img: '/mac.webp' },
    ]);
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
