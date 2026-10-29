/**
 * So'rov tanasini **o'qilgan baytlarni sanab** chegaralab o'qiydi. `Content-Length`ga
 * ishonilmaydi: chunked (yoki uzunliksiz HTTP/2) tana sarlavhasiz keladi va ilgari to'liq
 * xotiraga yig'ilardi. Sarlavha chegaradan katta bo'lsa — o'qimasdan rad etiladi.
 *
 * Chegaradan oshganda oqim `cancel` qilinmaydi: Node adapteri buni socket'ni yo'q qilish
 * bilan bajaradi va 413 javobi mijozga yetmay qolardi. O'rniga javob `Connection: close`
 * bilan ketadi — Node uni yuborib bo'lgach ulanishni yopadi, o'qilmagan qoldiq tashlanadi.
 */
export function tooLarge(): Response {
  return Response.json({ error: 'too_large' }, { status: 413, headers: { connection: 'close' } });
}

/** Tana matni yoki 413 `Response` (chaqiruvchi `instanceof Response` bilan tekshiradi). */
export async function readText(request: Request, maxBytes: number): Promise<string | Response> {
  if (Number(request.headers.get('content-length') ?? '0') > maxBytes) return tooLarge();
  if (!request.body) return '';
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) return tooLarge();
    chunks.push(value);
  }
  const all = new Uint8Array(size);
  let at = 0;
  for (const c of chunks) { all.set(c, at); at += c.byteLength; }
  return new TextDecoder().decode(all);
}

/**
 * JSON tana yoki 413 `Response`. Buzuq JSON — `null` (avvalgi `request.json().catch(() => null)`
 * xulqi: chaqiruvchining validatsiyasi 400 beradi).
 */
export async function readJson(request: Request, maxBytes: number): Promise<unknown> {
  const text = await readText(request, maxBytes);
  if (text instanceof Response) return text;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}
