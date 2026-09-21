/**
 * MCP tokenlari — sof qism: yaratish, hash, sarlavhadan ajratish.
 *
 * Token bazada **hash** holida turadi (`admin_tokens.token_hash`), qiymatning o'zi faqat
 * yaratilgan javobda bir marta ko'rinadi. Token 32 bayt tasodifdan iborat, ya'ni yuqori
 * entropiyali — parol emas, shuning uchun PBKDF2 shart emas, SHA-256 yetarli.
 */

const PREFIX = 'prod_';

function hex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Yangi token: `prod_` + 64 hex belgi. */
export function newToken(): string {
  return PREFIX + hex(crypto.getRandomValues(new Uint8Array(32)).buffer);
}

/** Bazaga yoziladigan hash (hex, kichik harf). */
export async function hashToken(token: string): Promise<string> {
  return hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token)));
}

/**
 * `Authorization: Bearer prod_…` dan tokenni ajratadi. Sxema registrsiz.
 * Prefiksi boshqa qiymat `null` qaytaradi — bu so'rov cookie yo'li bilan tekshiriladi
 * (masalan mijoz sessiyasining bearer'i admin guard'iga tushib qolmasin).
 */
export function tokenFromHeader(header: string | null | undefined): string | null {
  if (!header) return null;
  const m = /^Bearer\s+(\S+)$/i.exec(header.trim());
  if (!m) return null;
  return m[1].startsWith(PREFIX) ? m[1] : null;
}
