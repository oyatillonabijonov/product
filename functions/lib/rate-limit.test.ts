import { describe, it, expect } from 'vitest';
import { createLimiter } from './rate-limit';

describe('createLimiter', () => {
  it('oynada max tagacha ruxsat, keyingisi rad, oyna o\'tgach yana ruxsat', () => {
    const allow = createLimiter(2, 1000);
    expect(allow('ip1', 0)).toBe(true);
    expect(allow('ip1', 10)).toBe(true);
    expect(allow('ip1', 20)).toBe(false);
    expect(allow('ip2', 20)).toBe(true);
    expect(allow('ip1', 1001)).toBe(true);
  });
});
