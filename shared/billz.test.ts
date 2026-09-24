import { describe, it, expect } from 'vitest';
import type { ProductTypeRow } from './product-types';
import {
  toUzs, htmlToText, asciiSlug, photoKey, hiddenIds, productsUrl, utcStamp, mapBillzProduct, nameKey, mergeDuplicates,
  syncTarget, applyManualEdits, withHiddenLock, billzVisible, billzNameKey, billzUpdateColumns,
  type BillzProduct, type MapContext, type LockSnapshot,
  parseManualFields,
  serializeManualFields,
} from './billz';

const SHOP = 'shop-1';
const TYPES: ProductTypeRow[] = [
  { id: 'iphone', categoryId: 'apple', label: 'iPhone', labelRu: 'iPhone', iconUrl: '', billzAliases: [], sortOrder: 10 },
  { id: 'ipad', categoryId: 'apple', label: 'iPad', labelRu: 'iPad', iconUrl: '', billzAliases: ['iPad Pro'], sortOrder: 20 },
  { id: 'ram', categoryId: 'pc', label: 'RAM', labelRu: 'RAM', iconUrl: '', billzAliases: ['DDR4', 'DDR5'], sortOrder: 60 },
];
const ctx: MapContext = {
  shopId: SHOP,
  usdToUzs: 12600,
  categoryIds: new Set(['apple', 'pc', 'audio', 'video']),
  brandsByName: new Map([['apple', 'apple'], ['asus', 'asus']]),
  types: TYPES,
  existingImage: null,
};
const raw = (over: Partial<BillzProduct> = {}): BillzProduct => ({
  id: '2ce40c63-4527-4898-a975-7c30c255fd50',
  name: 'iPhone 17 Pro 256GB Cosmic Orange',
  brand_name: 'Apple',
  categories: [{ id: 'c1', name: 'iPhone' }],
  description: '',
  updated_at: '2026-09-09 21:22:28',
  main_image_url_full: '',
  photos: [],
  custom_fields: [
    { custom_field_name: 'Nad Kategoriya', custom_field_value: 'Apple' },
    { custom_field_name: 'Память', custom_field_value: '256GB' },
    { custom_field_name: 'Цвет', custom_field_value: 'Cosmic Orange' },
    { custom_field_name: 'Состояние', custom_field_value: 'A19 Pro' },
    { custom_field_name: 'Postavshik', custom_field_value: 'YATT' },
  ],
  product_attributes: [],
  shop_prices: [{ shop_id: SHOP, retail_price: 1497, retail_currency: 'USD', promo_price: 0 }],
  shop_measurement_values: [{ shop_id: SHOP, active_measurement_value: 3 }],
  ...over,
});
const CDN = 'https://fra1.digitaloceanspaces.com/billz2-minio-billz/7b57f5e0-c9c7-44f3-9f58-93f1a9564b11.jpg';

