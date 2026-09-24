import { describe, it, expect } from 'vitest';
import type { ApiProduct, ApiProductDetail } from './types';
import {
  catalogStats, imageFilesOf, incompleteProducts, manualFieldsFor, detailToInput,
  variantPriceGroups, applyVariantPrices, displayedPrice, priceAskText, priceChangeSummary,
} from './mcp-tools';

const p = (over: Partial<ApiProduct>): ApiProduct => ({
  id: 'x', name: 'Tovar', category: 'iphone', condition: 'yangi', conditionNote: null,
  cashPriceUzs: 1000, imageUrl: '/images/products/a.webp', sortOrder: 0, isActive: true,
  categoryId: 'apple', type: 'iphone', oldPriceUzs: null, brandId: 'apple', slug: null,
  minPriceUzs: 1000, ratingAvg: null, reviewCount: 0, preorder: false,
  billzId: 'b1', billzStock: 3, manualFields: [], description: null, ...over,
} as ApiProduct);

describe('catalogStats', () => {
  it('har holatni alohida sanaydi', () => {
    const s = catalogStats([
      p({ id: '1' }),
      p({ id: '2', imageUrl: '', isActive: false }),
      p({ id: '3', description: 'bor', billzStock: 0 }),
      p({ id: '4', billzId: null, billzStock: null }),
    ]);
    expect(s.total).toBe(4);
    expect(s.active).toBe(3);
    expect(s.hidden).toBe(1);
    expect(s.noImage).toBe(1);
    expect(s.noDescription).toBe(3);
    expect(s.stockZero).toBe(1);
    expect(s.billz).toBe(3);
    expect(s.manual).toBe(1);
  });
});

describe('incompleteProducts', () => {
  const items = [
    p({ id: '1', imageUrl: '', description: 'bor' }),
    p({ id: '2', description: null }),
    p({ id: '3', description: 'bor' }),
    p({ id: '4', imageUrl: '', description: null }),
  ];

  it("faqat so'ralgan yetishmovchilikni qaytaradi", () => {
    expect(incompleteProducts(items, { missing: 'image' }).items.map((x) => x.id)).toEqual(['1', '4']);
    expect(incompleteProducts(items, { missing: 'description' }).items.map((x) => x.id)).toEqual(['2', '4']);
    expect(incompleteProducts(items, { missing: 'any' }).items.map((x) => x.id)).toEqual(['1', '2', '4']);
  });

  it('nima yetishmayotganini aytadi', () => {
    expect(incompleteProducts(items, { missing: 'any' }).items[2].missing).toEqual(['image', 'description']);
  });

  it('sahifalaydi: limit va keyingi siljish', () => {
    const first = incompleteProducts(items, { missing: 'any', limit: 2 });
    expect(first.items.map((x) => x.id)).toEqual(['1', '2']);
    expect(first.nextOffset).toBe(2);
    const second = incompleteProducts(items, { missing: 'any', limit: 2, offset: 2 });
    expect(second.items.map((x) => x.id)).toEqual(['4']);
    expect(second.nextOffset).toBe(null);
  });
});

describe('manualFieldsFor', () => {
  it("tegilgan maydon uchun qulf qo'shadi, mavjudini saqlaydi", () => {
    expect(manualFieldsFor(['description'], { cashPriceUzs: 100 })).toEqual(['price', 'description']);
    expect(manualFieldsFor([], { description: 'matn' })).toEqual(['description']);
    expect(manualFieldsFor([], { specs: [{ label: 'Rang', value: 'Qora' }] })).toEqual(['specs']);
  });

  it('tegilmagan maydon uchun qulf qo\'shmaydi', () => {
    expect(manualFieldsFor([], { name: 'Yangi nom' })).toEqual([]);
    expect(manualFieldsFor(['price'], {})).toEqual(['price']);
  });
});

describe('imageFilesOf', () => {
  it("faqat rasm kengaytmalari, nom bo'yicha tartibda", () => {
    expect(imageFilesOf(['b.PNG', 'a.jpg', 'c.txt', 'd.webp', '.DS_Store', 'e.jpeg']))
      .toEqual(['a.jpg', 'b.PNG', 'd.webp', 'e.jpeg']);
  });

  it('raqamli nomlarni to\'g\'ri tartiblaydi', () => {
    expect(imageFilesOf(['img10.jpg', 'img2.jpg', 'img1.jpg'])).toEqual(['img1.jpg', 'img2.jpg', 'img10.jpg']);
  });
});

