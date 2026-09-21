/**
 * Ishonchsiz havolalarni filtrlash: ichki yo'l (`/...`, lekin protokol-nisbiy
 * `//evil.com` emas) yoki http(s). `javascript:`, `data:`, `mailto:` o'tmaydi.
 *
 * `shared/` da turadi, chunki qoida ikki joyda kerak: server tomonda kiritishni
 * tekshirish (`functions/lib/validate.ts`) va klientda chizishdan oldin.
 */
export const SAFE_HREF_RE = /^(\/(?!\/)|https?:\/\/)/i;

export function safeHref(url: string): string | null {
  const u = url.trim();
  if (u === '' || !SAFE_HREF_RE.test(u)) return null;
  return u;
}
