import { lookup as dnsLookup, type LookupAddress } from 'node:dns';
import https from 'node:https';
import { isIP, type LookupFunction } from 'node:net';

/**
 * `image_upload_from_url` uchun havola tekshiruvi.
 *
 * Remote transportda rasmni **server** yuklab oladi, ya'ni tokeni bor odam server
 * nomidan so'rov yubora oladi. Shuning uchun https majburiy va ichki manzillar
 * rad etiladi (bulut metadata endpoint'i — `169.254.169.254` — eng muhimi).
 *
 * Ikki qatlam: `isSafeImageUrl` havoladagi nom/IP'ni tekshiradi, `safeLookup` esa
 * ulanish paytida DNS javobidagi **hamma** manzilni — socket aynan tekshirilgan
 * manzilga ulanadi, shuning uchun ichki IP'ga ishora qiluvchi ommaviy domen va
 * DNS rebinding ham to'xtaydi.
 */

function v4Parts(ip: string): number[] | null {
  const p = ip.split('.').map(Number);
  return p.length === 4 && p.every((n) => Number.isInteger(n) && n >= 0 && n <= 255) ? p : null;
}

/** IANA maxsus IPv4 qatorlari: ichki, loopback, link-local, CGNAT, hujjat, multicast, rezerv. */
function blockedV4([a, b, c]: number[]): boolean {
  return a === 0 || a === 10 || a === 127 || a >= 224
    || (a === 100 && b >= 64 && b < 128)
    || (a === 169 && b === 254)
    || (a === 172 && b >= 16 && b < 32)
    || (a === 192 && b === 168)
    || (a === 192 && b === 0 && (c === 0 || c === 2))
    || (a === 198 && (b === 18 || b === 19))
    || (a === 198 && b === 51 && c === 100)
    || (a === 203 && b === 0 && c === 113);
}

/** IPv6 → 8 ta 16-bitli guruh (`isIP` bilan tekshirilgan qator uchun). */
function hextets(ip: string): number[] | null {
  let s = ip.split('%')[0];
  const last = s.lastIndexOf(':');
  if (s.includes('.')) {
    const v4 = v4Parts(s.slice(last + 1));
    if (!v4) return null;
    s = `${s.slice(0, last + 1)}${((v4[0] << 8) | v4[1]).toString(16)}:${((v4[2] << 8) | v4[3]).toString(16)}`;
  }
  const halves = s.split('::');
  const parse = (x: string) => (x === '' ? [] : x.split(':').map((h) => parseInt(h, 16)));
  const head = parse(halves[0]);
  const tail = halves.length === 2 ? parse(halves[1]) : [];
  const all = halves.length === 2 ? [...head, ...new Array<number>(8 - head.length - tail.length).fill(0), ...tail] : head;
  return all.length === 8 && all.every((n) => Number.isInteger(n) && n >= 0 && n <= 0xffff) ? all : null;
}

function blockedV6(h: number[]): boolean {
  const embedded = [h[6] >> 8, h[6] & 0xff, h[7] >> 8, h[7] & 0xff];
  const zeros = (from: number, to: number) => h.slice(from, to).every((n) => n === 0);
  if (zeros(0, 5) && h[5] === 0xffff) return blockedV4(embedded); // ::ffff:a.b.c.d
  if (zeros(0, 6)) return blockedV4(embedded); // ::, ::1, eskirgan ::a.b.c.d
  if (h[0] === 0x64 && h[1] === 0xff9b && zeros(2, 6)) return blockedV4(embedded); // NAT64
  if (h[0] === 0x2002) return blockedV4([h[1] >> 8, h[1] & 0xff, h[2] >> 8, h[2] & 0xff]); // 6to4
  return h[0] >= 0xfc00 // ULA fc00::/7, link-local fe80::/10, site-local, multicast ff00::/8
    || (h[0] === 0x2001 && (h[1] === 0 || h[1] === 0xdb8)) // Teredo, hujjat
    || (h[0] === 0x100 && zeros(1, 4)); // discard 100::/64
}

