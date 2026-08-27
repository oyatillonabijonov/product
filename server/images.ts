import { createReadStream, existsSync, mkdirSync, statSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, join, normalize } from 'node:path';
import { Readable } from 'node:stream';
import type { ImageStore } from '../shared/runtime';

/**
 * Disk ustidan R2 API'si — rasm ombori.
 *
 * Faqat `get`/`put` kerak: admin rasm yuklaydi (`api.admin.upload`), storefront
 * uni `/images/*` orqali beradi. Kalitlar `products/<uuid>.<ext>` ko'rinishida,
 * shu sabab papkadan tashqariga chiqishga yo'l qo'yilmaydi.
 */
const MIME: Record<string, string> = {
  webp: 'image/webp',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  avif: 'image/avif',
  svg: 'image/svg+xml',
};

function pathFor(dir: string, key: string): string | null {
  const file = normalize(join(dir, key));
  // `..` bilan papkadan chiqib ketishga yo'l yo'q.
  return file.startsWith(normalize(dir)) ? file : null;
}

export function openImageStore(dir: string): ImageStore {
  mkdirSync(dir, { recursive: true });
  return {
    async get(key) {
      const file = pathFor(dir, key);
      if (!file || !existsSync(file)) return null;
      const info = statSync(file);
      const ext = file.split('.').pop()?.toLowerCase() ?? '';
      const type = MIME[ext] ?? 'application/octet-stream';
      const etag = `"${createHash('sha1').update(`${file}:${info.size}:${info.mtimeMs}`).digest('hex')}"`;
      return {
        body: Readable.toWeb(createReadStream(file)) as ReadableStream,
        httpEtag: etag,
        writeHttpMetadata(headers: Headers) {
          headers.set('content-type', type);
          headers.set('content-length', String(info.size));
        },
      };
    },
    async put(key, data, options) {
      const file = pathFor(dir, key);
      if (!file) throw new Error('invalid key');
      mkdirSync(dirname(file), { recursive: true });
      await writeFile(file, Buffer.from(data));
      void options; // contentType kengaytmadan aniqlanadi — alohida saqlash shart emas
    },
  };
}
