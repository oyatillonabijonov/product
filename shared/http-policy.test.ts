import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, sep } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  IMAGE_KEY_RE, cachePath, canonicalOrigin, hasSessionCookie, isMaintenanceOpen, parseTrustProxy,
  routePath, storefrontCacheControl,
} from './http-policy.ts';
import { pathFor } from '../server/images.ts';

const OPEN = ['/admin', '/api/admin', '/images/', '/yuklash'];
const PUBLIC = 'public, max-age=0, s-maxage=60, stale-while-revalidate=240';

describe('routePath', () => {
  it('React Router kabi normallashtiradi', () => {
    expect(routePath('/admin/../katalog')).toBe('/katalog');
    expect(routePath('/admin/%2e%2e/katalog')).toBe('/katalog');
    expect(routePath('/admin\\..\\katalog')).toBe('/katalog');
    expect(routePath('/kabinet.data?_routes=routes%2Fkabinet')).toBe('/kabinet');
    expect(routePath('/katalog/')).toBe('/katalog');
    expect(routePath('/_root.data')).toBe('/');
    expect(routePath('/')).toBe('/');
  });
  it('yaroqsiz so\'rov — null', () => {
    expect(routePath('*')).toBeNull();
    expect(routePath('http://evil/x')).toBeNull();
  });
});

describe('isMaintenanceOpen', () => {
  it('ochiq yo\'llar', () => {
    expect(isMaintenanceOpen('/admin', OPEN)).toBe(true);
    expect(isMaintenanceOpen('/admin/products/12', OPEN)).toBe(true);
    expect(isMaintenanceOpen('/admin.data', OPEN)).toBe(true);
    expect(isMaintenanceOpen('/api/admin/orders?x=1', OPEN)).toBe(true);
    expect(isMaintenanceOpen('/images/products/a.webp', OPEN)).toBe(true);
    expect(isMaintenanceOpen('/yuklash/tok', OPEN)).toBe(true);
  });
  it('traversal, kodlangan nuqta va segmentsiz prefiks — yopiq', () => {
    expect(isMaintenanceOpen('/admin/../katalog', OPEN)).toBe(false);
    expect(isMaintenanceOpen('/admin/%2e%2e/katalog', OPEN)).toBe(false);
    expect(isMaintenanceOpen('/admin\\..\\katalog', OPEN)).toBe(false);
    expect(isMaintenanceOpen('/api/admin/../order', OPEN)).toBe(false);
    expect(isMaintenanceOpen('/admin%2f..%2fkatalog', OPEN)).toBe(false);
    expect(isMaintenanceOpen('/admin/..%2Fkatalog', OPEN)).toBe(false);
    expect(isMaintenanceOpen('/administrator', OPEN)).toBe(false);
    expect(isMaintenanceOpen('/api/administer', OPEN)).toBe(false);
    expect(isMaintenanceOpen('/imagesx/a', OPEN)).toBe(false);
    expect(isMaintenanceOpen('/katalog', OPEN)).toBe(false);
    expect(isMaintenanceOpen('*', OPEN)).toBe(false);
  });
});

describe('cachePath', () => {
  it('dekodlaydi, kichik harfga o\'tkazadi, .data va / ni kesadi', () => {
    expect(cachePath('/Kabinet')).toBe('/kabinet');
    expect(cachePath('/k%61binet/')).toBe('/kabinet');
    expect(cachePath('/ru/kabinet.data')).toBe('/ru/kabinet');
    expect(cachePath('/%E0%A4%A')).toBeNull();
  });
});

describe('hasSessionCookie', () => {
  it('mijoz va admin sessiyasi', () => {
    expect(hasSessionCookie('customer_session=abc')).toBe(true);
    expect(hasSessionCookie('theme=dark; session=a.b')).toBe(true);
    expect(hasSessionCookie('session=')).toBe(false);
    expect(hasSessionCookie('xsession=a')).toBe(false);
    expect(hasSessionCookie(undefined)).toBe(false);
  });
});

