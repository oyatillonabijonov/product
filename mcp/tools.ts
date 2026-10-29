import { constants } from 'node:fs';
import { lstat, open, readdir } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { z } from 'zod';
import { imageFilesOf } from '../shared/mcp-tools.ts';
import { sniffType } from '../shared/image-magic.ts';
import { registerSharedTools, text, MAX_IMAGE, type McpToolHost } from '../shared/mcp-register.ts';
import type { AdminClient } from '../shared/mcp-client.ts';

/**
 * Fayl yoki papkadan rasm yo'llari (papka — nom bo'yicha tartibda). Symlink qabul
 * qilinmaydi (`lstat`): `rasm.jpg → ~/.ssh/id_rsa` kabi havola fayl o'rniga sirni
 * yuklab yubormasin; papka ichida faqat oddiy fayllar olinadi.
 */
async function pathsToFiles(paths: string[]): Promise<string[]> {
  const out: string[] = [];
  for (const p of paths) {
    const s = await lstat(p);
    if (s.isSymbolicLink()) throw new Error(`Symlink qabul qilinmaydi: ${p}`);
    if (s.isDirectory()) {
      const names = (await readdir(p, { withFileTypes: true })).filter((d) => d.isFile()).map((d) => d.name);
      out.push(...imageFilesOf(names).map((n) => join(p, n)));
    } else if (s.isFile()) out.push(...imageFilesOf([p]));
  }
  return out;
}

/**
 * Faylni o'qiydi: `O_NOFOLLOW` — tekshiruvdan keyin symlink'ka almashtirilgan fayl ham
 * ochilmaydi; `O_NONBLOCK` — FIFO o'qishda osilib qolmaydi. Hajm o'qishdan oldin.
 */
async function readImage(f: string): Promise<{ bytes: Uint8Array; type: string }> {
  const fh = await open(f, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0) | (constants.O_NONBLOCK ?? 0));
  try {
    const st = await fh.stat();
    if (!st.isFile()) throw new Error(`Oddiy fayl emas: ${f}`);
    if (st.size > MAX_IMAGE) throw new Error(`5 MB dan katta: ${f}`);
    const bytes = new Uint8Array(await fh.readFile());
    if (bytes.byteLength > MAX_IMAGE) throw new Error(`5 MB dan katta: ${f}`);
    const type = sniffType(bytes);
    if (type === null || type === 'video/mp4') throw new Error(`Bu rasm emas (jpg, png, webp kutilgan): ${f}`);
    return { bytes, type };
  } finally {
    await fh.close();
  }
}

/**
 * Stdio transportining tool ro'yxati: umumiy tool'lar + kompyuterdagi fayllardan
 * rasm yuklash. `allowFiles: false` bo'lsa remote bilan bir xil ro'yxat qoladi.
 */
export function registerTools(server: McpToolHost, api: AdminClient, opts: { allowFiles: boolean; adminUrl: string }): void {
  registerSharedTools(server, api, { adminUrl: opts.adminUrl });
  if (!opts.allowFiles) return;

  server.registerTool('image_upload_from_path', {
    description: "Kompyuterdagi fayl yoki papkadan rasmlarni yuklaydi (papka — nom bo'yicha tartibda, birinchisi asosiy rasm).",
    inputSchema: { paths: z.array(z.string()).min(1).max(20) },
  }, async (args: unknown) => {
    const parsed = args as { paths: string[] };
    const files = await pathsToFiles(parsed.paths);
    if (files.length === 0) throw new Error('Rasm topilmadi (jpg, jpeg, png, webp)');
    const out: string[] = [];
    for (const f of files) {
      const { bytes, type } = await readImage(f);
      out.push(await api.upload(bytes, basename(f), type, 'image_upload_from_path'));
    }
    return text(out.join('\n'));
  });
}
