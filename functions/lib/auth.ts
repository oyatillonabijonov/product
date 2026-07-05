const enc = new TextEncoder();

function bytesToHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function toB64url(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromB64url(s: string): Uint8Array {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function hexToBytes(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

// Cloudflare Workers caps PBKDF2 at 100,000 iterations (throws above that), so this
// cannot reach the OWASP-recommended 600k. Online brute-force is instead blocked by
// the login lockout below; the hash still slows offline cracking of a leaked D1 row.
const PBKDF2_ITERATIONS = 100_000;

export const LOGIN_LOCK_THRESHOLD = 5;

/** Lock duration (seconds) after `failedAttempts` consecutive failures: 0 below the
 * threshold, then 60s doubling per extra failure, capped at 10 minutes.
 * Cap past qilib tanlangan: throttle holati akkaunt darajasida (IP emas) — yuqori cap
 * istalgan anonimga haqiqiy adminni soatlab bloklash (lockout-DoS) imkonini berardi. */
export function lockDelaySeconds(failedAttempts: number): number {
  if (failedAttempts < LOGIN_LOCK_THRESHOLD) return 0;
  return Math.min(60 * 2 ** (failedAttempts - LOGIN_LOCK_THRESHOLD), 600);
}

/** PBKDF2-SHA256 hash of a password with a hex salt → 256-bit hex. Salted + slow so a leaked hash resists brute-force. */
export async function hashPassword(password: string, saltHex: string): Promise<string> {
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: hexToBytes(saltHex), iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    256,
  );
  return bytesToHex(bits);
}

export async function verifyPassword(password: string, saltHex: string, expectedHash: string): Promise<boolean> {
  return safeEqual(await hashPassword(password, saltHex), expectedHash);
}

export function randomSaltHex(): string {
  return bytesToHex(crypto.getRandomValues(new Uint8Array(16)).buffer);
}

/** 256-bit random hex — used to rotate session_secret (invalidates every session). */
export function randomSecretHex(): string {
  return bytesToHex(crypto.getRandomValues(new Uint8Array(32)).buffer);
}

async function hmac(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(payload));
  return toB64url(new Uint8Array(sig));
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function createSession(
  username: string,
  secret: string,
  ttlSeconds: number,
  now: number,
): Promise<string> {
  const exp = now + ttlSeconds;
  const payload = toB64url(enc.encode(JSON.stringify({ u: username, exp })));
  const sig = await hmac(payload, secret);
  return `${payload}.${sig}`;
}

export async function verifySession(
  token: string,
  secret: string,
  now: number,
): Promise<string | null> {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payload, sig] = parts;
  const expected = await hmac(payload, secret);
  if (!safeEqual(sig, expected)) return null;
  try {
    const data = JSON.parse(new TextDecoder().decode(fromB64url(payload))) as {
      u: string;
      exp: number;
    };
    if (typeof data.exp !== 'number' || data.exp < now) return null;
    return data.u;
  } catch {
    return null;
  }
}

export function getCookie(request: Request, name: string): string | null {
  const header = request.headers.get('cookie');
  if (!header) return null;
  for (const part of header.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return v.join('=');
  }
  return null;
}

export function sessionCookie(token: string, ttlSeconds: number): string {
  return `session=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${ttlSeconds}`;
}

export function clearedSessionCookie(): string {
  return 'session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0';
}
