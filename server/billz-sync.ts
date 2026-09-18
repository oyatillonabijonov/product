import type { Env, SqlStatement } from '../shared/runtime';
import {
  BILLZ_BASE, productsUrl, hiddenIds, mapBillzProduct, mergeDuplicates, nameKey,
  type BillzProduct, type BillzProductsPage, type BillzShop, type BillzSyncResult, type BillzSyncStatus, type MapContext, type MappedProduct,
  parseManualFields,
} from '../shared/billz.ts';
import { rowToProductType, type ProductTypeDbRow } from '../shared/product-types.ts';
import { imagesStatements, specsStatements } from '../shared/product-statements.ts';

/**
 * Billz → sayt sinxronizatsiyasi (faqat o'qish: login + GET, boshqa hech narsa).
 *
 * Bitta jarayonda bitta runner: rejalashtirgich ham, admin tugmasi ham shu
 * obyektni chaqiradi, `running` qulfi ikki run'ni bir vaqtda yurgizmaydi.
 * JWT diskka yozilmaydi (xotirada, 401 → qayta login).
 *
 * Har run to'liq: butun katalog o'qiladi (≈8 sahifa, arzon), bir nomdagi Billz
 * yozuvlari (har dona alohida tovar) bitta sayt mahsulotiga birlashtiriladi va
 * qoldiq yig'iladi. Delta (last_updated_date) rejimi olib tashlandi — u guruhning
 * bitta a'zosini keltirib yig'indi qoldiqni buzardi va o'chirilganlarni ko'rmasdi.
 *
 * Docker `functions/`ni tashimaydi, shuning uchun bu fayl faqat `server/` va
 * `shared/`dan import qiladi va SQL'ni `Env` shartnomasi orqali yozadi.
 */
export interface BillzSyncHandle {
  status(): Promise<BillzSyncStatus>;
  /** Fon vazifasini boshlaydi va darhol qaytadi; natija `site_config.billz_last_sync`ga tushadi. */
  run(): Promise<'started' | 'sync_running' | 'not_configured'>;
  shops(): Promise<BillzShop[]>;
  start(): void;
}

const EVERY_MS = 30 * 60 * 1000;
const BOOT_DELAY_MS = 10 * 1000;
const WRITE_BATCH = 200;
const MIN_GAP_MS = 500; // Billz chegarasi 2 so'rov/s
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const PHOTO_PARALLEL = 4;

interface Config { token: string; shopId: string; usdToUzs: number }

