import { describe, expect, it } from 'vitest';
import type { ApiPcPart } from '../../../shared/types';
import type { PcDimension } from '../../../shared/pc-compat';
import { acceptSuggestions, addValue, assignValues, dimToForm, dimsForSlot, filterParts, isUntagged, toggleValue } from './pc-parts';

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

describe('assignValues / toggleValue', () => {
  it("faqat tur bo'g'iniga tegishli qismlar", () => {
    expect(assignValues([part({ id: 'a' }), part({ id: 'k', slot: 'case' })], SOCKET, [12])).toEqual([{ productId: 'a', dimensionId: 1, valueIds: [12] }]);
    expect(assignValues([part({ id: 'a' })], SOCKET, [])).toEqual([{ productId: 'a', dimensionId: 1, valueIds: [] }]);
  });
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
});
