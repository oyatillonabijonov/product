import { z } from 'zod';
import type { ApiAdminBrand, ApiCategory, ApiProduct, ApiProductDetail, ApiProductType, ApiSpec } from './types.ts';
import {
  catalogStats, incompleteProducts, detailToInput,
  applyVariantPrices, displayedPrice, priceAskText, priceChangeSummary, priceText, discountPct, upsertSpecs,
  type VariantPriceUpdate,
} from './mcp-tools.ts';
import { applyManualEdits } from './billz.ts';
import { isSafeImageUrl, tooLarge } from './mcp-image.ts';
import type { AdminClient } from './mcp-client.ts';

/**
 * Ikkala transportda bir xil ishlaydigan tool'lar. Fayl tizimiga bog'liq yagona tool
 * (`image_upload_from_path`) bu yerda **yo'q** — u `mcp/tools.ts` da, faqat stdio uchun.
 * Bu fayl `shared/` da turadi, chunki remote transport (`server/mcp.ts`) Docker image'da
 * ishlaydi va u yerda `mcp/` papkasi yo'q.
 */
export interface McpToolHost {
  registerTool: (
    name: string,
    cfg: { description: string; inputSchema: Record<string, z.ZodTypeAny> },
    run: (args: unknown) => Promise<{ content: { type: 'text'; text: string }[] }>
  ) => void;
}

export const text = (s: string) => ({ content: [{ type: 'text' as const, text: s }] });

export const MAX_IMAGE = 5 * 1024 * 1024;

