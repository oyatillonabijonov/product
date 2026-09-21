import { readFile, readdir, stat } from 'node:fs/promises';
import { basename, extname, join } from 'node:path';
import { z } from 'zod';
import { imageFilesOf } from '../shared/mcp-tools.ts';
import { registerSharedTools, text, MAX_IMAGE, type McpToolHost } from '../shared/mcp-register.ts';
import type { AdminClient } from '../shared/mcp-client.ts';

const MIME: Record<string, string> = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };

/** Fayl yoki papkadan rasm yo'llari (papka — nom bo'yicha tartibda). */
async function pathsToFiles(paths: string[]): Promise<string[]> {
  const out: string[] = [];
  for (const p of paths) {
    const s = await stat(p);
    if (s.isDirectory()) out.push(...imageFilesOf(await readdir(p)).map((n) => join(p, n)));
    else out.push(...imageFilesOf([p]));
  }
  return out;
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
      const bytes = new Uint8Array(await readFile(f));
      if (bytes.byteLength > MAX_IMAGE) throw new Error(`5 MB dan katta: ${f}`);
      out.push(await api.upload(bytes, basename(f), MIME[extname(f).toLowerCase()] ?? 'image/jpeg', 'image_upload_from_path'));
    }
    return text(out.join('\n'));
  });
}
