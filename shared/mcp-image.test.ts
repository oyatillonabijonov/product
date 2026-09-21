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

  it('IPv4-mapped IPv6 addresses ichki qatorlarni rad etadi', () => {
    // ::ffff:169.254.169.254 normalizes to ::ffff:a9fe:a9fe
    expect(isSafeImageUrl('https://[::ffff:a9fe:a9fe]/a.jpg').ok).toBe(false);
    // ::ffff:127.0.0.1 normalizes to ::ffff:7f00:0001
    expect(isSafeImageUrl('https://[::ffff:7f00:0001]/a.jpg').ok).toBe(false);
    // ::ffff:10.0.0.1 normalizes to ::ffff:0a00:0001
    expect(isSafeImageUrl('https://[::ffff:0a00:0001]/a.jpg').ok).toBe(false);
    // ::ffff:192.168.1.1 normalizes to ::ffff:c0a8:0101
    expect(isSafeImageUrl('https://[::ffff:c0a8:0101]/a.jpg').ok).toBe(false);
  });

  it('link-local IPv6 addresses (fe80::/10) rad etiladi', () => {
    // fe80::1 is link-local
    expect(isSafeImageUrl('https://[fe80::1]/a.jpg').ok).toBe(false);
    // fe90 is in the fe80-febf range (link-local)
    expect(isSafeImageUrl('https://[fe90::1]/a.jpg').ok).toBe(false);
    // febf is the last address in fe80::/10
    expect(isSafeImageUrl('https://[febf::1]/a.jpg').ok).toBe(false);
  });

  it('IPv4-compatible IPv6 addresses (deprecated ::a.b.c.d) ichki qatorlarni rad etadi', () => {
    // ::127.0.0.1 normalizes to ::7f00:1 (loopback-equivalent)
    expect(isSafeImageUrl('https://[::7f00:1]/a.jpg').ok).toBe(false);
    // ::169.254.169.254 normalizes to ::a9fe:a9fe (link-local-equivalent)
    expect(isSafeImageUrl('https://[::a9fe:a9fe]/a.jpg').ok).toBe(false);
  });

  it('ochiq IP va 172.32 ichki emas', () => {
    expect(isSafeImageUrl('https://8.8.8.8/a.jpg').ok).toBe(true);
    expect(isSafeImageUrl('https://172.32.0.1/a.jpg').ok).toBe(true);
  });

  it('ochiq IPv6 manzillari qabul qilinadi', () => {
    // 2606:4700:4700::1111 is Cloudflare's public DNS in IPv6
    expect(isSafeImageUrl('https://[2606:4700:4700::1111]/a.jpg').ok).toBe(true);
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