describe('detailToInput', () => {
  const detail = {
    ...p({ id: 'v1', imageUrl: '/images/products/main.webp' }),
    description: 'Tavsif',
    images: ['/images/products/main.webp', '/images/products/g1.webp'],
    specs: [{ label: 'Chip', value: 'A19' }],
    brand: null,
    options: [{ id: 'o1', name: 'Xotira', sortOrder: 0, values: [
      { id: 'ov1', value: '128GB', sortOrder: 0 },
      { id: 'ov2', value: '256GB', sortOrder: 1 },
    ] }],
    variants: [{
      id: 'var1', sku: 'A1', cashPriceUzs: 900, oldPriceUzs: null, imageUrl: null,
      inStock: true, sortOrder: 0, optionValueIds: ['ov1'],
    }],
  } as unknown as ApiProductDetail;

  it('option qiymatlarini nomga, variantni juftlikka o\'giradi', () => {
    const b = detailToInput(detail);
    expect(b.options).toEqual([{ name: 'Xotira', values: ['128GB', '256GB'] }]);
    expect(b.variants[0].optionValues).toEqual([{ optionName: 'Xotira', value: '128GB' }]);
  });

  it('galereyadan asosiy rasmni chiqaradi', () => {
    expect(detailToInput(detail).images).toEqual(['/images/products/g1.webp']);
  });

  it("noma'lum option qiymati tashlab yuboriladi", () => {
    const d = { ...detail, variants: [{ ...detail.variants[0], optionValueIds: ['yoq'] }] } as ApiProductDetail;
    expect(detailToInput(d).variants[0].optionValues).toEqual([]);
  });
});

