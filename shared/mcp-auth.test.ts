import { describe, it, expect } from 'vitest';
import { hashToken, newToken, tokenFromHeader } from './mcp-auth';

describe('newToken', () => {
  it("`prod_` prefiksi va 64 hex belgi, har chaqiruvda boshqacha", () => {
    const a = newToken();
    expect(a).toMatch(/^prod_[0-9a-f]{64}$/);
    expect(a).not.toBe(newToken());
  });
});

describe('hashToken', () => {
  it('bir xil token — bir xil hash; bitta belgi farq qilsa — boshqa hash', async () => {
    const h = await hashToken('prod_abc');
    expect(h).toMatch(/^[0-9a-f]{64}$/);
    expect(await hashToken('prod_abc')).toBe(h);
    expect(await hashToken('prod_abd')).not.toBe(h);
  });
});

describe('tokenFromHeader', () => {
  it("faqat `Bearer prod_…` qabul qilinadi", () => {
    expect(tokenFromHeader('Bearer prod_x')).toBe('prod_x');
    expect(tokenFromHeader('bearer prod_x')).toBe('prod_x');
    expect(tokenFromHeader('  Bearer   prod_x  ')).toBe('prod_x');
  });

  it("boshqa sxema, boshqa prefiks va bo'sh qiymat — `null` (cookie yo'liga tushadi)", () => {
    expect(tokenFromHeader('Bearer boshqa')).toBe(null);
    expect(tokenFromHeader('Basic prod_x')).toBe(null);
    expect(tokenFromHeader('')).toBe(null);
    expect(tokenFromHeader(null)).toBe(null);
  });
});
