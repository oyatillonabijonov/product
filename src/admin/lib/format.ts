export function formatThousands(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return '';
  return Math.floor(n).toLocaleString('ru-RU').replace(/\D/g, ' ');
}

export function parseDigits(s: string): number {
  const digits = s.replace(/\D/g, '');
  if (digits === '') return 0;
  const n = Number(digits);
  return n > Number.MAX_SAFE_INTEGER ? Number.MAX_SAFE_INTEGER : n;
}

/** Unix soniya → «17.09.2026 14:05», Toshkent vaqti (UTC+5, yozgi vaqt yo'q) — brauzer mintaqasidan qat'i nazar. */
export function formatDateTime(sec: number): string {
  const d = new Date((sec + 5 * 3600) * 1000);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getUTCDate())}.${p(d.getUTCMonth() + 1)}.${d.getUTCFullYear()} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
}

/** So'mdagi summa; yo'q bo'lsa «—». 0 — «0 so'm». Qo'shimchani chaqiruvchi beradi: `t('common:sum')` (saytdagi `formatUzs(value, t.sum)` naqshi). */
export function formatSum(n: number | null, sum: string): string {
  if (n == null) return '—';
  return `${formatThousands(n) || '0'} ${sum}`;
}
