import { describe, it, expect } from 'vitest';
import { moveItem } from './reorder';

describe('moveItem', () => {
  it('elementni oldinga ko\'chiradi', () => {
    expect(moveItem(['a', 'b', 'c', 'd'], 0, 2)).toEqual(['b', 'c', 'a', 'd']);
  });

  it('elementni orqaga ko\'chiradi', () => {
    expect(moveItem(['a', 'b', 'c', 'd'], 3, 1)).toEqual(['a', 'd', 'b', 'c']);
  });

  it('from === to bo\'lsa o\'zgarmaydi, lekin yangi massiv qaytaradi', () => {
    const arr = ['a', 'b', 'c'];
    const out = moveItem(arr, 1, 1);
    expect(out).toEqual(['a', 'b', 'c']);
    expect(out).not.toBe(arr);
  });

  it('chegaradan tashqari indeks → xavfsiz no-op nusxa', () => {
    const arr = ['a', 'b', 'c'];
    expect(moveItem(arr, -1, 1)).toEqual(['a', 'b', 'c']);
    expect(moveItem(arr, 1, 5)).toEqual(['a', 'b', 'c']);
    expect(moveItem(arr, 5, 0)).toEqual(['a', 'b', 'c']);
  });
});
