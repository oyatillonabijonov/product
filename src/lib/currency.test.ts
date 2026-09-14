import { describe, expect, it } from 'vitest';
import { formatPrice, formatUsd, fromUzs, parseCurrency, toUzs } from './currency';
import { formatUzs } from './installment';

describe('parseCurrency', () => {
  it("faqat 'USD' — USD, qolgani UZS", () => {
    expect(parseCurrency('USD')).toBe('USD');
    expect(parseCurrency('usd')).toBe('UZS');
    expect(parseCurrency(null)).toBe('UZS');
    expect(parseCurrency(undefined)).toBe('UZS');
  });
});

describe('formatUsd', () => {
  it("$100 dan kichikni sent bilan ko'rsatadi", () => {
    expect(formatUsd(2.9365)).toBe('$2.94');
    expect(formatUsd(49.5)).toBe('$49.50');
  });
  it("kattasini butun dollar, minglar bo'shliq bilan", () => {
    expect(formatUsd(100)).toBe('$100');
    expect(formatUsd(1299.4)).toBe('$1 299');
    expect(formatUsd(1234567.8)).toBe('$1 234 568');
  });
});

describe('formatPrice', () => {
  it("UZS'da formatUzs bilan bir xil", () => {
    expect(formatPrice(22_050_000, 'UZS', 12600, "so'm")).toBe(formatUzs(22_050_000, "so'm"));
  });
  it("USD'da kursga bo'ladi", () => {
    expect(formatPrice(12_600_000, 'USD', 12600, "so'm")).toBe('$1 000');
    expect(formatPrice(37_000, 'USD', 12600, "so'm")).toBe('$2.94');
  });
  it("kurs 0 bo'lsa so'mda qoladi", () => {
    expect(formatPrice(37_000, 'USD', 0, "so'm")).toBe(formatUzs(37_000, "so'm"));
  });
});

describe('fromUzs / toUzs', () => {
  it("USD'da kurs bilan o'giradi, UZS'da o'zgartirmaydi", () => {
    expect(fromUzs(12_600_000, 'USD', 12600)).toBe(1000);
    expect(toUzs(1000, 'USD', 12600)).toBe(12_600_000);
    expect(fromUzs(500_000, 'UZS', 12600)).toBe(500_000);
    expect(toUzs(500_000, 'UZS', 12600)).toBe(500_000);
  });
});
