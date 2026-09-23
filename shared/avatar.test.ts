import { describe, expect, it } from 'vitest';
import { AVATAR_FACES, AVATAR_TYPES, autoAvatar, isAvatar, parseAvatar, serializeAvatar } from './avatar';

describe('autoAvatar', () => {
  it('bir xil id doim bir xil avatar beradi', () => {
    expect(autoAvatar(42)).toEqual(autoAvatar(42));
  });
  it('har doim ro\'yxatdagi shakl va "eyes" yuzi', () => {
    for (const id of [0, 1, 7, 18, 19, 1000, 999999]) {
      const a = autoAvatar(id);
      expect(AVATAR_TYPES).toContain(a.type);
      expect(a.face).toBe('eyes');
    }
  });
  it('ketma-ket id\'lar bir xil shaklga tushib qolmaydi', () => {
    const first20 = Array.from({ length: 20 }, (_, i) => autoAvatar(i + 1).type);
    expect(new Set(first20).size).toBeGreaterThan(10);
  });
});

describe('parseAvatar', () => {
  it('saqlangan qiymatni o\'qiydi', () => {
    expect(parseAvatar('clover.mouth', 1)).toEqual({ type: 'clover', face: 'mouth' });
  });
  it('yuzsiz yozuvni "eyes" deb oladi', () => {
    expect(parseAvatar('star', 1)).toEqual({ type: 'star', face: 'eyes' });
  });
  it('bo\'sh yoki NULL bo\'lsa id\'dan avtomatik', () => {
    expect(parseAvatar(null, 42)).toEqual(autoAvatar(42));
    expect(parseAvatar('', 42)).toEqual(autoAvatar(42));
  });
  it('yaroqsiz qiymat ham avtomatikka tushadi (baza buzilgan bo\'lsa sahifa yiqilmasin)', () => {
    expect(parseAvatar('yoq-bunday-shakl', 42)).toEqual(autoAvatar(42));
    expect(parseAvatar('clover.qiyshiq', 42)).toEqual(autoAvatar(42));
  });
});

describe('serializeAvatar', () => {
  it('shakl va yuzni birga yozadi', () => {
    expect(serializeAvatar({ type: 'cat', face: 'mouth' })).toBe('cat.mouth');
  });
  it('yozilgan qiymat qaytib o\'qiladi', () => {
    for (const type of AVATAR_TYPES) {
      for (const face of AVATAR_FACES) {
        expect(parseAvatar(serializeAvatar({ type, face }), 1)).toEqual({ type, face });
      }
    }
  });
});

describe('isAvatar', () => {
  it('to\'g\'ri qiymatlarni qabul qiladi', () => {
    expect(isAvatar('clover.eyes')).toBe(true);
    expect(isAvatar('puddle.mouth')).toBe(true);
    expect(isAvatar('star')).toBe(true);
  });
  it('boshqa hamma narsani rad etadi', () => {
    for (const bad of ['', '   ', 'yoq', 'clover.x', 'clover.eyes.x', '<script>', 'CLOVER.EYES']) {
      expect(isAvatar(bad)).toBe(false);
    }
  });
});
