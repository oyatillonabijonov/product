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