describe('yordamchilar', () => {
  it('toUzs: USD kurs bilan 1000 ga yaxlitlanadi, UZS yaxlitlanadi, boshqasi null', () => {
    expect(toUzs(1497, 'USD', 12600)).toBe(18862000);
    expect(toUzs(710, 'USD', 12600)).toBe(8946000);
    expect(toUzs(1234567, 'UZS', 12600)).toBe(1235000);
    expect(toUzs(10, 'EUR', 12600)).toBeNull();
    expect(toUzs(0, 'USD', 12600)).toBeNull();
  });
  it('htmlToText: Lexical HTML → matn', () => {
    expect(htmlToText('<p class="x" dir="ltr"><span>Salom&nbsp;dunyo</span></p><p>Ikki<br>uch</p><p></p><p></p><p>&amp;</p>')).toBe('Salom dunyo\nIkki\nuch\n\n&');
    expect(htmlToText('<p></p>')).toBe('');
  });
  it('asciiSlug', () => {
    expect(asciiSlug('iPhone 17 Pro 256GB / Cosmic Orange')).toBe('iphone-17-pro-256gb-cosmic-orange');
    expect(asciiSlug('Клавиатура')).toBe('');
  });
  it('photoKey: faqat CDN host, uuid nomi, ruxsat etilgan kengaytma', () => {
    expect(photoKey(CDN)).toBe('products/billz-7b57f5e0-c9c7-44f3-9f58-93f1a9564b11.jpg');
    expect(photoKey('https://fra1.digitaloceanspaces.com/b/x.gif')).toBeNull();
    expect(photoKey('https://evil.example/7b57f5e0-c9c7-44f3-9f58-93f1a9564b11.jpg')).toBeNull();
    expect(photoKey('http://fra1.digitaloceanspaces.com/b/7b57f5e0-c9c7-44f3-9f58-93f1a9564b11.jpg')).toBeNull();
    expect(photoKey('https://fra1.digitaloceanspaces.com/b/photo one.png')).toMatch(/^products\/billz-[0-9a-f]{8}\.png$/);
  });
  it("hiddenIds: bazada bor, Billz'da ko'rinmaganlar", () => {
    expect(hiddenIds(['a', 'b', 'c'], new Set(['b']))).toEqual(['a', 'c']);
  });
  it('productsUrl va utcStamp', () => {
    expect(productsUrl(2)).toBe('https://api-admin.billz.ai/v2/products?limit=200&page=2');
    expect(productsUrl(1, '2026-09-13 10:00:00')).toBe('https://api-admin.billz.ai/v2/products?limit=200&page=1&last_updated_date=2026-09-13+10%3A00%3A00');
    expect(utcStamp(new Date(Date.UTC(2026, 8, 13, 7, 5, 9)))).toBe('2026-09-13 07:05:09');
  });
});

