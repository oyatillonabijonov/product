import { describe, expect, it } from 'vitest';
import { phoneFromDisplay } from './phone';

describe('phoneFromDisplay', () => {
  it("ko'rinishdagi belgilarni tashlab, oldiga + qo'yadi", () => {
    expect(phoneFromDisplay('+998 (90) 123-45-67')).toBe('+998901234567');
    expect(phoneFromDisplay('90 123 45 67')).toBe('+901234567');
  });
  it("raqam bo'lmasa bo'sh qaytaradi", () => {
    expect(phoneFromDisplay('')).toBe('');
    expect(phoneFromDisplay('aloqa')).toBe('');
  });
});
