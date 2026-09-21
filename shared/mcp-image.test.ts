import { describe, it, expect } from 'vitest';
import { isSafeImageUrl, tooLarge } from './mcp-image.ts';

describe('isSafeImageUrl', () => {
  it('oddiy https havolani qabul qiladi', () => {
    const r = isSafeImageUrl('https://store.storeimages.cdn-apple.com/is/x?wid=2000');
    expect(r.ok).toBe(true);
  });

  it('http va boshqa sxemalarni rad etadi', () => {
    expect(isSafeImageUrl('http://example.com/a.jpg').ok).toBe(false);
    expect(isSafeImageUrl('file:///etc/passwd').ok).toBe(false);
    expect(isSafeImageUrl('data:image/png;base64,AAA').ok).toBe(false);
  });

  it("ichki manzillarni rad etadi (server nomidan so'rov yuborilmasin)", () => {
    for (const u of [
      'https://localhost/a.jpg',
      'https://127.0.0.1/a.jpg',
      'https://10.0.0.5/a.jpg',
      'https://192.168.1.1/a.jpg',
      'https://172.16.0.1/a.jpg',
      'https://172.31.255.254/a.jpg',
      'https://169.254.169.254/latest/meta-data',
      'https://[::1]/a.jpg',
      'https://db.internal/a.jpg',
    ]) {
      expect(isSafeImageUrl(u), u).toMatchObject({ ok: false });
    }
  });

  it('ochiq IP va 172.32 ichki emas', () => {
    expect(isSafeImageUrl('https://8.8.8.8/a.jpg').ok).toBe(true);
    expect(isSafeImageUrl('https://172.32.0.1/a.jpg').ok).toBe(true);
  });

  it("buzuq havolani yiqilmasdan rad etadi", () => {
    expect(isSafeImageUrl('salom').ok).toBe(false);
  });
});

describe('tooLarge', () => {
  it("content-length chegaradan katta bo'lsa rost", () => {
    expect(tooLarge('6000000', 5 * 1024 * 1024)).toBe(true);
    expect(tooLarge('1000', 5 * 1024 * 1024)).toBe(false);
  });
  it("sarlavha yo'q yoki raqam emas — yolg'on (keyin bayt bo'yicha tekshiriladi)", () => {
    expect(tooLarge(null, 100)).toBe(false);
    expect(tooLarge('chunked', 100)).toBe(false);
  });
});