describe('mapBillzProduct', () => {
  it("to'liq namuna", () => {
    const m = mapBillzProduct(raw({ photos: [
      { photo_url: 'https://fra1.digitaloceanspaces.com/b/aaaaaaaa-0000-0000-0000-000000000002.jpg', sequence: 1, is_main: false },
      { photo_url: 'https://fra1.digitaloceanspaces.com/b/aaaaaaaa-0000-0000-0000-000000000001.jpg', sequence: 0, is_main: true },
    ] }), ctx);
    expect(m).not.toBeNull();
    expect(m?.billzId).toBe('2ce40c63-4527-4898-a975-7c30c255fd50');
    expect(m?.slug).toBe('iphone-17-pro-256gb-cosmic-orange-2ce40c63');
    expect(m?.categoryId).toBe('apple');
    expect(m?.type).toBe('iphone');
    expect(m?.brandId).toBe('apple');
    expect(m?.newBrand).toBeNull();
    expect(m?.cashPriceUzs).toBe(18862000);
    expect(m?.oldPriceUzs).toBeNull();
    expect(m?.stock).toBe(3);
    expect(m?.description).toBeNull();
    expect(m?.specs).toEqual([{ label: 'Xotira', value: '256GB' }, { label: 'Rang', value: 'Cosmic Orange' }, { label: 'Chip', value: 'A19 Pro' }]);
    expect(m?.photos.map((p) => p.key)).toEqual([
      'products/billz-aaaaaaaa-0000-0000-0000-000000000001.jpg',
      'products/billz-aaaaaaaa-0000-0000-0000-000000000002.jpg',
    ]);
    expect(m?.imageUrl).toBe('/images/products/billz-aaaaaaaa-0000-0000-0000-000000000001.jpg');
    expect(m?.gallery).toEqual(['/images/products/billz-aaaaaaaa-0000-0000-0000-000000000002.jpg']);
    expect(m?.isActive).toBe(true);
  });
  it('promo: chegirma narx + eski narx', () => {
    const m = mapBillzProduct(raw({ shop_prices: [{ shop_id: SHOP, retail_price: 1000, retail_currency: 'USD', promo_price: 900 }] }), ctx);
    expect(m?.cashPriceUzs).toBe(11340000);
    expect(m?.oldPriceUzs).toBe(12600000);
  });
  it("yo'nalish katta-kichik harfsiz, noma'lum → null; tur yo'nalishsiz null", () => {
    const pc = mapBillzProduct(raw({ custom_fields: [{ custom_field_name: 'Nad Kategoriya', custom_field_value: 'Pc' }], categories: [{ id: 'c', name: 'DDR5' }] }), ctx);
    expect(pc?.categoryId).toBe('pc');
    expect(pc?.type).toBe('ram');
    const m = mapBillzProduct(raw({ custom_fields: [{ custom_field_name: 'Nad Kategoriya', custom_field_value: 'Gaming' }] }), ctx);
    expect(m?.categoryId).toBeNull();
    expect(m?.type).toBeNull();
  });
  it('yangi brend', () => {
    const m = mapBillzProduct(raw({ brand_name: 'ADAM Audio' }), ctx);
    expect(m?.brandId).toBe('adam-audio');
    expect(m?.newBrand).toEqual({ id: 'adam-audio', name: 'ADAM Audio' });
    expect(mapBillzProduct(raw({ brand_name: '' }), ctx)?.brandId).toBeNull();
  });
  it("rasm yo'q: admin rasmi saqlanadi, ko'rinish rasmga bog'liq", () => {
    expect(mapBillzProduct(raw(), ctx)?.imageUrl).toBe('');
    expect(mapBillzProduct(raw(), ctx)?.isActive).toBe(false);
    const kept = mapBillzProduct(raw(), { ...ctx, existingImage: '/images/products/admin.webp' });
    expect(kept?.imageUrl).toBe('/images/products/admin.webp');
    expect(kept?.isActive).toBe(true);
    const noStock = mapBillzProduct(raw({ shop_measurement_values: [{ shop_id: SHOP, active_measurement_value: 0 }] }), { ...ctx, existingImage: '/x.jpg' });
    // 2026-09-24: qoldig'i 0 tovar ham ko'rinadi — egasi uni tez olib keladi.
    expect(noStock?.isActive).toBe(true);
  });
  it("do'kon narxi yo'q / nom bo'sh → null", () => {
    expect(mapBillzProduct(raw({ shop_prices: [{ shop_id: 'other', retail_price: 1, retail_currency: 'USD', promo_price: 0 }] }), ctx)).toBeNull();
    expect(mapBillzProduct(raw({ name: '  ' }), ctx)).toBeNull();
  });
  it("tavsif HTML → matn; product_attributes rangi custom field bo'lmasa qo'shiladi; bo'sh qiymatlar tashlanadi", () => {
    const m = mapBillzProduct(raw({
      description: '<p>Yaxshi <b>telefon</b></p>',
      custom_fields: [
        { custom_field_name: 'Nad Kategoriya', custom_field_value: 'Apple' },
        { custom_field_name: 'Память', custom_field_value: '___' },
      ],
      product_attributes: [{ attribute_name: 'Цвет', attribute_value: 'Black' }],
    }), ctx);
    expect(m?.description).toBe('Yaxshi telefon');
    expect(m?.specs).toEqual([{ label: 'Rang', value: 'Black' }]);
  });
});

describe('dublikatlarni birlashtirish', () => {
  const mapped = (over: Partial<import('./billz').MappedProduct> = {}): import('./billz').MappedProduct => ({
    billzId: 'a', name: 'Apple TV 4K', slug: 'apple-tv-4k-a', categoryId: 'apple', type: 'aksessuar',
    brandId: 'apple', newBrand: null, cashPriceUzs: 2142000, oldPriceUzs: null, stock: 1, description: null, specs: [],
    photos: [], imageUrl: '', gallery: [], isActive: false, ...over,
  });
  it('nameKey: harf registri va ortiqcha bo\'shliqlar farq qilmaydi', () => {
    expect(nameKey('  Apple  TV 4K ')).toBe('apple tv 4k');
    expect(nameKey('APPLE TV 4K')).toBe(nameKey('apple tv 4k'));
  });
  it('bir xil nomli tovarlar bitta bo\'lib, qoldiq yig\'iladi', () => {
    const out = mergeDuplicates([
      mapped({ billzId: 'a', stock: 1 }),
      mapped({ billzId: 'b', stock: 2, name: 'apple tv 4k' }),
      mapped({ billzId: 'c', name: 'HomePod', stock: 5 }),
    ]);
    expect(out).toHaveLength(2);
    expect(out[0].stock).toBe(3);
    expect(out[1].name).toBe('HomePod');
  });
  it('vakil sifatida rasmi bor yozuv olinadi, ko\'rinish qayta hisoblanadi', () => {
    const photo = { url: 'https://fra1.digitaloceanspaces.com/b/x.jpg', key: 'products/billz-x.jpg' };
    const out = mergeDuplicates([
      mapped({ billzId: 'a', stock: 0 }),
      mapped({ billzId: 'b', stock: 1, photos: [photo], imageUrl: '/images/products/billz-x.jpg' }),
    ]);
    expect(out[0].billzId).toBe('b');
    expect(out[0].imageUrl).toBe('/images/products/billz-x.jpg');
    expect(out[0].stock).toBe(1);
    expect(out[0].isActive).toBe(true);
  });
  it('rasmsiz guruh qoldiq bo\'lsa ham ko\'rinmaydi', () => {
    const out = mergeDuplicates([mapped({ billzId: 'a', stock: 2 }), mapped({ billzId: 'b', stock: 3 })]);
    expect(out[0].stock).toBe(5);
    expect(out[0].isActive).toBe(false);
  });
});

