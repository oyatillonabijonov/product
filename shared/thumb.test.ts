import { describe, expect, it } from 'vitest';
import { isThumbName, thumbSrcSet, thumbUrl } from './thumb';

describe('thumb', () => {
  it('yuklangan rasmga en qo\'shadi', () => {
    expect(thumbUrl('/images/products/ab-12.webp')).toBe('/images/products/ab-12.webp?w=320');
    expect(thumbSrcSet('/images/products/billz-1.JPG')).toBe(
      '/images/products/billz-1.JPG?w=320 320w, /images/products/billz-1.JPG?w=640 640w',
    );
  });

  it('boshqa manzilga tegmaydi', () => {
    for (const url of ['/products/mini.webp', 'https://cdn.example/a.webp', '/images/products/a.mp4', '/images/products/a.webp?v=1', '']) {
      expect(thumbUrl(url)).toBe(url);
      expect(thumbSrcSet(url)).toBeUndefined();
    }
  });

  it('fayl nomida yo\'l bo\'lsa rad etadi', () => {
    expect(isThumbName('ab-12.webp')).toBe(true);
    for (const name of ['../store.db', 'a/b.webp', '..%2Fa.webp', 'a.webp.exe', '.webp']) expect(isThumbName(name)).toBe(false);
  });
});
