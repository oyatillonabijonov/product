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

  // Sodda hostnamlar.
  if (h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.local') || h.endsWith('.internal')) return true;

  // IPv6 tekshiruvi.
  if (h === '::1') return true; // Loopback.

  // IPv4-mapped IPv6: ::ffff:a.b.c.d yoki ::ffff:XXYY:ZZWW (URL parser'dan keyin hex format).
  if (h.startsWith('::ffff:')) {
    const suffix = h.slice(7);
    // Nuqtali o'nliklar format (kutilmaydi, lekin defansiv).
    if (suffix.includes('.')) {
      return PRIVATE_V4.some((re) => re.test(suffix));
    }
    // Hex format: XXYY:ZZWW yoki XY:Z:W (URL parser yuqori nollarni kesib tashlay oladi).
    // O'rniga, birinchi 4 hex hekstetga qidiring va IPv4 ni qayta qurayotgan.
    const parts = suffix.split(':').filter((p) => p.length > 0);
    if (parts.length === 2) {
      const part1Hex = parts[0].padStart(4, '0');
      const part2Hex = parts[1].padStart(4, '0');
      const b1 = parseInt(part1Hex.slice(0, 2), 16);
      const b2 = parseInt(part1Hex.slice(2, 4), 16);
      const b3 = parseInt(part2Hex.slice(0, 2), 16);
      const b4 = parseInt(part2Hex.slice(2, 4), 16);
      if ([b1, b2, b3, b4].every((n) => Number.isFinite(n) && n >= 0 && n <= 255)) {
        const ipv4 = `${b1}.${b2}.${b3}.${b4}`;
        return PRIVATE_V4.some((re) => re.test(ipv4));
      }
    }
  }

  // IPv4-compatible IPv6: ::a.b.c.d (deprecated RFC 4291, shu yo'lda birinchi bitta :: quyidagi).
  // Normalizes to ::aabb:ccdd hex format. Loopback ekvivalenti (::127.0.0.1) bu yerda bloklandi.
  if (h.startsWith('::') && !h.startsWith('::ffff:') && h !== '::1') {
    const suffix = h.slice(2);
    // Nuqtali o'nliklar format.
    if (suffix.includes('.')) {
      return PRIVATE_V4.some((re) => re.test(suffix));
    }
    // Hex format: exactly 2 parts for IPv4-compatible addresses.
    const parts = suffix.split(':').filter((p) => p.length > 0);
    if (parts.length === 2) {
      const part1Hex = parts[0].padStart(4, '0');
      const part2Hex = parts[1].padStart(4, '0');
      const b1 = parseInt(part1Hex.slice(0, 2), 16);
      const b2 = parseInt(part1Hex.slice(2, 4), 16);
      const b3 = parseInt(part2Hex.slice(0, 2), 16);
      const b4 = parseInt(part2Hex.slice(2, 4), 16);
      if ([b1, b2, b3, b4].every((n) => Number.isFinite(n) && n >= 0 && n <= 255)) {
        const ipv4 = `${b1}.${b2}.${b3}.${b4}`;
        return PRIVATE_V4.some((re) => re.test(ipv4));
      }
    }
  }

  // Birinchi heksteti tekshir IPv6 qatorlari uchun.
  const firstHextet = h.split(':')[0];
  if (firstHextet.length >= 2) {
    const hextetNum = parseInt(firstHextet, 16);
    // Link-local (fe80::/10): birinchi hextet >= fe80 va < fec0.
    if (hextetNum >= 0xfe80 && hextetNum < 0xfec0) return true;
    // ULA (fc00::/7): birinchi hextet >= fc00 va < fe00.
    if (hextetNum >= 0xfc00 && hextetNum < 0xfe00) return true;
  }

  // IPv4 nuqtali o'nliklar.
  if (PRIVATE_V4.some((re) => re.test(h))) return true;

  // Nuqtasiz nomlar — ichki tarmoqdagi mashina nomi (`db`, `redis`).
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