// Node strip-only rejimi parametr-xususiyatni (`public code`) qo'llamaydi — maydon alohida.
class BillzError extends Error {
  code: string;
  constructor(code: string, message?: string) {
    super(message ?? code);
    this.code = code;
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function createBillzSync(env: Env): BillzSyncHandle {
  let running = false;
  let jwt: { token: string; expiresAt: number } | null = null;
  let lastRequestAt = 0;

  async function config(): Promise<Config | null> {
    const cfg = await env.DB.prepare('SELECT billz_secret_token AS token, billz_shop_id AS shopId FROM site_config WHERE id = 1')
      .first<{ token: string; shopId: string }>();
    const s = await env.DB.prepare('SELECT usd_to_uzs AS usdToUzs FROM settings WHERE id = 1').first<{ usdToUzs: number }>();
    if (!cfg?.token || !cfg.shopId || !s?.usdToUzs) return null;
    return { token: cfg.token, shopId: cfg.shopId, usdToUzs: s.usdToUzs };
  }

  async function throttle(): Promise<void> {
    const wait = lastRequestAt + MIN_GAP_MS - Date.now();
    if (wait > 0) await sleep(wait);
    lastRequestAt = Date.now();
  }

  async function login(secret: string): Promise<string> {
    await throttle();
    const res = await fetch(`${BILLZ_BASE}/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret_token: secret }),
    });
    if (!res.ok) throw new BillzError('login_failed', `login http_${res.status}`);
    const body = (await res.json()) as { data?: { access_token?: string; expires_in?: number } };
    const token = body.data?.access_token;
    if (!token) throw new BillzError('login_failed', "login: token yo'q");
    jwt = { token, expiresAt: Date.now() + ((body.data?.expires_in ?? 3600) - 60) * 1000 };
    return token;
  }

  /** GET JSON: throttle, 401 → bir marta qayta login, 429 → 2 s kutib qayta (3 marta). */
  async function get<T>(url: string, secret: string, retried = false): Promise<T> {
    const token = jwt && jwt.expiresAt > Date.now() ? jwt.token : await login(secret);
    for (let attempt = 0; ; attempt++) {
      await throttle();
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (res.status === 429 && attempt < 3) { await sleep(2000); continue; }
      if (res.status === 401 && !retried) { jwt = null; return get<T>(url, secret, true); }
      if (!res.ok) throw new BillzError(`http_${res.status}`, `${url} → ${res.status}`);
      return (await res.json()) as T;
    }
  }

  /** Bitta rasm: bor bo'lsa tegilmaydi; host allowlist `photoKey`da, bu yerda hajm va tur. */
  async function fetchPhoto(url: string, key: string): Promise<'downloaded' | 'exists' | 'failed'> {
    if (await env.IMAGES.has(key)) return 'exists';
    try {
      const res = await fetch(url, { redirect: 'manual' });
      if (!res.ok || !(res.headers.get('content-type') ?? '').startsWith('image/')) return 'failed';
      const buf = await res.arrayBuffer();
      if (buf.byteLength === 0 || buf.byteLength > MAX_PHOTO_BYTES) return 'failed';
      await env.IMAGES.put(key, buf);
      return 'downloaded';
    } catch {
      return 'failed';
    }
  }

  /** Sahifadagi barcha rasmlar, PHOTO_PARALLEL tadan (CDN — API chegarasiga kirmaydi). */
  async function fetchPhotos(items: MappedProduct[]): Promise<{ downloaded: number; failed: Set<string> }> {
    const jobs = items.flatMap((m) => m.photos);
    const failed = new Set<string>();
    let downloaded = 0;
    let next = 0;
    await Promise.all(Array.from({ length: PHOTO_PARALLEL }, async () => {
      while (next < jobs.length) {
        const job = jobs[next++];
        const r = await fetchPhoto(job.url, job.key);
        if (r === 'downloaded') downloaded++;
        else if (r === 'failed') failed.add(job.key);
      }
    }));
    return { downloaded, failed };
  }

  function upsertStatements(m: MappedProduct, existingId: string | undefined, manualRaw?: string): { stmts: SqlStatement[]; id: string } {
    const id = existingId ?? crypto.randomUUID();
    const stmts: SqlStatement[] = [];
    // Egasi admin'da qo'lda yozgan maydonlar (`products.manual_fields`) — ular UPDATE'dan
    // chiqariladi, aks holda har 30 daqiqada Billz qiymati ustiga yozilardi.
    const manual = parseManualFields(manualRaw);
    if (existingId) {
      // Egasining ustunlari (slug, condition, sort_order, reyting, sharhlar) tegilmaydi.
      const cols = ['name=?', 'category=?', 'brand_id=?', 'category_id=?', 'type=?', 'billz_stock=?', 'is_active=?', 'image_url=?'];
      const vals: unknown[] = [m.name, m.legacyCategory, m.brandId, m.categoryId, m.type, m.stock, m.isActive ? 1 : 0, m.imageUrl];
      if (!manual.includes('price')) {
        cols.push('cash_price_uzs=?', 'old_price_uzs=?');
        vals.push(m.cashPriceUzs, m.oldPriceUzs);
      }
      if (!manual.includes('description')) {
        cols.push('description=?');
        vals.push(m.description);
      }
      stmts.push(env.DB.prepare(`UPDATE products SET ${cols.join(', ')} WHERE id=?`).bind(...vals, id));
    } else {
      stmts.push(env.DB.prepare(
        `INSERT INTO products (id, name, category, condition, condition_note, cash_price_uzs, image_url, sort_order, is_active, category_id, type, old_price_uzs, description, brand_id, slug, rating_avg, review_count, created_at, billz_id, billz_stock)
         VALUES (?, ?, ?, 'yangi', NULL, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, NULL, 0, unixepoch(), ?, ?)`,
      ).bind(id, m.name, m.legacyCategory, m.cashPriceUzs, m.imageUrl, m.isActive ? 1 : 0, m.categoryId, m.type, m.oldPriceUzs, m.description, m.brandId, m.slug, m.billzId, m.stock));
    }
    if (!manual.includes('specs')) stmts.push(...specsStatements(env, id, m.specs));
    // Galereya faqat Billz'da rasm bo'lsa qayta yoziladi — admin yuklagan galereya rasmsiz tovarda qoladi.
    if (m.photos.length > 0) stmts.push(...imagesStatements(env, id, m.gallery));
    return { stmts, id };
  }

  interface ExistingRow { id: string; billz_id: string; image_url: string; name: string; manual_fields: string }

  async function execute(cfg: Config): Promise<BillzSyncResult> {
    const result: BillzSyncResult = {
      at: new Date().toISOString(), mode: 'full', ok: false,
      count: 0, seen: 0, inserted: 0, updated: 0, hidden: 0, photos: 0, skipped: 0,
    };

    const cats = await env.DB.prepare('SELECT id FROM categories').all<{ id: string }>();
    const categoryIds = new Set(cats.results.map((c) => c.id));
    const brands = await env.DB.prepare('SELECT id, name FROM brands').all<{ id: string; name: string }>();
    const brandsByName = new Map(brands.results.map((b) => [b.name.toLowerCase(), b.id]));
    const brandIds = new Set(brands.results.map((b) => b.id));
    // Turlar bazadan (registr yo'q) — run boshida bir marta; Billz kategoriya nomi shulardan biriga tushadi.
    const typeRows = await env.DB.prepare('SELECT * FROM product_types').all<ProductTypeDbRow>();
    const types = typeRows.results.map(rowToProductType);
    // Mavjud Billz qatorlari — nom bo'yicha (bir nomga bir nechta qator bo'lsa eng eskisi
    // vakil, qolganlari run oxirida yashiriladi) va billz_id bo'yicha (nom o'zgargan holat).
    const existingRows = await env.DB.prepare(
      'SELECT id, billz_id, image_url, name, manual_fields FROM products WHERE billz_id IS NOT NULL ORDER BY created_at ASC, id ASC',
    ).all<ExistingRow>();
    const byBillzId = new Map(existingRows.results.map((r) => [r.billz_id, r]));
    const byName = new Map<string, ExistingRow>();
    for (const r of existingRows.results) { const k = nameKey(r.name); if (!byName.has(k)) byName.set(k, r); }
    const findRow = (billzId: string, name: string): ExistingRow | undefined =>
      byName.get(nameKey(name)) ?? byBillzId.get(billzId);

    // 1) Butun katalog — dublikatlar sahifalar orasida bo'lishi mumkin, shuning uchun
    //    avval hammasi o'qiladi. Billz sahifalashi beqaror: id bo'yicha noyoblanadi.
    const raws = new Map<string, BillzProduct>();
    let fetched = 0;
    for (let page = 1; ; page++) {
      const data = await get<BillzProductsPage>(productsUrl(page), cfg.token);
      result.count = data.count;
      const products = data.products ?? [];
      if (products.length === 0) break;
      for (const raw of products) raws.set(raw.id, raw);
      fetched += products.length;
      if (fetched >= data.count) break;
    }
    result.seen = raws.size;

    // 2) Moslashtirish va bir nomdagilarni birlashtirish.
    const mapped: MappedProduct[] = [];
    for (const raw of raws.values()) {
      const ctx: MapContext = {
        shopId: cfg.shopId, usdToUzs: cfg.usdToUzs, categoryIds, brandsByName, types,
        existingImage: findRow(raw.id, raw.name ?? '')?.image_url || null,
      };
      const m = mapBillzProduct(raw, ctx);
      if (m) mapped.push(m);
      else result.skipped++;
    }
    const merged = mergeDuplicates(mapped);

    // 3) Rasmlar (CDN, bor bo'lsa o'tkazib yuboriladi).
    const { downloaded, failed } = await fetchPhotos(merged);
    result.photos = downloaded;

    // 4) Yozish — 200 tadan atomik batch.
    const seenRows = new Set<string>(); // shu run'da yozilgan qatorlarning billz_id'si
    for (let i = 0; i < merged.length; i += WRITE_BATCH) {
      const stmts: SqlStatement[] = [];
      for (const m of merged.slice(i, i + WRITE_BATCH)) {
        if (m.newBrand && !brandIds.has(m.newBrand.id)) {
          stmts.push(env.DB.prepare("INSERT INTO brands (id, name, slug, logo_url, sort_order) VALUES (?, ?, ?, '', 0)")
            .bind(m.newBrand.id, m.newBrand.name, m.newBrand.id));
          brandIds.add(m.newBrand.id);
          brandsByName.set(m.newBrand.name.toLowerCase(), m.newBrand.id);
        }
        const ex = findRow(m.billzId, m.name);
        // Asosiy rasm yuklanmagan bo'lsa saytdagi rasm qoladi (bo'sh bo'lsa tovar ko'rinmaydi).
        let eff = m;
        if (m.photos.length > 0 && failed.has(m.photos[0].key)) {
          const imageUrl = ex?.image_url ?? '';
          eff = { ...m, photos: [], imageUrl, gallery: [], isActive: m.stock > 0 && imageUrl !== '' };
        }
        const { stmts: s, id } = upsertStatements(eff, ex?.id, ex?.manual_fields);
        stmts.push(...s);
        if (ex) { result.updated++; seenRows.add(ex.billz_id); }
        else {
          result.inserted++;
          seenRows.add(m.billzId);
          const row: ExistingRow = { id, billz_id: m.billzId, image_url: eff.imageUrl, name: m.name, manual_fields: '' };
          byBillzId.set(m.billzId, row);
          byName.set(nameKey(m.name), row);
        }
      }
      if (stmts.length) await env.DB.batch(stmts);
    }

    // 5) Bu run'da yozilmagan qatorlar yashiriladi. Ikki tur:
    //    - nomi shu run'da ko'rilgan qator (eski dublikat) — har doim: tovar boshqa qatorda bor;
    //    - nomi umuman ko'rinmagan qator (Billz'dan o'chirilgan) — faqat butun katalog
    //      o'qilgan bo'lsa (Billz sahifalashi beqaror, 1–5 yozuv tushib qolishi mumkin).
    const gone = hiddenIds(existingRows.results.map((r) => r.billz_id), seenRows);
    const seenNames = new Set(merged.map((m) => nameKey(m.name)));
    const complete = result.seen === result.count;
    const toHide = gone.filter((bid) => complete || seenNames.has(nameKey(byBillzId.get(bid)?.name ?? '')));
    if (toHide.length) {
      await env.DB.batch(toHide.map((bid) =>
        env.DB.prepare('UPDATE products SET is_active = 0, billz_stock = 0 WHERE billz_id = ?').bind(bid)));
    }
    result.hidden = toHide.length;
    if (!complete) result.note = 'count_mismatch';
    result.ok = true;
    return result;
  }

  async function saveResult(r: BillzSyncResult): Promise<void> {
    await env.DB.prepare('UPDATE site_config SET billz_last_sync = ? WHERE id = 1').bind(JSON.stringify(r)).run();
    console.log(
      `billz sync ${r.mode}: ${r.ok ? 'ok' : `XATO ${r.error}`} seen=${r.seen}/${r.count} +${r.inserted} ~${r.updated} -${r.hidden} photos=${r.photos} skipped=${r.skipped}${r.note ? ` note=${r.note}` : ''}`,
    );
  }

  async function run(): Promise<'started' | 'sync_running' | 'not_configured'> {
    if (running) return 'sync_running';
    const cfg = await config();
    if (!cfg) return 'not_configured';
    running = true;
    void (async () => {
      let result: BillzSyncResult;
      try {
        result = await execute(cfg);
      } catch (err) {
        console.error('billz sync xato:', err);
        result = {
          at: new Date().toISOString(), mode: 'full', ok: false,
          count: 0, seen: 0, inserted: 0, updated: 0, hidden: 0, photos: 0, skipped: 0,
          error: err instanceof BillzError ? err.code : 'network',
        };
      } finally {
        running = false;
      }
      await saveResult(result).catch((e) => console.error('billz natijani saqlash:', e));
    })();
    return 'started';
  }

  return {
    async status() {
      const row = await env.DB.prepare('SELECT billz_secret_token AS token, billz_shop_id AS shopId, billz_last_sync AS last FROM site_config WHERE id = 1')
        .first<{ token: string; shopId: string; last: string }>();
      let last: BillzSyncResult | null = null;
      try { last = row?.last ? (JSON.parse(row.last) as BillzSyncResult) : null; } catch { last = null; }
      return { configured: Boolean(row?.token && row.shopId), running, last };
    },
    run,
    async shops() {
      const row = await env.DB.prepare('SELECT billz_secret_token AS token FROM site_config WHERE id = 1').first<{ token: string }>();
      if (!row?.token) throw new BillzError('not_configured');
      const data = await get<{ shops: BillzShop[] | null }>(`${BILLZ_BASE}/v1/shop`, row.token);
      return (data.shops ?? []).map((s) => ({ id: s.id, name: s.name }));
    },
    start() {
      // unref — timerlar jarayonni tirik ushlab turmaydi (CLI/test chiqib ketaveradi).
      setTimeout(() => { void run(); }, BOOT_DELAY_MS).unref();
      setInterval(() => { void run(); }, EVERY_MS).unref();
    },
  };
}
