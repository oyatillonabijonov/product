/**
 * Faylning haqiqiy turi — birinchi baytlaridan («magic bytes»). Yuklashda mijoz aytgan
 * `type` (yoki fayl kengaytmasi) ga ishonilmaydi: `.jpg` nomli HTML yoki matn fayl
 * `/images/products/` dan ochiq tarqatilmasin.
 */
export type MediaType = 'image/jpeg' | 'image/png' | 'image/webp' | 'video/mp4';

const ascii = (b: Uint8Array, at: number, s: string) =>
  b.length >= at + s.length && [...s].every((ch, i) => b[at + i] === ch.charCodeAt(0));

export function sniffType(b: Uint8Array): MediaType | null {
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (b.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((x, i) => b[i] === x)) return 'image/png';
  if (ascii(b, 0, 'RIFF') && ascii(b, 8, 'WEBP')) return 'image/webp';
  // ISO BMFF: 4 bayt quti o'lchami, keyin `ftyp`.
  if (ascii(b, 4, 'ftyp')) return 'video/mp4';
  return null;
}
