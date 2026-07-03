import { describe, it, expect } from 'vitest';
import { formatThousands, parseDigits } from './format';

describe('formatThousands', () => {
  it('groups digits by thousands with spaces', () => {
    expect(formatThousands(12000000)).toBe('12 000 000');
    expect(formatThousands(1234)).toBe('1 234');
  });
  it('returns empty string for zero, negative and NaN', () => {
    expect(formatThousands(0)).toBe('');
    expect(formatThousands(-5)).toBe('');
    expect(formatThousands(NaN)).toBe('');
  });
});

describe('parseDigits', () => {
  it('strips non-digit characters and parses', () => {
    expect(parseDigits('12 000 000')).toBe(12000000);
    expect(parseDigits('abc12x3')).toBe(123);
  });
  it('returns 0 for empty/no-digit strings', () => {
    expect(parseDigits('')).toBe(0);
    expect(parseDigits('abc')).toBe(0);
  });
  it('caps huge numbers at MAX_SAFE_INTEGER', () => {
    const huge = '9'.repeat(30);
    expect(parseDigits(huge)).toBe(Number.MAX_SAFE_INTEGER);
  });
});

describe('round-trip', () => {
  it('parseDigits(formatThousands(n)) === n for positive integers', () => {
    for (const n of [1, 42, 1234, 12000000, 999999999]) {
      expect(parseDigits(formatThousands(n))).toBe(n);
    }
  });
});
