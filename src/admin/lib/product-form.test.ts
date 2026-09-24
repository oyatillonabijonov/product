import { describe, it, expect } from 'vitest';
import type { AdminProductDetail } from '../api';
import { withHiddenLock } from '../../../shared/billz';
import { EMPTY_FORM, addAxisValue, detailToForm, formToPayload, setAxisValues, toggleAxisValue, validateForm, variantLabel, formLocks, revertField } from './product-form';
import { i18n } from '../i18n';

const tUz = i18n.getFixedT('uz', 'products');

function detail(over: Partial<AdminProductDetail> = {}): AdminProductDetail {
  return {
    id: 'p1', name: 'iPhone 17', condition: 'yangi', conditionNote: null, cashPriceUzs: 1000,
    imageUrl: '/images/products/main.webp', sortOrder: 0, isActive: true, categoryId: 'apple', type: 'iphone',
    oldPriceUzs: null, brandId: 'apple', slug: 'iphone-17', minPriceUzs: 900, ratingAvg: null, reviewCount: 0, preorder: false,
    pcHidden: false, pcSocket: null, pcMemory: null, pcWatts: null,
    billzId: null, billzStock: null, manualFields: [], description: null, brand: null,
    images: ['/images/products/main.webp', '/images/products/g1.webp'],
    specs: [{ label: 'Chip', value: 'A19' }],
    options: [{ id: 'o1', name: 'Xotira', sortOrder: 0, values: [{ id: 'v1', value: '128GB', sortOrder: 0 }, { id: 'v2', value: '256GB', sortOrder: 1 }] }],
    variants: [
      { id: 'var1', sku: null, cashPriceUzs: 900, oldPriceUzs: null, imageUrl: null, inStock: true, sortOrder: 0, optionValueIds: ['v1'] },
      { id: 'var2', sku: null, cashPriceUzs: 1100, oldPriceUzs: null, imageUrl: null, inStock: true, sortOrder: 1, optionValueIds: ['v2', 'missing'] },
    ],
    ...over,
  };
}

describe('detailToForm', () => {
  it("galereya asosiy rasmsiz; variant qiymatlari nomga o'giriladi, noma'lum id tushib qoladi; null → bo'sh", () => {
    const f = detailToForm(detail());
    expect(f.images).toEqual(['/images/products/g1.webp']);
    expect(f.options).toEqual([{ name: 'Xotira', values: ['128GB', '256GB'] }]);
    expect(f.variants[1].optionValues).toEqual([{ optionName: 'Xotira', value: '256GB' }]);
    expect(f.oldPriceUzs).toBe(0);
    expect(f.description).toBe('');
    expect(f.billzId).toBeNull();
  });
  it('Billz tovari: billzId va qoldiq saqlanadi', () => {
    const f = detailToForm(detail({ billzId: 'uuid', billzStock: 4 }));
    expect(f.billzId).toBe('uuid');
    expect(f.billzStock).toBe(4);
  });
});

describe('formToPayload', () => {
  it("naqd narx 0 bo'lsa eng arzon narxlangan variant; narxsiz variant va bo'sh xususiyat tushib qoladi; bo'shlar null", () => {
    const f = {
      ...EMPTY_FORM, name: 'X',
      options: [{ name: 'Rang', values: ['Qora', 'Oq'] }],
      variants: [
        { cashPriceUzs: 500, inStock: true, optionValues: [{ optionName: 'Rang', value: 'Qora' }] },
        { cashPriceUzs: 0, inStock: true, optionValues: [{ optionName: 'Rang', value: 'Oq' }] },
      ],
      specs: [{ label: 'A', value: '1' }, { label: '', value: '2' }],
    };
    const p = formToPayload(f);
    expect(p.cashPriceUzs).toBe(500);
    expect(p.variants).toHaveLength(1);
    expect(p.specs).toEqual([{ label: 'A', value: '1' }]);
    expect(p.oldPriceUzs).toBeNull();
    expect(p.description).toBeNull();
    expect(p.ratingAvg).toBeNull();
    expect(p.slug).toBeNull();
  });
});

