import { z } from 'zod';
import type { ApiAdminBrand, ApiCategory, ApiProduct, ApiProductDetail, ApiProductType } from './types.ts';
import {
  catalogStats, incompleteProducts, manualFieldsFor, detailToInput, type ProductPatch,
  applyVariantPrices, displayedPrice, priceAskText, priceChangeSummary,
} from './mcp-tools.ts';
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
    description: "Mavjud tovarni yangilaydi. Billz tovarida tegilgan maydon uchun «Qo'lda tahrirlash» qulfi avtomatik yoqiladi, aks holda 30 daqiqada Billz qiymati qaytadi.\n\n"
      + "NARX: variantsiz tovarda `cashPriceUzs` bilan. **Variantli tovarda** (xotira/rang bo'yicha har xil narx) saytda variant narxi ko'rinadi — "
      + "`cashPriceUzs` yuborsangiz hech narsa yozilmaydi va tool hozirgi narxlar ro'yxatini qaytaradi: uni egasiga sodda qilib o'qib bering va qaysi variant ekanini so'rang. "
      + "Javob kelgach `variantPrices` bilan qo'ying, masalan [{ value: '256GB', price: 25000000 }] — narx o'sha qiymatli hamma variantga (hamma rangga) tushadi. "
      + "Tool javobidagi «Saytda endi … ko'rinadi» qatorini ham albatta aytib bering — egasi natijani oldindan bilishi kerak.",
    inputSchema: {
      id: z.string(),
      name: z.string().optional(),
      description: z.string().optional(),
      cashPriceUzs: z.number().int().positive().optional(),
      variantPrices: z.array(z.object({ value: z.string(), price: z.number().int().positive() })).min(1).optional(),
      specs: z.array(z.object({ label: z.string(), value: z.string() })).optional(),
    },
  }, async (args: unknown) => {
    const parsed = args as { id: string; variantPrices?: { value: string; price: number }[] } & ProductPatch;
    const { id, variantPrices, ...patch } = parsed;
    const current = await api.get<ApiProductDetail>(`/api/admin/products/${id}`);
    const hasVariants = current.variants.length > 0;

    // Variantli tovarda asosiy narx saytda ko'rinmaydi — uni jimgina yozib «Saqlandi» deyish
    // mijoz oldida yolg'on muvaffaqiyat edi. Hech narsa yozmaymiz, tanlov beramiz.
    if (hasVariants && patch.cashPriceUzs !== undefined && !variantPrices) return text(priceAskText(current));
    if (!hasVariants && variantPrices) {
      throw new Error("Bu tovarda xotira yoki rang variantlari yo'q — narxni `cashPriceUzs` bilan o'zgartiring.");
    }

    // Variant narxlari: asosiy narx saytdagi «… dan» narxga tenglanadi, `patch.cashPriceUzs` e'tiborga olinmaydi.
    const next = variantPrices ? applyVariantPrices(current, variantPrices) : current;
    const effective: ProductPatch = variantPrices ? { ...patch, cashPriceUzs: displayedPrice(next) } : patch;
    const manualFields = current.billzId ? manualFieldsFor(current.manualFields, effective) : current.manualFields;
    await api.write(`/api/admin/products/${id}`, 'PUT', { ...detailToInput(next), ...effective, manualFields }, 'product_update');

    const link = `${opts.adminUrl}/admin/products/${id}`;
    if (variantPrices) return text(`${priceChangeSummary(current, next)}\n${link}`);
    const locked = current.billzId && manualFields.length > current.manualFields.length;
    return text(`Saqlandi: ${link}${locked ? '\nBillz tovari — tegilgan maydonlar endi qo\'lda boshqariladi.' : ''}`);
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

  server.registerTool('product_set_visibility', {
    description: "Tovarni saytda ko'rsatadi yoki yashiradi. Billz tovarini yashirish vaqtinchalik: sinxronizatsiya har 30 daqiqada ko'rinishni qoldiq va rasmga qarab qayta hisoblaydi va uni qaytarib ochishi mumkin — doimiy yashirish admin panelidan qilinadi. Tovar o'chirilmaydi, faqat ko'rinishi o'zgaradi.",
    inputSchema: { id: z.string(), visible: z.boolean() },
  }, async (args: unknown) => {
    const parsed = args as { id: string; visible: boolean };
    // Admin panelidagi toggle bilan bir xil endpoint — `PATCH` faqat `is_active`ni yozadi,
    // shuning uchun to'liq `PUT` dagi kabi boshqa maydonlarni o'chirib yuborish xavfi yo'q.
    const updated = await api.write<ApiProduct>(`/api/admin/products/${parsed.id}`, 'PATCH', { isActive: parsed.visible }, 'product_set_visibility');
    const what = parsed.visible ? "Saytda ko'rsatildi" : 'Saytdan yashirildi';
    // Billz `is_active`ni o'zi boshqaradi (`qoldiq > 0 && rasm bor`), qo'l maydonlari ro'yxatida
    // `active` yo'q — ya'ni bu yerdagi yashirish keyingi run'gacha yashaydi. Shuni aytib qo'yamiz.
    const note = updated.billzId && !parsed.visible
      ? "\nBu Billz tovari — sinxronizatsiya 30 daqiqa ichida uni qaytarib ochishi mumkin (qoldig'i va rasmi bo'lsa). Doimiy yashirish uchun admin panelidan foydalaning."
      : '';
    return text(`${what}: ${opts.adminUrl}/admin/products/${parsed.id}${note}`);
  });
}