describe('variant narxlari', () => {
  // iPhone 18 Pro'ning kichik nusxasi: 2 xotira × 2 rang, narx faqat xotiraga bog'liq.
  const phone = (prices: [number, number, number, number], inStock = [true, true, true, true]) => ({
    ...p({ id: 'ip' }),
    name: 'iPhone 18 Pro',
    description: null, images: [], specs: [], brand: null,
    options: [
      { id: 'o1', name: 'Xotira', sortOrder: 0, values: [
        { id: 's256', value: '256GB', sortOrder: 0 }, { id: 's512', value: '512GB', sortOrder: 1 },
      ] },
      { id: 'o2', name: 'Rang', sortOrder: 1, values: [
        { id: 'cb', value: 'Black', sortOrder: 0 }, { id: 'cs', value: 'Silver', sortOrder: 1 },
      ] },
    ],
    variants: [
      ['s256', 'cb'], ['s256', 'cs'], ['s512', 'cb'], ['s512', 'cs'],
    ].map((ids, i) => ({
      id: `v${i}`, sku: null, cashPriceUzs: prices[i], oldPriceUzs: null, imageUrl: null,
      inStock: inStock[i], sortOrder: i, optionValueIds: ids,
    })),
  }) as unknown as ApiProductDetail;

  const byStorage = phone([100, 100, 200, 200]);

  describe('variantPriceGroups', () => {
    it("narx bog'liq bo'lgan tanlov bo'yicha guruhlaydi — 4 variant emas, 2 qator", () => {
      expect(variantPriceGroups(byStorage)).toEqual({
        by: 'Xotira', others: ['Rang'],
        rows: [{ label: '256GB', price: 100 }, { label: '512GB', price: 200 }],
      });
    });

    it('rang narxni belgilasa rang bo\'yicha guruhlaydi', () => {
      expect(variantPriceGroups(phone([100, 300, 100, 300])).by).toBe('Rang');
    });

    it("bitta tanlov narxni belgilamasa — har variant alohida", () => {
      const g = variantPriceGroups(phone([100, 110, 200, 210]));
      expect(g.by).toBeNull();
      expect(g.rows).toEqual([
        { label: '256GB / Black', price: 100 }, { label: '256GB / Silver', price: 110 },
        { label: '512GB / Black', price: 200 }, { label: '512GB / Silver', price: 210 },
      ]);
    });
  });

  describe('applyVariantPrices', () => {
    const prices = (d: ApiProductDetail) => d.variants.map((v) => v.cashPriceUzs);

    it("narx o'sha qiymatli hamma variantga (hamma rangga) tushadi", () => {
      expect(prices(applyVariantPrices(byStorage, [{ value: '256GB', price: 150 }]))).toEqual([150, 150, 200, 200]);
    });

    it("katta-kichik harf va bo'shliq farq qilmaydi", () => {
      expect(prices(applyVariantPrices(byStorage, [{ value: '256 gb', price: 150 }]))).toEqual([150, 150, 200, 200]);
    });

    it('bir chaqiruvda bir nechta qiymat', () => {
      const d = applyVariantPrices(byStorage, [{ value: '256GB', price: 150 }, { value: '512GB', price: 250 }]);
      expect(prices(d)).toEqual([150, 150, 250, 250]);
    });

    it("asl tovarni o'zgartirmaydi", () => {
      applyVariantPrices(byStorage, [{ value: '256GB', price: 150 }]);
      expect(prices(byStorage)).toEqual([100, 100, 200, 200]);
    });

    it("noma'lum qiymat — xato, bor variantlar sodda ro'yxatda", () => {
      expect(() => applyVariantPrices(byStorage, [{ value: '128GB', price: 150 }]))
        .toThrow(/«128GB».*Xotira: 256GB, 512GB.*Rang: Black, Silver/s);
    });

    it('bitta variantga ikki xil narx tushsa — xato', () => {
      expect(() => applyVariantPrices(byStorage, [{ value: '256GB', price: 150 }, { value: 'Black', price: 170 }]))
        .toThrow(/256GB \/ Black/);
    });

    it("bir xil narx ikki tomondan kelsa ziddiyat emas", () => {
      const d = applyVariantPrices(byStorage, [{ value: '256GB', price: 150 }, { value: 'Black', price: 150 }]);
      expect(prices(d)).toEqual([150, 150, 150, 200]);
    });
  });

  describe('displayedPrice', () => {
    it("saytdagi «... dan» narx — mavjud variantlarning eng arzoni", () => {
      expect(displayedPrice(phone([300, 300, 200, 200]))).toBe(200);
    });
    it("mavjud bo'lmagan variant hisobga olinmaydi", () => {
      expect(displayedPrice(phone([100, 100, 200, 200], [false, false, true, true]))).toBe(200);
    });
    it("hammasi tugagan bo'lsa — hamma variantning eng arzoni", () => {
      expect(displayedPrice(phone([300, 300, 200, 200], [false, false, false, false]))).toBe(200);
    });
  });

  describe('priceAskText', () => {
    const t = priceAskText(byStorage);
    it("hech narsa o'zgarmaganini birinchi aytadi", () => {
      expect(t.split('\n')[0]).toMatch(/^Hech narsa o'zgartirilmadi/);
    });
    it("narxlarni ming ajratib, qator-qator ko'rsatadi", () => {
      expect(t).toContain('• 256GB — 100 so\'m');
      expect(t).toContain('• 512GB — 200 so\'m');
    });
    it("narxga ta'sir qilmaydigan tanlovni aytadi va sodda so'raydi", () => {
      expect(t).toContain("Rang narxga ta'sir qilmaydi");
      expect(t).toContain("Qaysi xotiraning narxini o'zgartiray?");
    });
    it('katta narxni bo\'shliq bilan ajratadi', () => {
      expect(priceAskText(phone([18887400, 18887400, 21407400, 21407400]))).toContain('18 887 400 so\'m');
    });
  });

  describe('priceChangeSummary', () => {
    const after = applyVariantPrices(byStorage, [{ value: '256GB', price: 300 }]);
    const s = priceChangeSummary(byStorage, after);
    it("o'zgargan qatorda avvalgi narx, o'zgarmaganida yo'q", () => {
      expect(s).toContain('• 256GB — 300 so\'m (avval 100)');
      expect(s).toContain('• 512GB — 200 so\'m\n');
    });
    it("saytda nima ko'rinishini va eng arzoni qaysi ekanini aytadi", () => {
      // 256GB ni qimmatlashtirdi — endi 512GB arzonroq, kartada 200 chiqadi.
      expect(s).toContain("Saytda endi «200 so'm dan» ko'rinadi — eng arzoni: 512GB");
    });
  });
});