describe('syncTarget — sinxronizatsiya yozadigan yakuniy tovar', () => {
  const photo = { url: 'https://fra1.digitaloceanspaces.com/b/x.jpg', key: 'products/billz-x.jpg' };
  const base = (over: Partial<import('./billz').MappedProduct> = {}): import('./billz').MappedProduct => ({
    billzId: 'a', name: 'MacBook Air', slug: 'macbook-air-a', categoryId: 'apple', type: 'macbook',
    brandId: 'apple', newBrand: null, cashPriceUzs: 1, oldPriceUzs: null, stock: 3, description: null, specs: [],
    photos: [], imageUrl: '', gallery: [], isActive: false, ...over,
  });
  const withBillzPhoto = base({ photos: [photo], imageUrl: '/images/products/billz-x.jpg', gallery: ['/images/products/g.jpg'] });

  it("Billz'da rasm yo'q — saytdagi rasm qoladi va tovar ko'rinadi", () => {
    const out = syncTarget(base(), '/images/products/uploaded.jpg', [], new Set());
    expect(out.imageUrl).toBe('/images/products/uploaded.jpg');
    expect(out.isActive).toBe(true);
    expect(out.gallery).toEqual([]);
  });

  it("rasm yuklab bo'lmadi — saytdagi rasm qoladi", () => {
    const out = syncTarget(withBillzPhoto, '/images/products/uploaded.jpg', [], new Set([photo.key]));
    expect(out.imageUrl).toBe('/images/products/uploaded.jpg');
    expect(out.photos).toEqual([]);
  });

  it("Billz rasmi yuklandi va qulf yo'q — Billz'niki yoziladi", () => {
    const out = syncTarget(withBillzPhoto, '/images/products/uploaded.jpg', [], new Set());
    expect(out.imageUrl).toBe('/images/products/billz-x.jpg');
    expect(out.photos).toEqual([photo]);
    expect(out.gallery).toEqual(['/images/products/g.jpg']);
    expect(out.isActive).toBe(true);
  });

  it("rasmlar qulflangan — Billz'da rasm bo'lsa ham saytdagisi qoladi, galereya yozilmaydi", () => {
    const out = syncTarget(withBillzPhoto, '/images/products/uploaded.jpg', ['images'], new Set());
    expect(out.imageUrl).toBe('/images/products/uploaded.jpg');
    expect(out.photos).toEqual([]);
    expect(out.gallery).toEqual([]);
  });

  it("qo'lda yashirilgan — rasm bo'lsa ham ko'rinmaydi", () => {
    expect(syncTarget(withBillzPhoto, null, ['hidden'], new Set()).isActive).toBe(false);
  });

  it("qoldig'i 0, rasmi bor — ko'rinadi", () => {
    expect(syncTarget(base({ stock: 0 }), '/images/products/uploaded.jpg', [], new Set()).isActive).toBe(true);
  });

  it("ikkala tomonda ham rasm yo'q — ko'rinmaydi", () => {
    expect(syncTarget(base(), null, [], new Set()).isActive).toBe(false);
  });
});

