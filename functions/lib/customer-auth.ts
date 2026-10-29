import type { Env } from '../env';
import { createSession, verifySession, getCookie, randomSecretHex } from './auth';

const COOKIE = 'customer_session';
const TTL = 60 * 60 * 24 * 30; // 30 kun

/** Mijoz sessiya siri — bo'sh bo'lsa runtime'da generatsiya qilinib D1'ga saqlanadi.
 * ponytail: birinchi ikki so'rov poygasi last-writer-wins (nodir; bitta sessiya bekor bo'lishi mumkin). */
async function customerSecret(env: Env): Promise<string> {
  const row = await env.DB.prepare('SELECT customer_session_secret AS s FROM site_config WHERE id = 1').first<{ s: string }>();
  if (row?.s) return row.s;
  const s = randomSecretHex();
  await env.DB.prepare('UPDATE site_config SET customer_session_secret = ? WHERE id = 1').bind(s).run();
  return s;
}

/** Mijozning joriy sessiya davri (`customers.session_epoch`); mijoz yo'q bo'lsa null. */
async function epochOf(env: Env, customerId: number): Promise<number | null> {
  const row = await env.DB.prepare('SELECT session_epoch AS e FROM customers WHERE id = ?').bind(customerId).first<{ e: number }>();
  return row ? row.e : null;
}

/**
 * Imzolangan sessiya mavzusi `"<id>:<davr>"`. Davrsiz eski token (`"<id>"`) yoki buzuq qiymat — null:
 * bunday mijoz qayta kiradi (chiqish ularni bekor qila olmasdi).
 */
export function parseCustomerSubject(subject: string): { id: number; epoch: number } | null {
  const m = /^(\d+):(\d+)$/.exec(subject);
  if (!m) return null;
  return { id: Number(m[1]), epoch: Number(m[2]) };
}

export async function customerCookie(env: Env, customerId: number, secure: boolean): Promise<string> {
  const epoch = (await epochOf(env, customerId)) ?? 0;
  const token = await createSession(`${customerId}:${epoch}`, await customerSecret(env), TTL, Math.floor(Date.now() / 1000));
  return `${COOKIE}=${token}; HttpOnly;${secure ? ' Secure;' : ''} SameSite=Lax; Path=/; Max-Age=${TTL}`;
}

export function clearedCustomerCookie(secure: boolean): string {
  return `${COOKIE}=; HttpOnly;${secure ? ' Secure;' : ''} SameSite=Lax; Path=/; Max-Age=0`;
}

/**
 * Cookie'dagi sessiyani `secret` bilan tekshiradi (secret allaqachon yuklangan bo'lsa — qo'shimcha o'qishsiz),
 * keyin token davrini bazadagi bilan solishtiradi: chiqishda davr oshadi va chiqarilgan hamma token o'ladi.
 */
export async function customerIdFrom(request: Request, secret: string, env: Env): Promise<number | null> {
  const token = getCookie(request, COOKIE);
  if (!token || !secret) return null;
  const subject = await verifySession(token, secret, Math.floor(Date.now() / 1000));
  const s = subject ? parseCustomerSubject(subject) : null;
  if (!s) return null;
  return (await epochOf(env, s.id)) === s.epoch ? s.id : null;
}

/** To'liq variant — sirni o'zi yuklaydi (auth route'lar uchun). */
export async function currentCustomerId(request: Request, env: Env): Promise<number | null> {
  return customerIdFrom(request, await customerSecret(env), env);
}

/** Mijozning hamma qurilmadagi sessiyalarini bekor qiladi (chiqish). */
export async function revokeCustomerSessions(env: Env, customerId: number): Promise<void> {
  await env.DB.prepare('UPDATE customers SET session_epoch = session_epoch + 1 WHERE id = ?').bind(customerId).run();
}

/**
 * So'rov shu saytning o'z sahifasidan kelganmi: `Origin` so'rov manzilining origin'iga teng va
 * (brauzer yuborgan bo'lsa) `Sec-Fetch-Site: same-origin`. Sessiya beradigan/olib tashlaydigan
 * POST'lar boshqa saytdan yuborilgan forma yoki navigatsiya bilan ishga tushmasin.
 */
export function isSameOrigin(request: Request): boolean {
  const site = request.headers.get('sec-fetch-site');
  if (site !== null && site !== 'same-origin') return false;
  return request.headers.get('origin') === new URL(request.url).origin;
}

/**
 * Telegram Login Widget ma'lumotining imzosi (Telegram spetsifikatsiyasi): `hash`dan boshqa hamma
 * maydon kalit bo'yicha tartiblanib `k=v` qatorlari `\n` bilan, kalit — SHA-256(bot token), HMAC-SHA256.
 * `auth_date` 1 sutkadan eski bo'lsa — rad.
 */
export async function verifyTelegramLogin(fields: Record<string, string>, botToken: string, now: number): Promise<boolean> {
  const hash = fields.hash;
  const authDate = Number(fields.auth_date ?? '0');
  if (!hash || !fields.id || !authDate || now - authDate > 86400) return false;
  const pairs = Object.entries(fields).filter(([k]) => k !== 'hash').map(([k, v]) => `${k}=${v}`).sort();
  const enc = new TextEncoder();
  const secretKey = await crypto.subtle.digest('SHA-256', enc.encode(botToken));
  const key = await crypto.subtle.importKey('raw', secretKey, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(pairs.join('\n')));
  const computed = Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('');
  return computed === hash;
}
