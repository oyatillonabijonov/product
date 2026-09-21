/**
 * `image_upload_from_url` uchun havola tekshiruvi.
 *
 * Remote transportda rasmni **server** yuklab oladi, ya'ni tokeni bor odam server
 * nomidan so'rov yubora oladi. Shuning uchun https majburiy va aniq ichki manzillar
 * rad etiladi (bulut metadata endpoint'i — `169.254.169.254` — eng muhimi).
 *
 * ponytail: bu nom/manzil darajasidagi tekshiruv, DNS rebinding'ni to'xtatmaydi —
 * `db.internal` kabi nuqtasiz nom ham rad etiladi, lekin ichki IP'ga ishora qiluvchi
 * ommaviy domenni ushlamaydi. Haqiqiy himoya kerak bo'lsa — yuklashni chiquvchi
 * proxy ortiga olib chiqish yoki DNS'ni yechib IP'ni tekshirish.
 */

const PRIVATE_V4 = [
  /^10\./,
  /^127\./,
  /^169\.254\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^0\./,
];

function isPrivateHost(host: string): boolean {
  const h = host.toLowerCase().replace(/^\[|\]$/g, '');
  if (h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.local') || h.endsWith('.internal')) return true;
  if (h === '::1' || h.startsWith('fe80:') || h.startsWith('fc') || h.startsWith('fd')) return true;
  if (PRIVATE_V4.some((re) => re.test(h))) return true;
  // Nuqtasiz nom — ichki tarmoqdagi mashina nomi (`db`, `redis`).
  return !h.includes('.') && !h.includes(':');
}

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