describe('qo\'lda o\'zgartirish qulflari', () => {
  const snap = (over: Partial<LockSnapshot> = {}): LockSnapshot => ({
    name: 'iPhone 17 Pro Sim/E-sim / Silver', brandId: 'apple', categoryId: 'apple', type: 'iphone',
    description: 'Tavsif', cashPriceUzs: 100, oldPriceUzs: null,
    specs: [{ label: 'Xotira', value: '256GB' }], imageUrl: '/a.webp', images: ['/b.webp'], isActive: true, ...over,
  });

  it("hech narsa o'zgarmasa qulflar o'z holicha", () => {
    expect(applyManualEdits(['price'], snap(), snap())).toEqual(['price']);
  });

  it('har guruh o\'z qulfini qo\'yadi', () => {
    expect(applyManualEdits([], snap(), snap({ name: 'iPhone 17 Pro' }))).toEqual(['name']);
    expect(applyManualEdits([], snap(), snap({ brandId: 'samsung' }))).toEqual(['brand']);
    expect(applyManualEdits([], snap(), snap({ type: 'ipad' }))).toEqual(['category']);
    expect(applyManualEdits([], snap(), snap({ description: 'Yangi' }))).toEqual(['description']);
    expect(applyManualEdits([], snap(), snap({ oldPriceUzs: 120 }))).toEqual(['price']);
    expect(applyManualEdits([], snap(), snap({ specs: [{ label: 'Xotira', value: '512GB' }] }))).toEqual(['specs']);
    expect(applyManualEdits([], snap(), snap({ images: [] }))).toEqual(['images']);
  });

  it("tavsifdagi faqat bo'shliq o'zgarishi tahrir emas", () => {
    expect(applyManualEdits([], snap({ description: 'Tavsif' }), snap({ description: '  Tavsif \n' }))).toEqual([]);
    expect(applyManualEdits([], snap({ description: null }), snap({ description: '' }))).toEqual([]);
  });

  it('galereya tartibini almashtirish ham tahrir', () => {
    const b = snap({ images: ['/b.webp', '/c.webp'] });
    expect(applyManualEdits([], b, snap({ images: ['/c.webp', '/b.webp'] }))).toEqual(['images']);
  });

  it("yashirish qulf qo'yadi, ko'rsatish yechadi", () => {
    expect(applyManualEdits([], snap({ isActive: true }), snap({ isActive: false }))).toEqual(['hidden']);
    expect(applyManualEdits(['hidden', 'price'], snap({ isActive: false }), snap({ isActive: true }))).toEqual(['price']);
  });

  it("sinxronizatsiya tahrir paytida narxni o'zgartirgan bo'lsa ham — foydalanuvchi tegmagan narx qulflanmaydi", () => {
    // Egasi 10:00 da narx 100 ni ko'rdi, 10:15 da bazada 120 bo'ldi, 10:20 da faqat tavsifni o'zgartirdi.
    // Forma narxni 100 deb yuboradi, lekin foydalanuvchi uni ko'rgan holatdan o'zgartirmagan.
    expect(applyManualEdits([], snap({ cashPriceUzs: 100 }), snap({ cashPriceUzs: 100, description: 'Yangi' }))).toEqual(['description']);
  });

  it('tartib doim MANUAL_FIELDS bo\'yicha', () => {
    expect(applyManualEdits(['hidden'], snap(), snap({ name: 'X', cashPriceUzs: 5 }))).toEqual(['price', 'name', 'hidden']);
  });

  it('withHiddenLock takrorlansa ham bir xil natija', () => {
    expect(withHiddenLock(['price'], false)).toEqual(['price', 'hidden']);
    expect(withHiddenLock(['price', 'hidden'], false)).toEqual(['price', 'hidden']);
    expect(withHiddenLock(['price', 'hidden'], true)).toEqual(['price']);
    expect(withHiddenLock([], true)).toEqual([]);
  });
});

describe('billzVisible', () => {
  it('rasm bor va qo\'lda yashirilmagan bo\'lsagina ko\'rinadi', () => {
    expect(billzVisible({ hasImage: true, hiddenLocked: false })).toBe(true);
    expect(billzVisible({ hasImage: true, hiddenLocked: true })).toBe(false);
    expect(billzVisible({ hasImage: false, hiddenLocked: false })).toBe(false);
    expect(billzVisible({ hasImage: false, hiddenLocked: true })).toBe(false);
  });
});