function isPrivateHost(host: string): boolean {
  const h = host.toLowerCase().replace(/^\[|\]$/g, '');
  const v = isIP(h);
  if (v === 4) return blockedV4(v4Parts(h) ?? [0]);
  if (v === 6) {
    const x = hextets(h);
    return x === null || blockedV6(x);
  }
  // Sodda hostnamlar.
  if (h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.local') || h.endsWith('.internal')) return true;
  // Nuqtasiz nomlar — ichki tarmoqdagi mashina nomi (`db`, `redis`).
  return !h.includes('.');
}

type Resolve = (host: string, cb: (err: NodeJS.ErrnoException | null, addresses: LookupAddress[]) => void) => void;

/**
 * Socket'ning `lookup`i: nomni yechadi va manzillardan **birortasi** ichki bo'lsa rad
 * etadi. `resolve` — testda DNS o'rniga stub.
 */
export function makeSafeLookup(resolve: Resolve): LookupFunction {
  return (hostname, options, callback) => {
    resolve(hostname, (err, list) => {
      if (err) return callback(err, '', 0);
      if (list.length === 0 || list.some((a) => isPrivateHost(a.address))) {
        return callback(new Error(`Ichki manzilga ruxsat yo'q: ${hostname}`), '', 0);
      }
      if (options.all) callback(null, list);
      else callback(null, list[0].address, list[0].family);
    });
  };
}

export const safeLookup = makeSafeLookup((host, cb) => dnsLookup(host, { all: true }, cb));

export function isSafeImageUrl(raw: string): { ok: true; url: URL } | { ok: false; reason: string } {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { ok: false, reason: `Havola noto'g'ri: ${raw}` };
  }
  if (url.protocol !== 'https:') return { ok: false, reason: `Faqat https: ${raw}` };
  if (isPrivateHost(url.hostname)) return { ok: false, reason: `Ichki manzilga ruxsat yo'q: ${url.hostname}` };
  return { ok: true, url };
}

/** `content-length` bo'yicha oldindan rad etish — 5 MB dan katta javob umuman buferlanmaydi. */
export function tooLarge(contentLength: string | null, max: number): boolean {
  const n = Number(contentLength);
  return Number.isFinite(n) && n > max;
}

/**
 * Rasmni yuklab oladi: faqat `safeLookup` tasdiqlagan manzilga ulanadi, redirektga
 * ergashmaydi (3xx — xato), javobni oqim bo'yicha `max` baytda kesadi, vaqt chegarasi bor.
 */
export function fetchImage(url: URL, max: number, lookup: LookupFunction = safeLookup): Promise<{ type: string; bytes: Uint8Array }> {
  const label = url.href;
  return new Promise((resolve, reject) => {
    const req = https.get(url, { lookup, timeout: 10_000, signal: AbortSignal.timeout(30_000) }, (res) => {
      const fail = (msg: string) => {
        reject(new Error(msg));
        req.destroy();
      };
      const status = res.statusCode ?? 0;
      const type = String(res.headers['content-type'] ?? '');
      if (status < 200 || status >= 300) return fail(`Rasm yuklanmadi (${status}): ${label}`);
      if (!type.startsWith('image/')) return fail(`Bu rasm emas (${type}): ${label}`);
      if (tooLarge(res.headers['content-length'] ?? null, max)) return fail(`5 MB dan katta: ${label}`);
      const chunks: Buffer[] = [];
      let size = 0;
      res.on('data', (c: Buffer) => {
        size += c.length;
        if (size > max) fail(`5 MB dan katta: ${label}`);
        else chunks.push(c);
      });
      res.on('end', () => resolve({ type, bytes: new Uint8Array(Buffer.concat(chunks)) }));
      res.on('error', reject);
    });
    req.on('timeout', () => req.destroy(new Error(`Vaqt tugadi: ${label}`)));
    req.on('error', reject);
  });
}
