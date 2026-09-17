import { describe, expect, it } from 'vitest';
import type { ApiCategory } from '../../shared/types';
import { translations } from '../locales';
import type { AssetKey } from '../lib/site-content';
import { columnForCategory, columnHref, heroColumns } from './hero-columns';

const t = { ...translations["O'zbek tili"], heroPc: 'Kompyuterlar\nva noutbuklar' };
const uploaded: Partial<Record<AssetKey, string>> = {
  'hero.apple.image': '/a.webp',
  'hero.apple.video1': '/a1.mp4',
  'hero.pc.image': '/pc.webp',
  'hero.pc.video2': '/pc2.mp4',
};
const asset = (key: AssetKey) => uploaded[key] ?? '';
const cat = (id: string): ApiCategory => ({
  id, name: id, nameRu: '', iconUrl: '', icon: '', coverUrl: '', coverLede: '', coverLedeRu: '', sortOrder: 0,
});

describe('heroColumns', () => {
  it("4 ta yo'nalish qat'iy tartibda, nom sayt matnidan", () => {
    const cols = heroColumns(t, asset);
    expect(cols.map((c) => c.key)).toEqual(['apple', 'pc', 'audio', 'video']);
    expect(cols[0].label).toBe(translations["O'zbek tili"].heroApple);
    expect(cols[1].label).toBe('Kompyuterlar\nva noutbuklar');
  });
  it("rasm va poster asset'dan, bo'sh videolar tashlanadi", () => {
    const [apple, pc, audio] = heroColumns(t, asset);
    expect(apple.img).toBe('/a.webp');
    expect(apple.videos).toEqual(['/a1.mp4']);
    expect(pc.videos).toEqual(['/pc2.mp4']);
    expect(audio.videos).toEqual([]);
    expect(audio.poster).toBe('');
  });
});

describe('columnForCategory / columnHref', () => {
  const cols = heroColumns(t, asset);
  it("kategoriya id'si bo'yicha o'z ustunini topadi", () => {
    expect(columnForCategory(cols, cat('audio'))?.key).toBe('audio');
    expect(columnForCategory(cols, cat('aksessuar'))).toBeNull();
  });
  it("mos kategoriya bo'lmasa katalogga olib boradi", () => {
    expect(columnHref(cols[0], [cat('apple')])).toBe('/category/apple');
    expect(columnHref(cols[0], [])).toBe('/katalog');
  });
});