describe('billzNameKey', () => {
  it("tovar Billz'dagi nomi bo'yicha topiladi, saytdagi nom bo'yicha emas", () => {
    const renamed = { name: 'iPhone 17 Pro', billz_name: 'iPhone 17 Pro Sim/E-sim / Silver' };
    expect(billzNameKey(renamed)).toBe(nameKey('iPhone 17 Pro Sim/E-sim / Silver'));
    // Billz'dagi boshqa «iPhone 17 Pro» tovari qayta nomlangan tovarga mos kelmaydi.
    expect(billzNameKey(renamed)).not.toBe(nameKey('iPhone 17 Pro'));
  });
  it("billz_name hali bo'sh bo'lsa (migratsiyadan oldingi qator) saytdagi nom", () => {
    expect(billzNameKey({ name: 'HomePod', billz_name: null })).toBe('homepod');
  });
});

describe('manual fields', () => {
  it("bazadagi satrni ro'yxatga aylantiradi, notanish kalitni tashlaydi", () => {
    expect(parseManualFields('nom,description')).toEqual(['description']);
    expect(parseManualFields('hidden,name,images,brand')).toEqual(['name', 'brand', 'images', 'hidden']);
  });

  it('tartib va to\'plam doim bir xil satr beradi', () => {
    expect(serializeManualFields(['specs', 'price'])).toBe('price,specs');
    expect(serializeManualFields(['price', 'price'])).toBe('price');
    expect(serializeManualFields(['nom'])).toBe('');
    expect(serializeManualFields(null)).toBe('');
  });
});

describe('billzUpdateColumns — sinxronizatsiya nimani yozadi', () => {
  const m: import('./billz').MappedProduct = {
    billzId: 'a', name: 'iPhone 17 Pro Sim/E-sim / Silver', slug: 's', categoryId: 'apple', type: 'iphone',
    brandId: 'apple', newBrand: null, cashPriceUzs: 100, oldPriceUzs: 120, stock: 2, description: 'd',
    specs: [], photos: [{ url: 'https://cdn/a.jpg', key: 'products/billz-a.jpg' }], imageUrl: '/a.webp', gallery: [], isActive: true,
  };
  const cols = (locks: import('./billz').ManualField[]) => billzUpdateColumns(m, locks).cols;

  it("qulf yo'q — hamma Billz ustuni yoziladi", () => {
    expect(cols([])).toEqual([
      'billz_name=?', 'billz_stock=?', 'is_active=?', 'name=?', 'brand_id=?', 'image_url=?',
      'category_id=?', 'type=?', 'cash_price_uzs=?', 'old_price_uzs=?', 'description=?',
    ]);
  });

  it("qulflangan guruh butunlay chiqariladi, Billz nomi, qoldiq va ko'rinish doim yoziladi", () => {
    expect(cols(['name', 'brand', 'images', 'category', 'price', 'description', 'hidden', 'specs'])).toEqual([
      'billz_name=?', 'billz_stock=?', 'is_active=?',
    ]);
  });

  it("Billz rasmi ishlatilmasa (`syncTarget` photos'ni bo'shatgan) image_url yozilmaydi — run davomida yuklangan rasm o'chmaydi", () => {
    // `execute` qatorni run boshida o'qiydi; egasi shu orada /yuklash orqali rasm qo'ysa, eski «''» uning ustiga yozilardi.
    const kept = syncTarget({ ...m, photos: [] }, '', [], new Set());
    expect(billzUpdateColumns(kept, []).cols).not.toContain('image_url=?');
    expect(billzUpdateColumns({ ...m, photos: [] }, []).cols).not.toContain('image_url=?');
  });

  it("qiymatlar ustunlar bilan bir tartibda", () => {
    const r = billzUpdateColumns(m, ['images', 'category', 'price', 'description']);
    expect(r.cols).toEqual(['billz_name=?', 'billz_stock=?', 'is_active=?', 'name=?', 'brand_id=?']);
    expect(r.vals).toEqual(['iPhone 17 Pro Sim/E-sim / Silver', 2, 1, 'iPhone 17 Pro Sim/E-sim / Silver', 'apple']);
  });
});
