import { readFile, readdir, stat } from 'node:fs/promises';
import { basename, extname, join } from 'node:path';
import { z } from 'zod';
import type { ApiAdminBrand, ApiCategory, ApiProduct, ApiProductDetail, ApiProductType } from '../shared/types.ts';
import { catalogStats, imageFilesOf, incompleteProducts, manualFieldsFor, detailToInput, type ProductPatch } from '../shared/mcp-tools.ts';
import type { AdminClient } from './client.ts';

const MAX_IMAGE = 5 * 1024 * 1024;
const MIME: Record<string, string> = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };

const text = (s: string) => ({ content: [{ type: 'text' as const, text: s }] });

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

export function registerTools(
  server: {
    registerTool: (
      name: string,
      cfg: { description: string; inputSchema: Record<string, z.ZodTypeAny> },
      run: (args: unknown) => Promise<{ content: { type: 'text'; text: string }[] }>
    ) => void;
  },
  api: AdminClient,
  opts: { allowFiles: boolean; adminUrl: string }
): void {
  const products = () => api.get<ApiProduct[]>('/api/admin/products');

  server.registerTool('catalog_stats', {
    description: "Katalog holati: jami tovar, faol/yashirin, rasmi yo'q, tavsifi yo'q, qoldiq 0, Billz va qo'lda kiritilganlar soni. Hamma tovar bo'yicha sanaydi — admin panelidagi «Rasm kerak» esa faqat qoldig'i bor Billz tovarlarini ko'rsatadi, shuning uchun sonlar farq qiladi.",
    inputSchema: {},
  }, async () => text(JSON.stringify(catalogStats(await products()), null, 2)));

  server.registerTool('products_incomplete', {
    description: "Ma'lumoti to'liq bo'lmagan tovarlar: rasmi yo'q va/yoki tavsifi yo'q. Sahifalanadi. Qoldiq va Billz holatiga qaramay hamma tovar tekshiriladi.",
    inputSchema: {
      missing: z.enum(['image', 'description', 'any']).default('any'),
      limit: z.number().int().min(1).max(50).default(20),
      offset: z.number().int().min(0).default(0),
    },
  }, async (args: unknown) => {
    const parsed = args as { missing: 'image' | 'description' | 'any'; limit: number; offset: number };
    return text(JSON.stringify(incompleteProducts(await products(), parsed), null, 2));
  });

  server.registerTool('product_get', {
    description: "Bitta tovar: id bo'yicha yoki nom bo'lagi bo'yicha qidirib.",
    inputSchema: { id: z.string().optional(), q: z.string().optional() },
  }, async (args: unknown) => {
    const parsed = args as { id?: string; q?: string };
    if (parsed.id) return text(JSON.stringify(await api.get<unknown>(`/api/admin/products/${parsed.id}`), null, 2));
    const q = (parsed.q ?? '').toLowerCase();
    const found = (await products()).filter((p) => p.name.toLowerCase().includes(q)).slice(0, 10);
    return text(JSON.stringify(found.map((p) => ({ id: p.id, name: p.name, isActive: p.isActive, cashPriceUzs: p.cashPriceUzs })), null, 2));
  });

  server.registerTool('types_list', {
    description: "Tovar turlari (yo'nalish ichidagi bo'linish). Tovar yaratishdan oldin shu ro'yxatdan `type` tanlanadi.",
    inputSchema: { categoryId: z.string().optional() },
  }, async (args: unknown) => {
    const parsed = args as { categoryId?: string };
    const all = await api.get<ApiProductType[]>('/api/admin/types');
    const list = parsed.categoryId ? all.filter((t) => t.categoryId === parsed.categoryId) : all;
    return text(JSON.stringify(list.map((t) => ({ id: t.id, label: t.label, categoryId: t.categoryId })), null, 2));
  });

  server.registerTool('categories_list', {
    description: "Yo'nalishlar: apple, pc, audio, video.",
    inputSchema: {},
  }, async () => {
    const cats = await api.get<ApiCategory[]>('/api/admin/categories');
    return text(JSON.stringify(cats.map((c) => ({ id: c.id, name: c.name })), null, 2));
  });

  server.registerTool('brands_list', {
    description: 'Brendlar va ularning tovar soni.',
    inputSchema: {},
  }, async () => {
    const brands = await api.get<ApiAdminBrand[]>('/api/admin/brands');
    return text(JSON.stringify(brands.map((b) => ({ id: b.id, name: b.name, productCount: b.productCount })), null, 2));
  });

  server.registerTool('image_upload_from_url', {
    description: "Rasmni https havoladan yuklab saytga qo'yadi. Javob — saytdagi rasm manzillari.",
    inputSchema: { urls: z.array(z.string().url()).min(1).max(10) },
  }, async (args: unknown) => {
    const parsed = args as { urls: string[] };
    const out: string[] = [];
    for (const u of parsed.urls) {
      if (!u.startsWith('https://')) throw new Error(`Faqat https: ${u}`);
      const res = await fetch(u, { redirect: 'manual' });
      if (!res.ok) throw new Error(`Rasm yuklanmadi (${res.status}): ${u}`);
      const type = res.headers.get('content-type') ?? '';
      if (!type.startsWith('image/')) throw new Error(`Bu rasm emas (${type}): ${u}`);
      const bytes = new Uint8Array(await res.arrayBuffer());
      if (bytes.byteLength > MAX_IMAGE) throw new Error(`5 MB dan katta: ${u}`);
      out.push(await api.upload(bytes, basename(new URL(u).pathname) || 'image', type, 'image_upload_from_url'));
    }
    return text(out.join('\n'));
  });

  if (opts.allowFiles) {
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

  server.registerTool('product_create', {
    description: "Yangi tovar qo'shadi. **Yashirin** yaratiladi — egasi admin'da ko'rib chiqib saytga chiqaradi. `type` ni avval `types_list` dan tanlang.",
    inputSchema: {
      name: z.string().min(2),
      categoryId: z.enum(['apple', 'pc', 'audio', 'video']),
      type: z.string(),
      cashPriceUzs: z.number().int().positive(),
      description: z.string().optional(),
      brandId: z.string().optional(),
      condition: z.enum(['yangi', 'ishlatilgan']).default('yangi'),
      specs: z.array(z.object({ label: z.string(), value: z.string() })).optional(),
      imageUrls: z.array(z.string()).optional(),
    },
  }, async (args: unknown) => {
    const parsed = args as {
      name: string; categoryId: string; type: string; cashPriceUzs: number;
      description?: string; brandId?: string; condition: 'yangi' | 'ishlatilgan';
      specs?: { label: string; value: string }[]; imageUrls?: string[];
    };
    const images = parsed.imageUrls ?? [];
    const created = await api.write<{ id: string }>('/api/admin/products', 'POST', {
      name: parsed.name, categoryId: parsed.categoryId, type: parsed.type,
      condition: parsed.condition, conditionNote: null, cashPriceUzs: parsed.cashPriceUzs,
      oldPriceUzs: null, description: parsed.description ?? null,
      imageUrl: images[0] ?? '', images: images.slice(1), specs: parsed.specs ?? [],
      sortOrder: 0, isActive: false, brandId: parsed.brandId ?? null, slug: null,
      ratingAvg: null, reviewCount: 0, preorder: false, options: [], variants: [], manualFields: [],
    }, 'product_create');
    return text(`Yaratildi (yashirin holatda): ${opts.adminUrl}/admin/products/${created.id}\nSaytda ko'rinishi uchun admin'da «Saytda ko'rsatish»ni yoqing.`);
  });

  server.registerTool('product_update', {
    description: "Mavjud tovarni yangilaydi. Billz tovarida tegilgan maydon uchun «Qo'lda tahrirlash» qulfi avtomatik yoqiladi, aks holda 30 daqiqada Billz qiymati qaytadi.",
    inputSchema: {
      id: z.string(),
      name: z.string().optional(),
      description: z.string().optional(),
      cashPriceUzs: z.number().int().positive().optional(),
      specs: z.array(z.object({ label: z.string(), value: z.string() })).optional(),
    },
  }, async (args: unknown) => {
    const parsed = args as { id: string } & ProductPatch;
    const { id, ...patch } = parsed;
    const current = await api.get<ApiProductDetail>(`/api/admin/products/${id}`);
    const manualFields = current.billzId ? manualFieldsFor(current.manualFields, patch) : current.manualFields;
    await api.write(`/api/admin/products/${id}`, 'PUT', { ...detailToInput(current), ...patch, manualFields }, 'product_update');
    const locked = current.billzId && manualFields.length > current.manualFields.length;
    return text(`Saqlandi: ${opts.adminUrl}/admin/products/${id}${locked ? '\nBillz tovari — tegilgan maydonlar endi qo\'lda boshqariladi.' : ''}`);
  });

  server.registerTool('product_set_images', {
    description: 'Tovarning rasmlarini almashtiradi: birinchisi asosiy rasm, qolgani galereya.',
    inputSchema: { id: z.string(), imageUrls: z.array(z.string()).min(1) },
  }, async (args: unknown) => {
    const parsed = args as { id: string; imageUrls: string[] };
    const current = await api.get<ApiProductDetail>(`/api/admin/products/${parsed.id}`);
    await api.write(`/api/admin/products/${parsed.id}`, 'PUT', { ...detailToInput(current), imageUrl: parsed.imageUrls[0], images: parsed.imageUrls.slice(1) }, 'product_set_images');
    return text(`Rasmlar yangilandi (${parsed.imageUrls.length} ta): ${opts.adminUrl}/admin/products/${parsed.id}`);
  });
}
