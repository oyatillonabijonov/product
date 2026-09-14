import type { Env, SqlStatement } from '../shared/runtime';
import { CBU_USD_URL, parseCbuUsd, storeRate } from '../shared/usd-rate.ts';

/**
 * Dollar kursi — Markaziy bankdan (cbu.uz) boot'dan keyin va har 6 soatda olinadi.
 *
 * MB kursi va sanasi har doim yoziladi. Do'kon kursi (`usd_to_uzs` — Billz narxlari va saytdagi
 * USD ko'rinishi shu kursda) faqat admin ustama kiritgan bo'lsa yangilanadi: ustamasiz deploy'da
 * narxlar o'zidan o'zgarib ketmasin. Xato bo'lsa oxirgi qiymat qoladi.
 */
const EVERY_MS = 6 * 60 * 60 * 1000;
const BOOT_DELAY_MS = 5 * 1000;
const TIMEOUT_MS = 5 * 1000;

export function createUsdRate(env: Env): { refresh(): Promise<void>; start(): void } {
  async function refresh(): Promise<void> {
    const res = await fetch(CBU_USD_URL, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!res.ok) throw new Error(`cbu http_${res.status}`);
    const cbu = parseCbuUsd(await res.json());
    if (!cbu) throw new Error('cbu: USD kursi topilmadi');
    const row = await env.DB.prepare('SELECT usd_markup_percent AS markup FROM settings WHERE id = 1')
      .first<{ markup: number | null }>();
    const statements: SqlStatement[] = [
      env.DB.prepare('UPDATE settings SET usd_cbu_rate = ?, usd_rate_date = ? WHERE id = 1').bind(cbu.rate, cbu.date),
    ];
    if (row && row.markup !== null) {
      statements.push(env.DB.prepare('UPDATE settings SET usd_to_uzs = ? WHERE id = 1').bind(storeRate(cbu.rate, row.markup)));
    }
    await env.DB.batch(statements);
  }

  const tick = () => { refresh().catch((err) => console.error('usd kurs xato:', err)); };

  return {
    refresh,
    start() {
      // unref — timerlar jarayonni tirik ushlab turmaydi.
      setTimeout(tick, BOOT_DELAY_MS).unref();
      setInterval(tick, EVERY_MS).unref();
    },
  };
}
