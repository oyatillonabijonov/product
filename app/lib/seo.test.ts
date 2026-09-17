import { describe, expect, it } from 'vitest';
import { pageTitle, productJsonLd, breadcrumbJsonLd, storeConfigFrom, productDescriptionFallback, catalogMeta, organizationJsonLd } from './seo';
import type { ProductDetail } from './loaders';

function makeDetail(over: Partial<ProductDetail> = {}): ProductDetail {
  return {
    id: 'p1', name: 'iPhone 15', category: 'iphone', condition: 'yangi',
    image: '/i.webp', cashPriceUzs: 1000, oldPriceUzs: null, minPriceUzs: 900,
    brandId: null, categoryId: null, description: null, images: ['/i.webp'],
    specs: [], brand: null, options: [], variants: [],
    ...over,
  };
}

describe('pageTitle suffix', () => {
  it('uses the given suffix', () => {
    expect(pageTitle('Katalog', 'Yangi Do\'kon')).toBe("Katalog — Yangi Do'kon");
    expect(pageTitle(undefined, 'Yangi Do\'kon')).toBe("Yangi Do'kon");
  });
  it('falls back to static suffix without one', () => {
    expect(pageTitle('X')).toContain('X — ');
  });
});

describe('productJsonLd', () => {
  it('builds offer from minPriceUzs, InStock for variantless', () => {
    const ld = productJsonLd(makeDetail(), '/product/p1') as {
      offers: { price: number; priceCurrency: string; availability: string; url: string };
      name: string; image: string[];
    };
    expect(ld.name).toBe('iPhone 15');
    expect(ld.offers.price).toBe(900);
    expect(ld.offers.priceCurrency).toBe('UZS');
    expect(ld.offers.availability).toBe('https://schema.org/InStock');
    expect(ld.offers.url).toBe('/product/p1');
  });
  it('OutOfStock when all variants out of stock, InStock when any in stock', () => {
    const v = (inStock: boolean) => ({ id: 'v', sku: null, cashPriceUzs: 900, oldPriceUzs: null, imageUrl: null, inStock, sortOrder: 0, optionValueIds: [] });
    const out = productJsonLd(makeDetail({ variants: [v(false), v(false)] }), '/p') as { offers: { availability: string } };
    expect(out.offers.availability).toBe('https://schema.org/OutOfStock');
    const okay = productJsonLd(makeDetail({ variants: [v(false), v(true)] }), '/p') as { offers: { availability: string } };
    expect(okay.offers.availability).toBe('https://schema.org/InStock');
  });
  it('includes brand and description only when present', () => {
    const bare = productJsonLd(makeDetail(), '/p') as Record<string, unknown>;
    expect('brand' in bare).toBe(false);
    expect('description' in bare).toBe(false);
    const rich = productJsonLd(makeDetail({
      description: 'Tavsif',
      brand: { id: 'b', name: 'Apple', slug: 'apple', logoUrl: '', sortOrder: 0 },
    }), '/p') as { brand: { name: string }; description: string };
    expect(rich.brand.name).toBe('Apple');
    expect(rich.description).toBe('Tavsif');
  });

  it('omits image when the gallery is empty', () => {
    const ld = productJsonLd(makeDetail({ images: [] }), '/p') as Record<string, unknown>;
    expect('image' in ld).toBe(false);
    const withImg = productJsonLd(makeDetail(), '/p') as { image: string[] };
    expect(withImg.image).toEqual(['/i.webp']);
  });
});

describe('breadcrumbJsonLd', () => {
  it('numbers positions from 1', () => {
    const ld = breadcrumbJsonLd([
      { name: 'Bosh sahifa', url: '/' },
      { name: 'iPhone 15', url: '/product/p1' },
    ]) as { itemListElement: { position: number; name: string; item: string }[] };
    expect(ld.itemListElement).toHaveLength(2);
    expect(ld.itemListElement[0].position).toBe(1);
    expect(ld.itemListElement[1]).toEqual({ '@type': 'ListItem', position: 2, name: 'iPhone 15', item: '/product/p1' });
  });
});

describe('storeConfigFrom', () => {
  const cfg = { seoTitleSuffix: 'S', seoDescription: 'D', name: 'N', phone: '', phoneDisplay: '', telegram: '', instagram: '', whatsapp: '', mapLl: '', mapLabel: '', ogImage: '' };
  it('finds siteConfig in matches array', () => {
    expect(storeConfigFrom([{ data: undefined }, { data: { siteConfig: cfg } }])).toEqual(cfg);
  });
  it('returns undefined for junk', () => {
    expect(storeConfigFrom(undefined)).toBeUndefined();
    expect(storeConfigFrom([{ data: { x: 1 } }, null])).toBeUndefined();
  });
});

describe('productDescriptionFallback', () => {
  it('nom, brend, narx va do\'kon nomidan tavsif yasaydi', () => {
    const d = productDescriptionFallback('uz', 'MacBook Pro 14', 'Apple', "30 240 000 so'm", 'ProDuct');
    expect(d).toContain('MacBook Pro 14');
    expect(d).toContain('Apple');
    expect(d).toContain("30 240 000 so'm");
    expect(d).toContain('ProDuct');
  });
  it('ruscha va brendsiz', () => {
    const d = productDescriptionFallback('ru', 'HomePod', null, '5 000 000 сум', 'ProDuct');
    expect(d).toContain('Ташкент');
    expect(d).not.toContain('null');
  });
});

describe('catalogMeta description', () => {
  it('tavsif berilsa description meta qo\'shiladi', () => {
    const metas = catalogMeta('Apple — ProDuct', 'https://x.uz/category/apple', 'Apple texnikasi');
    expect(metas).toContainEqual({ name: 'description', content: 'Apple texnikasi' });
  });
});

describe('organizationJsonLd manzil', () => {
  it("manzil va ish vaqti sayt matnlaridan, sayt URL'i kiradi", () => {
    const ld = organizationJsonLd(
      { name: 'ProDuct', phone: '+998', telegram: 't', instagram: 'i', mapLl: '69.27,41.33', mapLabel: 'eski yozuv' } as never,
      'https://product.uz',
      { address: "O'zbekiston, Toshkent shahar, Tong Yulduzi MFY, 30-uy", openingHours: 'Mo-Sa 09:00-20:00' },
    ) as {
      address: { streetAddress: string; addressLocality: string }; openingHours: string; url: string; geo: { latitude: number; longitude: number };
    };
    expect(ld.address.streetAddress).toBe("O'zbekiston, Toshkent shahar, Tong Yulduzi MFY, 30-uy");
    expect(ld.address.addressLocality).toBe('Toshkent');
    expect(ld.openingHours).toBe('Mo-Sa 09:00-20:00');
    expect(ld.url).toBe('https://product.uz');
    expect(ld.geo).toMatchObject({ latitude: 41.33, longitude: 69.27 });
  });
});