describe('validateForm', () => {
  it('nom, narx va variant narxi qoidalari', () => {
    expect(validateForm(EMPTY_FORM, tUz)).toMatch(/nomini/);
    expect(validateForm({ ...EMPTY_FORM, name: 'X' }, tUz)).toMatch(/narx/i);
    const withOpt = { ...EMPTY_FORM, name: 'X', cashPriceUzs: 100, options: [{ name: 'Rang', values: ['Qora'] }], variants: [{ cashPriceUzs: 0, inStock: true, optionValues: [{ optionName: 'Rang', value: 'Qora' }] }] };
    expect(validateForm(withOpt, tUz)).toMatch(/Variant/);
    expect(validateForm({ ...EMPTY_FORM, name: 'X', cashPriceUzs: 100 }, tUz)).toBeNull();
  });
});

describe('setAxisValues / toggleAxisValue / addAxisValue', () => {
  it("xotira STORAGE_VALUES tartibida; variantlar qayta yasaladi, narx yangi o'lchovga ko'chadi; o'q bo'shasa yo'qoladi", () => {
    let f = toggleAxisValue({ ...EMPTY_FORM, name: 'X' }, 'Xotira', '256GB');
    f = toggleAxisValue(f, 'Xotira', '128GB');
    expect(f.options[0].values).toEqual(['128GB', '256GB']);
    expect(f.variants).toHaveLength(2);
    f = { ...f, variants: f.variants.map((v) => (v.optionValues[0].value === '128GB' ? { ...v, cashPriceUzs: 700 } : v)) };
    f = toggleAxisValue(f, 'Rang', 'Qora');
    expect(f.variants).toHaveLength(2);
    expect(f.variants.find((v) => variantLabel(v) === '128GB · Qora')?.cashPriceUzs).toBe(700);
    expect(addAxisValue(f, 'Rang', ' Qora ')).toBe(f);
    expect(addAxisValue(f, 'Rang', 'Oq').variants).toHaveLength(4);
    expect(setAxisValues(f, 'Rang', []).options).toEqual([{ name: 'Xotira', values: ['128GB', '256GB'] }]);
    expect(toggleAxisValue(toggleAxisValue(f, 'Xotira', '128GB'), 'Xotira', '256GB').options).toEqual([{ name: 'Rang', values: ['Qora'] }]);
  });
});

describe('aylanma (detail → forma → payload)', () => {
  it("tegilmagan mahsulotni saqlash: barcha maydon (slug, reyting, variant sku/eski narx/rasm/qoldiq) o'zgarishsiz qaytadi", () => {
    const d = detail({
      conditionNote: 'Batafsil', oldPriceUzs: 1200, description: 'Tavsif', ratingAvg: 4.5, reviewCount: 3, sortOrder: 7, isActive: false, preorder: true,
      pcHidden: true, pcSocket: 'AM5', pcMemory: 'DDR5', pcWatts: 650,
      variants: [
        { id: 'var1', sku: 'A1', cashPriceUzs: 900, oldPriceUzs: 950, imageUrl: '/images/products/v.webp', inStock: false, sortOrder: 0, optionValueIds: ['v1'] },
        { id: 'var2', sku: null, cashPriceUzs: 1100, oldPriceUzs: null, imageUrl: null, inStock: true, sortOrder: 1, optionValueIds: ['v2', 'missing'] },
      ],
    });
    const p = formToPayload(detailToForm(d));
    expect(p).toEqual({
      name: d.name, categoryId: d.categoryId, type: d.type, condition: d.condition,
      conditionNote: 'Batafsil', cashPriceUzs: d.cashPriceUzs,
      oldPriceUzs: 1200, description: 'Tavsif', imageUrl: d.imageUrl, images: ['/images/products/g1.webp'],
      specs: d.specs, sortOrder: 7, isActive: false, brandId: d.brandId, slug: d.slug,
      ratingAvg: 4.5, reviewCount: 3, preorder: true, manualFields: [],
      pcHidden: true, pcSocket: 'AM5', pcMemory: 'DDR5', pcWatts: 650,
      options: [{ name: 'Xotira', values: ['128GB', '256GB'] }],
      variants: [
        { sku: 'A1', cashPriceUzs: 900, oldPriceUzs: 950, imageUrl: '/images/products/v.webp', inStock: false, optionValues: [{ optionName: 'Xotira', value: '128GB' }] },
        { sku: null, cashPriceUzs: 1100, oldPriceUzs: null, imageUrl: null, inStock: true, optionValues: [{ optionName: 'Xotira', value: '256GB' }] },
      ],
    });
  });
});

