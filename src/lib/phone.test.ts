import { describe, expect, it } from 'vitest';
import { formatUzPhone, isCompleteUzPhone } from './phone';

describe('formatUzPhone', () => {
  it('bo\'sh kiritish prefiksni qaytaradi', () => {
    expect(formatUzPhone('')).toBe('+998');
    expect(formatUzPhone('+998 ')).toBe('+998');
  });

  it('bosqichma-bosqich terishda guruhlab formatlaydi', () => {
    expect(formatUzPhone('+998 9')).toBe('+998 9');
    expect(formatUzPhone('+998 90')).toBe('+998 90');
    expect(formatUzPhone('+998 901')).toBe('+998 90 1');
    expect(formatUzPhone('+998 90123')).toBe('+998 90 123');
    expect(formatUzPhone('+998 9012345')).toBe('+998 90 123-45');
    expect(formatUzPhone('+998 901234567')).toBe('+998 90 123-45-67');
  });

  it('ortiqcha raqamlarni kesadi va harflarni tashlaydi', () => {
    expect(formatUzPhone('+998 90 123-45-67-89')).toBe('+998 90 123-45-67');
    expect(formatUzPhone('+998 ab90cd123ef4567')).toBe('+998 90 123-45-67');
  });

  it('davlat kodi bilan qo\'yilgan (paste) raqamni to\'g\'ri oladi', () => {
    expect(formatUzPhone('998901234567')).toBe('+998 90 123-45-67');
    expect(formatUzPhone('901234567')).toBe('+998 90 123-45-67');
  });

  it('99 operator kodli raqam (mahalliy 998... bilan boshlanadi) buzilmaydi', () => {
    // Input doim "+998 " prefiksli — mahalliy qism "99 812-34-56"
    expect(formatUzPhone('+998 99 812-34-56')).toBe('+998 99 812-34-56');
  });
});

describe('isCompleteUzPhone', () => {
  it('9 raqamli mahalliy qism to\'liq', () => {
    expect(isCompleteUzPhone('+998 90 123-45-67')).toBe(true);
    expect(isCompleteUzPhone('+998 90 123-45-6')).toBe(false);
    expect(isCompleteUzPhone('+998')).toBe(false);
  });
});