export function registerSharedTools(server: McpToolHost, api: AdminClient, opts: { adminUrl: string }): void {
  const products = () => api.get<ApiProduct[]>('/api/admin/products');

  server.registerTool('catalog_stats', {
    description: "Katalog holati: jami tovar, faol/yashirin, rasmi yo'q, tavsifi yo'q, qoldiq 0, Billz va qo'lda kiritilganlar soni. Bu yerda hamma tovar sanaladi, qo'lda kiritilganlari ham — admin panelidagi «Rasm kerak» esa faqat rasmi yo'q Billz tovarlarini sanaydi, shuning uchun sonlar farq qilishi mumkin.",
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
    description: "Rasmni https havoladan yuklab saytga qo'yadi. Javob — saytdagi rasm manzillari. Chatga tashlangan rasm faylini bu tool ololmaydi — buning uchun `image_upload_link` bilan havola bering.",
    inputSchema: { urls: z.array(z.string().url()).min(1).max(10) },
  }, async (args: unknown) => {
    const parsed = args as { urls: string[] };
    const out: string[] = [];
    for (const u of parsed.urls) {
      const safe = isSafeImageUrl(u);
      if (!safe.ok) throw new Error(safe.reason);
      const res = await fetch(safe.url, { redirect: 'manual' });
      if (!res.ok) throw new Error(`Rasm yuklanmadi (${res.status}): ${u}`);
      const type = res.headers.get('content-type') ?? '';
      if (!type.startsWith('image/')) throw new Error(`Bu rasm emas (${type}): ${u}`);
      if (tooLarge(res.headers.get('content-length'), MAX_IMAGE)) throw new Error(`5 MB dan katta: ${u}`);
      const bytes = new Uint8Array(await res.arrayBuffer());
      if (bytes.byteLength > MAX_IMAGE) throw new Error(`5 MB dan katta: ${u}`);
      const name = safe.url.pathname.split('/').pop() || 'image';
      out.push(await api.upload(bytes, name, type, 'image_upload_from_url'));
    }
    return text(out.join('\n'));
  });

  server.registerTool('product_create', {
    description: "Yangi tovar qo'shadi va **darhol saytda chiqaradi**. `type` ni avval `types_list` dan tanlang. Rasm bo'lmasa egasiga ayting va `image_upload_link` bilan havola bering.",
    inputSchema: {
      name: z.string().min(2),
      categoryId: z.enum(['apple', 'pc', 'audio', 'video']),
      type: z.string(),
      cashPriceUzs: z.number().int().positive(),
      oldPriceUzs: z.number().int().positive().optional(),
      description: z.string().optional(),
      brandId: z.string().optional(),
      condition: z.enum(['yangi', 'ishlatilgan']).default('yangi'),
      specs: z.array(z.object({ label: z.string(), value: z.string() })).optional(),
      imageUrls: z.array(z.string()).optional(),
    },
  }, async (args: unknown) => {
    const parsed = args as {
      name: string; categoryId: string; type: string; cashPriceUzs: number; oldPriceUzs?: number;
      description?: string; brandId?: string; condition: 'yangi' | 'ishlatilgan';
      specs?: ApiSpec[]; imageUrls?: string[];
    };
    if (parsed.oldPriceUzs !== undefined && discountPct(parsed.cashPriceUzs, parsed.oldPriceUzs) === null) {
      throw new Error("Eski narx yangi narxdan katta bo'lishi kerak — aks holda saytda chegirma belgisi chiqmaydi.");
    }
    const images = parsed.imageUrls ?? [];
    const created = await api.write<{ id: string }>('/api/admin/products', 'POST', {
      name: parsed.name, categoryId: parsed.categoryId, type: parsed.type,
      condition: parsed.condition, conditionNote: null, cashPriceUzs: parsed.cashPriceUzs,
      oldPriceUzs: parsed.oldPriceUzs ?? null, description: parsed.description ?? null,
      imageUrl: images[0] ?? '', images: images.slice(1), specs: upsertSpecs([], parsed.specs ?? []),
      sortOrder: 0, isActive: true, brandId: parsed.brandId ?? null, slug: null,
      ratingAvg: null, reviewCount: 0, preorder: false, options: [], variants: [], manualFields: [],
    }, 'product_create');
    const link = `${opts.adminUrl}/admin/products/${created.id}`;
    return text(images.length > 0
      ? `Qo'shildi va saytda chiqdi. Narx: ${priceText(parsed.cashPriceUzs, parsed.oldPriceUzs ?? null)}\n${link}`
      : `Qo'shildi va saytda chiqdi, lekin rasmi yo'q — saytda rasmsiz ko'rinadi. Rasm qo'shish uchun \`image_upload_link\` bilan egasiga havola bering yoki rasm manzilini so'rang.\n${link}`);
  });

  server.registerTool('product_update', {
    description: "Mavjud tovarni yangilaydi. Billz tovarida o'zgartirilgan maydon qulflanadi — sinxronizatsiya unga boshqa tegmaydi.\n\n"
      + "NARX: variantsiz tovarda `cashPriceUzs`, chegirma — `oldPriceUzs` (yangi narxdan katta; `null` — chegirmani olib tashlash). "
      + "**Variantli tovarda** (xotira/rang bo'yicha har xil narx) `cashPriceUzs`/`oldPriceUzs` yuborsangiz hech narsa yozilmaydi va tool hozirgi narxlar ro'yxatini qaytaradi: "
      + "uni egasiga sodda qilib o'qib bering va qaysi variant ekanini so'rang. Keyin `variantPrices` bilan qo'ying, masalan "
      + "[{ value: '256GB', price: 25000000, oldPrice: 28000000 }] — o'sha qiymatli hamma variantga (hamma rangga) tushadi. "
      + "Javobdagi «Saytda endi … ko'rinadi» qatorini albatta aytib bering.\n\n"
      + "XUSUSIYATLAR: `specs` nom bo'yicha qo'shadi yoki qiymatini yangilaydi, qolganlariga tegmaydi; `removeSpecs` — nom bo'yicha o'chiradi.\n"
      + "TAVSIF: butun matn almashadi — qo'shimcha kerak bo'lsa avval `product_get` bilan o'qing va to'liq yangi matnni yuboring.",
    inputSchema: {
      id: z.string(),
      name: z.string().optional(),
      description: z.string().optional(),
      cashPriceUzs: z.number().int().positive().optional(),
      oldPriceUzs: z.number().int().positive().nullable().optional(),
      variantPrices: z.array(z.object({
        value: z.string(), price: z.number().int().positive(), oldPrice: z.number().int().positive().nullable().optional(),
      })).min(1).optional(),
      specs: z.array(z.object({ label: z.string(), value: z.string() })).optional(),
      removeSpecs: z.array(z.string()).optional(),
    },
  }, async (args: unknown) => {
    const a = args as {
      id: string; name?: string; description?: string; cashPriceUzs?: number; oldPriceUzs?: number | null;
      variantPrices?: VariantPriceUpdate[]; specs?: ApiSpec[]; removeSpecs?: string[];
    };
    const current = await api.get<ApiProductDetail>(`/api/admin/products/${a.id}`);
    const hasVariants = current.variants.length > 0;
    const pricing = a.cashPriceUzs !== undefined || a.oldPriceUzs !== undefined;

    // Variantli tovarda asosiy narx saytda ko'rinmaydi — uni jimgina yozib «Saqlandi» deyish mijoz oldida
    // yolg'on muvaffaqiyat edi (2026-09-24). Hech narsa yozmaymiz, tanlov beramiz.
    if (hasVariants && pricing && !a.variantPrices) return text(priceAskText(current));
    if (!hasVariants && a.variantPrices) {
      throw new Error("Bu tovarda xotira yoki rang variantlari yo'q — narxni `cashPriceUzs` bilan o'zgartiring.");
    }
    const cash = a.cashPriceUzs ?? current.cashPriceUzs;
    if (!hasVariants && a.oldPriceUzs != null && a.oldPriceUzs <= cash) {
      throw new Error(`Eski narx (${priceText(a.oldPriceUzs, null)}) yangi narxdan (${priceText(cash, null)}) katta bo'lishi kerak — aks holda saytda chegirma belgisi chiqmaydi.`);
    }

    const next = a.variantPrices ? applyVariantPrices(current, a.variantPrices) : current;
    const before = detailToInput(current);
    const body = detailToInput(next);
    if (a.name !== undefined) body.name = a.name;
    if (a.description !== undefined) body.description = a.description;
    // Variant narxida asosiy narx saytdagi «… dan» narxga tenglanadi.
    if (a.variantPrices) body.cashPriceUzs = displayedPrice(next);
    else if (a.cashPriceUzs !== undefined) body.cashPriceUzs = a.cashPriceUzs;
    if (!a.variantPrices && a.oldPriceUzs !== undefined) body.oldPriceUzs = a.oldPriceUzs;
    if (a.specs || a.removeSpecs) body.specs = upsertSpecs(current.specs, a.specs, a.removeSpecs);
    body.manualFields = current.billzId ? applyManualEdits(current.manualFields, before, body) : current.manualFields;
    await api.write(`/api/admin/products/${a.id}`, 'PUT', body, 'product_update');

    const link = `${opts.adminUrl}/admin/products/${a.id}`;
    if (a.variantPrices) return text(`${priceChangeSummary(current, next)}\n${link}`);
    const lines = ['Saqlandi.'];
    if (pricing) {
      lines.push(`Narx: ${priceText(body.cashPriceUzs, body.oldPriceUzs)}`);
      if (body.oldPriceUzs !== null && discountPct(body.cashPriceUzs, body.oldPriceUzs) === null) {
        lines.push("Eski narx yangi narxdan katta emas — saytda chegirma belgisi chiqmaydi.");
      }
    }
    if (a.specs || a.removeSpecs) lines.push('Xususiyatlar:', ...body.specs.map((s) => `• ${s.label} — ${s.value}`));
    if (current.billzId && body.manualFields.length > current.manualFields.length) {
      lines.push("Billz tovari — bu o'zgarishlar sinxronizatsiyada saqlanadi.");
    }
    lines.push(link);
    return text(lines.join('\n'));
  });

  server.registerTool('product_set_images', {
    description: "Tovarning rasmlarini almashtiradi: birinchisi asosiy rasm, qolgani galereya. Billz tovarida rasmlar qulflanadi — Billz rasmi ularni almashtirmaydi.",
    inputSchema: { id: z.string(), imageUrls: z.array(z.string()).min(1) },
  }, async (args: unknown) => {
    const parsed = args as { id: string; imageUrls: string[] };
    const current = await api.get<ApiProductDetail>(`/api/admin/products/${parsed.id}`);
    const before = detailToInput(current);
    const body = { ...before, imageUrl: parsed.imageUrls[0], images: parsed.imageUrls.slice(1) };
    body.manualFields = current.billzId ? applyManualEdits(current.manualFields, before, body) : current.manualFields;
    const saved = await api.write<ApiProduct>(`/api/admin/products/${parsed.id}`, 'PUT', body, 'product_set_images');
    return text(`Rasmlar yangilandi (${parsed.imageUrls.length} ta). ${saved.isActive ? "Tovar saytda ko'rinadi." : 'Tovar saytda yashirin.'}\n${opts.adminUrl}/admin/products/${parsed.id}`);
  });

  server.registerTool('product_set_visibility', {
    description: "Tovarni saytda ko'rsatadi yoki yashiradi. Yashirilgan tovar shunday qoladi — Billz uni qaytarib ochmaydi. Tovar o'chirilmaydi. Billz tovari rasmsiz ko'rsatilmaydi — bunday holda egasiga `image_upload_link` bilan havola bering; qo'lda kiritilgan tovar rasmsiz ham ko'rsatiladi.",
    inputSchema: { id: z.string(), visible: z.boolean() },
  }, async (args: unknown) => {
    const parsed = args as { id: string; visible: boolean };
    // Admin toggle'i bilan bir xil `PATCH`: faqat `is_active` (va Billz tovarida `hidden` qulfi) yoziladi.
    const updated = await api.write<ApiProduct>(`/api/admin/products/${parsed.id}`, 'PATCH', { isActive: parsed.visible }, 'product_set_visibility');
    const link = `${opts.adminUrl}/admin/products/${parsed.id}`;
    if (parsed.visible && !updated.isActive) {
      return text(`Saytda chiqmadi: tovarda rasm yo'q. Rasm qo'shilishi bilan o'zi chiqadi.\n${link}`);
    }
    return text(`${parsed.visible ? "Saytda ko'rsatildi" : 'Saytdan yashirildi'}: ${link}`);
  });

  server.registerTool('image_upload_link', {
    description: "Telefondan rasm yuklash havolasi: faqat shu tovar uchun, 30 daqiqa davomida istalgancha ochish mumkin. Chatga tashlangan rasmni saytga uzatib bo'lmaydi — egasi rasm yubormoqchi bo'lsa yoki tovarda rasm yo'q bo'lsa shu havolani bering. Bosadi, galereyadan tanlaydi, rasmlar tovarga o'zi qo'shiladi. Rasmsiz Billz tovari rasm qo'shilgach saytda chiqadi — egasi uni yashirgan bo'lsa, yashirinligicha qoladi.",
    inputSchema: { id: z.string() },
  }, async (args: unknown) => {
    const { id } = args as { id: string };
    const r = await api.write<{ url: string; expiresAt: number }>(`/api/admin/products/${id}/upload-link`, 'POST', {}, 'image_upload_link');
    return text(`Rasm yuklash havolasi (30 daqiqa ishlaydi):\n${r.url}\n\nBosing → «Rasm tanlash» → galereyadan rasmlarni tanlang. Rasmlar tovarga o'zi qo'shiladi.`);
  });
}
