import { describe, expect, it } from 'vitest';
import type { ApiPcPart } from '../../../shared/types';
import type { PcDimension } from '../../../shared/pc-compat';
import { acceptSuggestions, addValue, chunk, dimToForm, dimsForSlot, filterParts, isUntagged, listText, lowerFirst, needsManual, partSummary, toggleValue } from './pc-parts';

const SOCKET: PcDimension = { id: 1, key: 'socket', name: 'Soket', nameRu: '', slots: ['cpu', 'mb'], active: true, values: [{ id: 12, label: 'AM5' }, { id: 14, label: 'LGA1700' }] };
const MEMORY: PcDimension = { id: 2, key: 'memory', name: 'Xotira turi', nameRu: '', slots: ['cpu', 'mb', 'ram'], active: true, values: [{ id: 21, label: 'DDR4' }, { id: 22, label: 'DDR5' }] };
const FORM: PcDimension = { id: 3, key: null, name: 'Form-faktor', nameRu: '', slots: ['mb', 'case'], active: false, values: [{ id: 31, label: 'ATX' }] };
const DIMS = [SOCKET, MEMORY, FORM];
const part = (o: Partial<ApiPcPart>): ApiPcPart => ({ id: 'p', ids: ['p'], slot: 'cpu', name: 'AMD Ryzen 7 9800X3D', image: '', inStock: true, values: {}, suggested: {}, ...o });

describe('dimsForSlot / isUntagged', () => {
  it("bo'g'inga tegishli turlar (nofaollari ham)", () => {
    expect(dimsForSlot('mb', DIMS).map((d) => d.id)).toEqual([1, 2, 3]);
    expect(dimsForSlot('gpu', DIMS)).toEqual([]);
  });
  it('biror turda qiymat yo\'q → belgilanmagan', () => {
    expect(isUntagged(part({ values: { 1: [12], 2: [22] } }), DIMS)).toBe(false);
    expect(isUntagged(part({ values: { 1: [12] } }), DIMS)).toBe(true);
    expect(isUntagged(part({ slot: 'mb', values: { 1: [12], 2: [22] } }), DIMS)).toBe(true);
  });
});

describe('filterParts', () => {
  const list = [
    part({ id: 'a', name: 'AMD Ryzen 7 9800X3D', values: { 1: [12], 2: [22] } }),
    part({ id: 'b', name: 'Intel Core i5 14400F' }),
  ];
  it('holat filtri va ko\'p so\'zli qidiruv', () => {
    expect(filterParts(list, DIMS, 'all', '').map((p) => p.id)).toEqual(['a', 'b']);
    expect(filterParts(list, DIMS, 'untagged', '').map((p) => p.id)).toEqual(['b']);
    expect(filterParts(list, DIMS, 'tagged', '').map((p) => p.id)).toEqual(['a']);
    expect(filterParts(list, DIMS, 'all', '14400 i5').map((p) => p.id)).toEqual(['b']);
  });
});

describe('acceptSuggestions', () => {
  it("faqat qiymati yo'q turlarga taklif yoziladi; taklifsiz qism skipped", () => {
    const res = acceptSuggestions([
      part({ id: 'a', suggested: { 1: [12], 2: [22] } }),
      part({ id: 'b', values: { 1: [14] }, suggested: { 1: [12], 2: [21, 22] } }),
      part({ id: 'c', suggested: { 1: [14] } }),
      part({ id: 'd', values: { 1: [12], 2: [22] }, suggested: { 1: [12], 2: [22] } }),
    ], DIMS);
    expect(res.items).toEqual([
      { productId: 'a', dimensionId: 1, valueIds: [12] },
      { productId: 'a', dimensionId: 2, valueIds: [22] },
      { productId: 'b', dimensionId: 2, valueIds: [21, 22] },
      { productId: 'c', dimensionId: 1, valueIds: [14] },
    ]);
    expect(res.confirmed).toBe(3);
    expect(res.skipped).toBe(1);
  });
});

describe('needsManual', () => {
  it("biror turda na qiymat, na taklif bo'lsa — qo'lda tanlash kerak", () => {
    expect(needsManual(part({ suggested: { 1: [12], 2: [22] } }), DIMS)).toBe(false);
    expect(needsManual(part({ values: { 1: [12] }, suggested: { 2: [22] } }), DIMS)).toBe(false);
    expect(needsManual(part({ suggested: { 1: [12] } }), DIMS)).toBe(true);
    expect(needsManual(part({ slot: 'mb', values: { 1: [12], 2: [22] } }), DIMS)).toBe(true);
    expect(needsManual(part({ slot: 'gpu' }), DIMS)).toBe(false);
  });
});

describe('partSummary', () => {
  it("tasdiqlangan qiymatlar tur tartibida, bir turdagi bir nechtasi ' / ' bilan", () => {
    expect(partSummary(part({ values: { 1: [12], 2: [21, 22] } }), DIMS)).toBe('AM5 · DDR4 / DDR5');
    expect(partSummary(part({ values: { 2: [22] } }), DIMS)).toBe('DDR5');
    expect(partSummary(part({}), DIMS)).toBe('');
  });
});

describe('chunk', () => {
  it("ro'yxatni berilgan o'lchamdagi bo'laklarga ajratadi", () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(chunk([1, 2], 500)).toEqual([[1, 2]]);
    expect(chunk([], 500)).toEqual([]);
  });
});

describe('toggleValue', () => {
  it("chip: qo'shadi yoki olib tashlaydi", () => {
    expect(toggleValue([12], 14)).toEqual([12, 14]);
    expect(toggleValue([12, 14], 12)).toEqual([14]);
  });
});

describe('dimToForm / addValue', () => {
  it("tahrir formasi: mavjud tur yoki bo'sh yangi tur", () => {
    expect(dimToForm({ ...FORM, missing: 4 })).toEqual({ name: 'Form-faktor', nameRu: '', slots: ['mb', 'case'], active: false, values: [{ id: 31, label: 'ATX' }] });
    expect(dimToForm(null)).toEqual({ name: '', nameRu: '', slots: [], active: false, values: [] });
  });
  it("qiymat qo'shish: probel kesiladi, bo'sh va katta-kichik harfsiz takror e'tiborsiz", () => {
    const vals = [{ id: 31, label: 'ATX' }];
    expect(addValue(vals, ' mATX ')).toEqual([{ id: 31, label: 'ATX' }, { id: null, label: 'mATX' }]);
    expect(addValue(vals, 'atx')).toBe(vals);
    expect(addValue(vals, '  ')).toBe(vals);
  });
  it("vergul bilan bir nechta qiymat bir yo'la qo'shiladi", () => {
    expect(addValue([{ id: 31, label: 'ATX' }], 'mATX, atx, ITX,')).toEqual([{ id: 31, label: 'ATX' }, { id: null, label: 'mATX' }, { id: null, label: 'ITX' }]);
  });
});

describe('lowerFirst / listText', () => {
  it("jumla uchun: bosh harf kichrayadi, qisqartma qoladi; ro'yxat til bo'yicha", () => {
    expect(['Ona plata', 'Korpus', 'SSD disk'].map(lowerFirst)).toEqual(['ona plata', 'korpus', 'SSD disk']);
    expect(listText(['protsessor', 'ona plata'], 'va')).toBe('protsessor va ona plata');
    expect(listText(['ATX', 'mATX', 'ITX'], 'yoki')).toBe('ATX, mATX yoki ITX');
    expect(listText(['ATX'], 'yoki')).toBe('ATX');
  });
});
