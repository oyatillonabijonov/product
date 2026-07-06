import type { Env } from '../env';
import { createSession, verifySession, getCookie, randomSecretHex } from './auth';

const COOKIE = 'customer_session';
const TTL = 60 * 60 * 24 * 30; // 30 kun

/** Mijoz sessiya siri — bo'sh bo'lsa runtime'da generatsiya qilinib D1'ga saqlanadi.
 * ponytail: birinchi ikki so'rov poygasi last-writer-wins (nodir; bitta sessiya bekor bo'lishi mumkin). */
export async function customerSecret(env: Env): Promise<string> {
  const row = await env.DB.prepare('SELECT customer_session_secret AS s FROM site_config WHERE id = 1').first<{ s: string }>();
  if (row?.s) return row.s;
  const s = randomSecretHex();
  await env.DB.prepare('UPDATE site_config SET customer_session_secret = ? WHERE id = 1').bind(s).run();
  return s;
}

export async function customerCookie(env: Env, customerId: number): Promise<string> {
  const token = await createSession(String(customerId), await customerSecret(env), TTL, Math.floor(Date.now() / 1000));
  return `${COOKIE}=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${TTL}`;
}

export function clearedCustomerCookie(): string {
  return `${COOKIE}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;
}

/** Cookie'dagi sessiyani `secret` bilan tekshiradi (secret allaqachon yuklangan bo'lsa — qo'shimcha D1 o'qishsiz). */
export async function customerIdFrom(request: Request, secret: string): Promise<number | null> {
  const token = getCookie(request, COOKIE);
  if (!token || !secret) return null;
  const id = await verifySession(token, secret, Math.floor(Date.now() / 1000));
  return id ? Number(id) : null;
}

/** To'liq variant — sirni o'zi yuklaydi (auth route'lar uchun). */
export async function currentCustomerId(request: Request, env: Env): Promise<number | null> {
  return customerIdFrom(request, await customerSecret(env));
}
