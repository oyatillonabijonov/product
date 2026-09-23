import { describe, expect, it } from 'vitest';
import { UZ_REGIONS, districtById, regionById } from './uz-regions';

describe('UZ_REGIONS', () => {
  it("14 ta ma'muriy birlik", () => {
    expect(UZ_REGIONS).toHaveLength(14);
  });
  it('viloyat id\'lari takrorlanmaydi', () => {
    expect(new Set(UZ_REGIONS.map((r) => r.id)).size).toBe(UZ_REGIONS.length);
  });
  it("har viloyatda tuman bor va id'lari o'zaro takrorlanmaydi", () => {
    for (const r of UZ_REGIONS) {
      expect(r.districts.length).toBeGreaterThan(0);
      expect(new Set(r.districts.map((d) => d.id)).size).toBe(r.districts.length);
      expect(r.nameRu).not.toBe('');
    }
  });
  it("id'lar URL va bazaga xavfsiz (faqat a-z, 0-9, -)", () => {
    for (const r of UZ_REGIONS) {
      expect(r.id).toMatch(/^[a-z0-9-]+$/);
      for (const d of r.districts) expect(d.id).toMatch(/^[a-z0-9-]+$/);
    }
  });
  it('Toshkent shahrida 12 tuman', () => {
    expect(regionById('toshkent-shahri')?.districts).toHaveLength(12);
  });
});

describe('qidiruv', () => {
  it('mavjud tumanni topadi', () => {
    expect(districtById('toshkent-shahri', 'chilonzor')?.name).toBe('Chilonzor');
  });
  it("yo'q qiymatda undefined", () => {
    expect(regionById('yoq')).toBeUndefined();
    expect(districtById('toshkent-shahri', 'yoq')).toBeUndefined();
    expect(districtById('yoq', 'chilonzor')).toBeUndefined();
  });
});
