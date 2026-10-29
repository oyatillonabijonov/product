import { describe, expect, it } from 'vitest';
import { openDatabase } from '../../server/sqlite';
import type { Env, ImageStore } from '../env';
import { createSession } from './auth';
import {
  customerCookie,
  currentCustomerId,
  isSameOrigin,
  parseCustomerSubject,
  revokeCustomerSessions,
  verifyTelegramLogin,
} from './customer-auth';

async function customerEnv(): Promise<Env> {
  const DB = openDatabase(':memory:');
  await DB.prepare("CREATE TABLE site_config (id INTEGER PRIMARY KEY, customer_session_secret TEXT NOT NULL DEFAULT '')").run();
  await DB.prepare('INSERT INTO site_config (id) VALUES (1)').run();
  await DB.prepare('CREATE TABLE customers (id INTEGER PRIMARY KEY, session_epoch INTEGER NOT NULL DEFAULT 0)').run();
  await DB.prepare('INSERT INTO customers (id) VALUES (7)').run();
  return { DB, IMAGES: {} as ImageStore };
}

const withCookie = (setCookie: string) =>
  new Request('https://shop.test/kabinet', { headers: { cookie: setCookie.split(';')[0] } });

describe('parseCustomerSubject', () => {
  it('"id:davr" ni ajratadi', () => {
    expect(parseCustomerSubject('7:3')).toEqual({ id: 7, epoch: 3 });
  });
  it('davrsiz eski token va buzuq qiymat — null', () => {
    expect(parseCustomerSubject('7')).toBeNull();
    expect(parseCustomerSubject('7:x')).toBeNull();
    expect(parseCustomerSubject('7:1:2')).toBeNull();
  });
});

describe('mijoz sessiyasi davri', () => {
  it('chiqishdan keyin eski cookie qabul qilinmaydi', async () => {
    const e = await customerEnv();
    const req = withCookie(await customerCookie(e, 7, true));
    expect(await currentCustomerId(req, e)).toBe(7);
    await revokeCustomerSessions(e, 7);
    expect(await currentCustomerId(req, e)).toBeNull();
    // Qayta kirish yangi davr bilan ishlaydi.
    expect(await currentCustomerId(withCookie(await customerCookie(e, 7, true)), e)).toBe(7);
  });

  it('davrsiz eski formatdagi token — chiqqan deb hisoblanadi', async () => {
    const e = await customerEnv();
    await customerCookie(e, 7, true); // sirni yaratadi
    const secret = (await e.DB.prepare('SELECT customer_session_secret AS s FROM site_config WHERE id = 1').first<{ s: string }>())?.s ?? '';
    const legacy = await createSession('7', secret, 3600, Math.floor(Date.now() / 1000));
    expect(await currentCustomerId(withCookie(`customer_session=${legacy}`), e)).toBeNull();
  });
});

describe('isSameOrigin', () => {
  const post = (headers: Record<string, string>) => new Request('https://shop.test/auth/logout', { method: 'POST', headers });
  it('o\'z sahifasidan — ha', () => {
    expect(isSameOrigin(post({ origin: 'https://shop.test', 'sec-fetch-site': 'same-origin' }))).toBe(true);
    expect(isSameOrigin(post({ origin: 'https://shop.test' }))).toBe(true);
  });
  it('boshqa sayt, Origin yo\'q yoki cross-site — yo\'q', () => {
    expect(isSameOrigin(post({ origin: 'https://evil.test' }))).toBe(false);
    expect(isSameOrigin(post({}))).toBe(false);
    expect(isSameOrigin(post({ origin: 'https://shop.test', 'sec-fetch-site': 'cross-site' }))).toBe(false);
  });
});

describe('verifyTelegramLogin', () => {
  const BOT = '123:abc';
  async function sign(fields: Record<string, string>): Promise<string> {
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey('raw', await crypto.subtle.digest('SHA-256', enc.encode(BOT)), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const data = Object.keys(fields).sort().map((k) => `${k}=${fields[k]}`).join('\n');
    const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data));
    return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  const now = 1_700_000_000;
  const user = { id: '42', first_name: 'Ali', username: 'ali', auth_date: String(now - 10) };

  it('to\'g\'ri imzo — qabul', async () => {
    expect(await verifyTelegramLogin({ ...user, hash: await sign(user) }, BOT, now)).toBe(true);
  });
  it('o\'zgartirilgan maydon yoki eski auth_date — rad', async () => {
    const hash = await sign(user);
    expect(await verifyTelegramLogin({ ...user, id: '43', hash }, BOT, now)).toBe(false);
    expect(await verifyTelegramLogin({ ...user, hash }, BOT, now + 86_400 + 11)).toBe(false);
    expect(await verifyTelegramLogin({ ...user, extra: 'x', hash }, BOT, now)).toBe(false);
  });
});
