import { describe, expect, it } from 'vitest';
import { classifyVisit, tashkentDay, visitorKey } from './visits';

const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1';
const HTML = 'text/html,application/xhtml+xml,*/*;q=0.8';
const page = (path: string, extra: Partial<{ method: string; accept: string; userAgent: string }> = {}) =>
  classifyVisit({ method: 'GET', path, accept: HTML, userAgent: UA, ...extra });

describe('tashkentDay — Toshkent sanasi (UTC+5)', () => {
  it("UTC 19:00 dan keyin Toshkentda ertangi kun", () => {
    expect(tashkentDay(Date.parse('2026-11-18T18:59:59Z'))).toBe('2026-11-18');
    expect(tashkentDay(Date.parse('2026-11-18T19:00:00Z'))).toBe('2026-11-19');
  });
  it('yil chegarasi', () => {
    expect(tashkentDay(Date.parse('2026-12-31T20:00:00Z'))).toBe('2027-01-01');
  });
});

describe("classifyVisit — faqat storefront sahifasining ko'rilishi", () => {
  it('HTML sahifa sanaladi, query kesiladi', () => {
    expect(page('/')).toEqual({ productId: null });
    expect(page('/katalog?brand=apple&page=2')).toEqual({ productId: null });
    expect(page('/ru/category/apple/')).toEqual({ productId: null });
  });

  it('klient navigatsiyasi (.data) Accept talab qilmaydi', () => {
    expect(page('/katalog.data', { accept: '*/*' })).toEqual({ productId: null });
    expect(page('/_root.data?_routes=routes%2Fhome', { accept: '*/*' })).toEqual({ productId: null });
  });

  it("HTML so'ramagan oddiy so'rov sanalmaydi", () => {
    expect(page('/katalog', { accept: '*/*' })).toBeNull();
    expect(page('/katalog', { accept: '' })).toBeNull();
  });

  it('faqat GET', () => {
    expect(page('/katalog', { method: 'POST' })).toBeNull();
    expect(page('/katalog', { method: 'HEAD' })).toBeNull();
  });

  it("xizmat yo'llari sanalmaydi", () => {
    for (const p of [
      '/admin', '/admin/orders', '/api/order', '/auth/google', '/images/products/a.webp', '/assets/x.js',
      '/mcp', '/oauth/consent', '/yuklash/abc', '/.well-known/oauth-authorization-server', '/health',
      '/node_modules/.vite/deps/react.js', '/@vite/client', '/@fs/Users/x', '/src/store/Header.tsx', '/app/root.tsx',
      '/Admin', '/admin.data',
    ]) {
      expect(page(p), p).toBeNull();
    }
  });

  it("fayllar sanalmaydi (.data dan tashqari kengaytma)", () => {
    for (const p of ['/sitemap.xml', '/robots.txt', '/favicon.ico', '/products/iphone.webp', '/og.png', '/x.css']) {
      expect(page(p), p).toBeNull();
    }
  });

  it("botlar va bo'sh UA sanalmaydi", () => {
    for (const ua of [
      '', 'Googlebot/2.1', 'Mozilla/5.0 (compatible; YandexBot/3.0)', 'TelegramBot (like TwitterBot)', 'curl/8.4.0',
      'python-requests/2.31', 'Mozilla/5.0 HeadlessChrome/120', 'facebookexternalhit/1.1', 'Chrome-Lighthouse',
      'UptimeRobot/2.0', 'Wget/1.21', 'WhatsApp/2.23.20.0 A', 'axios/1.7.2', 'GoogleOther',
    ]) {
      expect(page('/katalog', { userAgent: ua }), ua).toBeNull();
    }
  });

  it('mahsulot sahifasi — id dekodlanadi, /ru prefiksi olib tashlanadi', () => {
    expect(page('/product/iphone-15-used')).toEqual({ productId: 'iphone-15-used' });
    expect(page('/ru/product/abc%20def')).toEqual({ productId: 'abc def' });
    expect(page('/product/0b7e.data', { accept: '*/*' })).toEqual({ productId: '0b7e' });
    expect(page('/product/macbook-air-13.6')).toEqual({ productId: 'macbook-air-13.6' });
  });

  it("mahsulot bo'lmagan ichki yo'l productId bermaydi", () => {
    expect(page('/product')).toEqual({ productId: null });
    expect(page('/product/a/b')).toEqual({ productId: null });
    expect(page('/ru')).toEqual({ productId: null });
  });

  it("buzilgan foiz kodlash — sanalmaydi", () => {
    expect(page('/product/%E0%A4%A')).toBeNull();
  });
});

describe('visitorKey', () => {
  it('barqaror va kun/IP/UA ga bog\'liq', () => {
    const k = visitorKey('2026-11-19', '1.2.3.4', UA);
    expect(k).toBe(visitorKey('2026-11-19', '1.2.3.4', UA));
    expect(k).not.toBe(visitorKey('2026-11-20', '1.2.3.4', UA));
    expect(k).not.toBe(visitorKey('2026-11-19', '1.2.3.5', UA));
    expect(k).not.toBe(visitorKey('2026-11-19', '1.2.3.4', `${UA} x`));
    expect(k.length).toBeLessThanOrEqual(7);
  });
});