describe("Billz qo'l maydonlari", () => {
  it("detail → forma → payload aylanasida saqlanadi", () => {
    const d = detail({ billzId: 'b-1', billzStock: 4, manualFields: ['description', 'price'] });
    const f = detailToForm(d);
    expect(f.manualFields).toEqual(['description', 'price']);
    expect(formToPayload(f).manualFields).toEqual(['description', 'price']);
  });
});

describe('formLocks — saqlashda qo\'yiladigan qulflar', () => {
  const billz = () => detailToForm(detail({ billzId: 'b-1', billzStock: 2, options: [], variants: [], manualFields: [] }));

  it("oddiy tovarda qulf hisoblanmaydi", () => {
    const f = detailToForm(detail());
    expect(formLocks({ ...f, name: 'Boshqa' }, f)).toEqual([]);
  });

  it("yuklanmagan bo'lsa (loaded null) — formadagi qulflar o'z holicha", () => {
    const f = { ...billz(), manualFields: ['price' as const] };
    expect(formLocks(f, null)).toEqual(['price']);
  });

  it("Billz tovarida tahrirlangan maydon qulflanadi", () => {
    const f = billz();
    expect(formLocks({ ...f, name: 'iPhone 17' }, f)).toEqual([]);
    expect(formLocks({ ...f, name: 'iPhone 17 (yangi)' }, f)).toEqual(['name']);
    expect(formLocks({ ...f, brandId: 'samsung', images: [] }, f)).toEqual(['brand', 'images']);
  });

  it("ko'rinishni o'chirish — hidden", () => {
    const f = billz();
    expect(formLocks({ ...f, isActive: false }, f)).toEqual(['hidden']);
  });

  it("allaqachon ko'rinmaydigan (rasmsiz) Billz tovarini ham yashirib qulflash mumkin — switch `manualFields`ni o'zgartiradi", () => {
    const loaded = detailToForm(detail({ billzId: 'b-1', options: [], variants: [], manualFields: [], imageUrl: '', images: [], isActive: false }));
    // Eski yo'l: `isActive` false→false — o'zgarish yo'q, qulf qo'yilmasdi va Billz rasm qo'shganda tovar chiqib ketardi.
    expect(formLocks({ ...loaded, isActive: false }, loaded)).toEqual([]);
    const hidden = { ...loaded, manualFields: withHiddenLock(loaded.manualFields, false) };
    expect(formLocks(hidden, loaded)).toEqual(['hidden']);
    const shown = { ...hidden, manualFields: withHiddenLock(hidden.manualFields, true) };
    expect(formLocks(shown, loaded)).toEqual([]);
    // «Billz'ga qaytarish» — qulf yechiladi, switch yana «ko'rsatilsin» holatida.
    expect(revertField(hidden, loaded, 'hidden').manualFields).not.toContain('hidden');
  });
});

describe('revertField — «Billz\'ga qaytarish»', () => {
  const loaded = detailToForm(detail({ billzId: 'b-1', options: [], variants: [], manualFields: ['name'] }));

  it("qulfni yechadi va shu seansdagi o'zgarishni bekor qiladi", () => {
    const edited = { ...loaded, name: 'Tahrirlangan', description: 'Yangi tavsif' };
    const out = revertField(edited, loaded, 'name');
    expect(out.manualFields).toEqual([]);
    expect(out.name).toBe(loaded.name);
    expect(out.description).toBe('Yangi tavsif'); // boshqa maydonga tegilmaydi
  });

  it('rasmlar guruhi asosiy rasm va galereyani birga qaytaradi', () => {
    const edited = { ...loaded, imageUrl: '/x.webp', images: [] };
    const out = revertField(edited, loaded, 'images');
    expect(out.imageUrl).toBe(loaded.imageUrl);
    expect(out.images).toEqual(loaded.images);
  });

  it("qaytarilgan maydon endi qulf sifatida hisoblanmaydi", () => {
    const edited = { ...loaded, name: 'Tahrirlangan' };
    expect(formLocks(revertField(edited, loaded, 'name'), loaded)).toEqual([]);
  });
});
