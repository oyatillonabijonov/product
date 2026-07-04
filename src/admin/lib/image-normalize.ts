export interface PixelData {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TrimOptions {
  tolerance?: number;
  maxTrimRatio?: number;
}

function corner(img: PixelData, x: number, y: number): [number, number, number] {
  const i = (y * img.width + x) * 4;
  return [img.data[i], img.data[i + 1], img.data[i + 2]];
}

/**
 * Rasmning to'rt chekkasidan ichkariga skanerlab, bir xil rangли (yoki shaffof)
 * chekkani tashlab, mahsulot kontenti chegarasini qaytaradi. Amator suratда
 * (bir xil chekka yo'q) butun rasm qaytadi. maxTrimRatio har tomondan kesishni
 * cheklaydi — bir rangга yaqin rasmni buzmaslik uchun.
 */
export function contentBounds(img: PixelData, opts: TrimOptions = {}): Bounds {
  const tol = opts.tolerance ?? 12;
  const maxRatio = opts.maxTrimRatio ?? 0.42;
  const { data, width: w, height: h } = img;

  // Chekka-namuna rangi: to'rt burchak o'rtachasi.
  const c0 = corner(img, 0, 0);
  const c1 = corner(img, w - 1, 0);
  const c2 = corner(img, 0, h - 1);
  const c3 = corner(img, w - 1, h - 1);
  const refR = (c0[0] + c1[0] + c2[0] + c3[0]) / 4;
  const refG = (c0[1] + c1[1] + c2[1] + c3[1]) / 4;
  const refB = (c0[2] + c1[2] + c2[2] + c3[2]) / 4;

  const isBg = (x: number, y: number): boolean => {
    const i = (y * w + x) * 4;
    if (data[i + 3] < 16) return true; // shaffof
    return (
      Math.abs(data[i] - refR) <= tol &&
      Math.abs(data[i + 1] - refG) <= tol &&
      Math.abs(data[i + 2] - refB) <= tol
    );
  };

  const rowHasContent = (y: number): boolean => {
    for (let x = 0; x < w; x++) if (!isBg(x, y)) return true;
    return false;
  };
  const colHasContent = (x: number): boolean => {
    for (let y = 0; y < h; y++) if (!isBg(x, y)) return true;
    return false;
  };

  let top = 0;
  while (top < h && !rowHasContent(top)) top++;
  if (top === h) return { x: 0, y: 0, width: w, height: h }; // butunlay bg → no-op

  let bottom = h - 1;
  while (bottom > top && !rowHasContent(bottom)) bottom--;
  let left = 0;
  while (left < w && !colHasContent(left)) left++;
  let right = w - 1;
  while (right > left && !colHasContent(right)) right--;

  // maxTrimRatio clamp — har tomondan ortiqcha kesishni cheklash.
  const maxX = Math.floor(w * maxRatio);
  const maxY = Math.floor(h * maxRatio);
  top = Math.min(top, maxY);
  left = Math.min(left, maxX);
  bottom = Math.max(bottom, h - 1 - maxY);
  right = Math.max(right, w - 1 - maxX);

  return { x: left, y: top, width: right - left + 1, height: bottom - top + 1 };
}

export interface NormalizeOptions {
  maxSize?: number;
  quality?: number;
  tolerance?: number;
  maxTrimRatio?: number;
}

/**
 * Faylni brauzerда: bir xil rangли chekkasidan trim qiladi, uzun tomonni maxSize
 * gacha kichraytiradi, .webp qilib qaytaradi. Hech qanday fon/kanvas qo'shmaydi.
 * Har qanday xatoda originalни o'zgartirmasdan qaytaradi (yuklash to'xtamasligi uchun).
 */
export async function normalizeImage(file: File, opts: NormalizeOptions = {}): Promise<File> {
  const maxSize = opts.maxSize ?? 1600;
  const quality = opts.quality ?? 0.85;
  try {
    const bitmap = await createImageBitmap(file);
    const src = document.createElement('canvas');
    src.width = bitmap.width;
    src.height = bitmap.height;
    const sctx = src.getContext('2d');
    if (!sctx) return file;
    sctx.drawImage(bitmap, 0, 0);
    bitmap.close();

    const imageData = sctx.getImageData(0, 0, src.width, src.height);
    const b = contentBounds(
      { data: imageData.data, width: src.width, height: src.height },
      { tolerance: opts.tolerance, maxTrimRatio: opts.maxTrimRatio },
    );

    const scale = Math.min(1, maxSize / Math.max(b.width, b.height));
    const outW = Math.max(1, Math.round(b.width * scale));
    const outH = Math.max(1, Math.round(b.height * scale));

    const out = document.createElement('canvas');
    out.width = outW;
    out.height = outH;
    const octx = out.getContext('2d');
    if (!octx) return file;
    octx.drawImage(src, b.x, b.y, b.width, b.height, 0, 0, outW, outH);

    const blob = await new Promise<Blob | null>((resolve) =>
      out.toBlob((r) => resolve(r), 'image/webp', quality),
    );
    if (!blob) return file;

    const name = file.name.replace(/\.[^.]+$/, '') + '.webp';
    return new File([blob], name, { type: 'image/webp' });
  } catch {
    return file;
  }
}