describe('storefrontCacheControl', () => {
  it('oddiy storefront GET — umumiy kesh', () => {
    expect(storefrontCacheControl('GET', '/katalog', undefined)).toBe(PUBLIC);
    expect(storefrontCacheControl('GET', '/ru/category/apple', 'theme=dark')).toBe(PUBLIC);
  });
  it('dinamik yo\'llar har qanday yozilishda — sarlavha yo\'q', () => {
    for (const url of ['/kabinet', '/Kabinet', '/kabinet.data?_routes=routes%2Fkabinet', '/kabinet/', '/ru/kabinet',
      '/Api/addresses', '/API/admin/orders', '/admin', '/ADMIN/x', '/images/products/a.webp', '/auth/google', '/savat']) {
      expect(storefrontCacheControl('GET', url, undefined)).toBeNull();
    }
  });
  it('sessiya yoki USD cookie — shaxsiy', () => {
    expect(storefrontCacheControl('GET', '/', 'customer_session=x.y')).toBe('private, no-store');
    expect(storefrontCacheControl('GET', '/katalog', 'session=x.y')).toBe('private, no-store');
    expect(storefrontCacheControl('GET', '/katalog', 'currency=USD')).toBe('private, no-store');
  });
  it('GET bo\'lmagan va yaroqsiz yo\'l — sarlavha yo\'q', () => {
    expect(storefrontCacheControl('POST', '/katalog', undefined)).toBeNull();
    expect(storefrontCacheControl('GET', '/%zz', undefined)).toBeNull();
  });
});

describe('canonicalOrigin', () => {
  it('PUBLIC_URL → host va sxema', () => {
    expect(canonicalOrigin('https://productstore.uz')).toEqual({ host: 'productstore.uz', proto: 'https' });
    expect(canonicalOrigin(' http://localhost:3000/ ')).toEqual({ host: 'localhost:3000', proto: 'http' });
  });
  it('yo\'q yoki yaroqsiz — null', () => {
    expect(canonicalOrigin(undefined)).toBeNull();
    expect(canonicalOrigin('')).toBeNull();
    expect(canonicalOrigin('not a url')).toBeNull();
    expect(canonicalOrigin('ftp://x.uz')).toBeNull();
  });
});

describe('parseTrustProxy', () => {
  it('sukut 1, false va son', () => {
    expect(parseTrustProxy(undefined)).toBe(1);
    expect(parseTrustProxy('')).toBe(1);
    expect(parseTrustProxy('false')).toBe(false);
    expect(parseTrustProxy('2')).toBe(2);
  });
  it('true va boshqa qiymat — xato', () => {
    expect(() => parseTrustProxy('true')).toThrow();
    expect(() => parseTrustProxy('10.0.0.1')).toThrow();
  });
});

describe('IMAGE_KEY_RE', () => {
  it('ilova yozadigan kalitlar', () => {
    expect(IMAGE_KEY_RE.test('products/1b4e28ba-2fa1-11d2-883f-0016d3cca427.webp')).toBe(true);
    expect(IMAGE_KEY_RE.test('products/billz-1b4e28ba-2fa1-11d2-883f-0016d3cca427.jpeg')).toBe(true);
    expect(IMAGE_KEY_RE.test('products/billz-0a1b2c3d.png')).toBe(true);
    expect(IMAGE_KEY_RE.test('products/1b4e28ba.mp4')).toBe(true);
  });
  it('traversal va begona shakllar', () => {
    expect(IMAGE_KEY_RE.test('products/../x.webp')).toBe(false);
    expect(IMAGE_KEY_RE.test('products/../../images-to-copy.txt')).toBe(false);
    expect(IMAGE_KEY_RE.test('products/a/b.webp')).toBe(false);
    expect(IMAGE_KEY_RE.test('backups/store.webp')).toBe(false);
    expect(IMAGE_KEY_RE.test('products/a.webp.txt')).toBe(false);
    expect(IMAGE_KEY_RE.test('products/.webp')).toBe(false);
  });
});

describe('pathFor', () => {
  const dir = mkdtempSync(join(tmpdir(), 'img-'));
  it('papka ichidagi kalit', () => {
    expect(pathFor(dir, 'products/a.webp')).toBe(`${dir}${sep}products${sep}a.webp`);
  });
  it('papkadan va qo\'shni nomga chiqish — null', () => {
    expect(pathFor(dir, '../x')).toBeNull();
    expect(pathFor(dir, `../${dir.split(sep).pop()}-to-copy.txt`)).toBeNull();
    expect(pathFor(dir, '/etc/passwd')).toBeNull();
    expect(pathFor(dir, '')).toBeNull();
    expect(pathFor(dir, '.')).toBeNull();
  });
});
