import { describe, it, expect } from 'vitest';
import type { LookupAddress } from 'node:dns';
import { fetchImage, isSafeImageUrl, makeSafeLookup, tooLarge } from './mcp-image.ts';

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
    expect(isSafeImageUrl('https://[2001:4860:4860::8888]/a.jpg').ok).toBe(true);
  });

  it('IPv6 unspecified address (::) loopback ekvivalenti rad etiladi', () => {
    // :: connects to loopback on common stacks, should be blocked
    expect(isSafeImageUrl('https://[::]/a.jpg').ok).toBe(false);
  });

  it('CGNAT, 0.0.0.0/8, multicast va boshqa maxsus qatorlarni rad etadi', () => {
    for (const host of ['100.64.0.1', '100.127.255.254', '0.0.0.0', '0.1.2.3', '224.0.0.1', '255.255.255.255', '198.18.0.1', '192.0.0.8']) {
      expect(isSafeImageUrl(`https://${host}/a.jpg`), host).toMatchObject({ ok: false });
    }
    expect(isSafeImageUrl('https://100.128.0.1/a.jpg').ok).toBe(true);
  });

  it('IPv6 ichiga joylangan ichki IPv4 (mapped, ::/96, NAT64, 6to4) va ULA rad etiladi', () => {
    for (const host of ['[::ffff:100.64.0.1]', '[::ffff:0.0.0.1]', '[::2]', '[64:ff9b::a9fe:a9fe]', '[2002:a00:1::]', '[fd00::1]', '[ff02::1]']) {
      expect(isSafeImageUrl(`https://${host}/a.jpg`), host).toMatchObject({ ok: false });
    }
    expect(isSafeImageUrl('https://[::ffff:8.8.8.8]/a.jpg').ok).toBe(true);
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

describe('makeSafeLookup (DNS stub, tarmoqsiz)', () => {
  const run = (addresses: string[], all: boolean) =>
    new Promise<{ err: Error | null; address: string | LookupAddress[]; family?: number }>((resolve) => {
      const lookup = makeSafeLookup((_host, cb) => cb(null, addresses.map((a) => ({ address: a, family: a.includes(':') ? 6 : 4 }))));
      lookup('img.example.com', { all }, (err, address, family) => resolve({ err, address, family }));
    });

  it('ommaviy manzilni socket\'ga beradi (all va bitta rejimda)', async () => {
    expect((await run(['93.184.216.34'], false))).toMatchObject({ err: null, address: '93.184.216.34', family: 4 });
    const r = await run(['93.184.216.34', '2606:2800:220:1::1'], true);
    expect(r.err).toBeNull();
    expect(r.address).toHaveLength(2);
  });

  it('ommaviy domen ichki IP\'ga ishora qilsa (rebinding) rad etadi', async () => {
    for (const a of ['127.0.0.1', '169.254.169.254', '10.1.2.3', '100.64.0.1', '0.0.0.0', '::1', '::ffff:192.168.0.1', 'fe80::1']) {
      expect((await run([a], false)).err, a).toBeInstanceOf(Error);
    }
  });

  it('javobda bitta ichki manzil bo\'lsa ham rad etadi, bo\'sh javob ham xato', async () => {
    expect((await run(['93.184.216.34', '10.0.0.1'], true)).err).toBeInstanceOf(Error);
    expect((await run([], true)).err).toBeInstanceOf(Error);
  });

  it('DNS xatosini o\'zgarishsiz uzatadi', async () => {
    const lookup = makeSafeLookup((_h, cb) => cb(Object.assign(new Error('ENOTFOUND'), { code: 'ENOTFOUND' }), []));
    const err = await new Promise<Error | null>((resolve) => lookup('x.example', {}, (e) => resolve(e)));
    expect(err?.message).toBe('ENOTFOUND');
  });
});

describe('fetchImage', () => {
  it("ichki IP'ga yechilgan nomga ulanmaydi (so'rov lookup'da to'xtaydi)", async () => {
    const lookup = makeSafeLookup((_h, cb) => cb(null, [{ address: '169.254.169.254', family: 4 }]));
    await expect(fetchImage(new URL('https://rebind.example/a.jpg'), 1000, lookup)).rejects.toThrow("Ichki manzilga ruxsat yo'q");
  });
});
