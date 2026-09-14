/**
 * Xotiradagi oddiy chegara: bitta kalit (IP) uchun oynada `max` so'rov.
 * ponytail: bitta jarayon uchun yetarli (bitta server); bir nechta instansiya
 * bo'lsa Redis yoki proxy darajasidagi limit kerak.
 */
export function createLimiter(max: number, windowMs: number): (key: string, now?: number) => boolean {
  const hits = new Map<string, number[]>();
  return (key, now = Date.now()) => {
    if (hits.size > 10_000) hits.clear(); // xotira chegarasi — flood paytida hamma nolga qaytadi
    const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
    if (recent.length >= max) { hits.set(key, recent); return false; }
    recent.push(now);
    hits.set(key, recent);
    return true;
  };
}

/** Ommaviy lead endpoint'lari (/api/order, /api/consult): bitta IP'dan 10 daqiqada 10 ta. */
export const allowLead = createLimiter(10, 10 * 60 * 1000);
