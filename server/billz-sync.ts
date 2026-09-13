import type { Env, SqlStatement } from '../shared/runtime';
import {
  BILLZ_BASE, productsUrl, utcStamp, hiddenIds, mapBillzProduct,
  type BillzProductsPage, type BillzShop, type BillzSyncResult, type BillzSyncStatus, type MapContext, type MappedProduct,
} from '../shared/billz';
import { imagesStatements, specsStatements } from '../shared/product-statements';

/**
 * Billz → sayt sinxronizatsiyasi (faqat o'qish: login + GET, boshqa hech narsa).
 *
 * Bitta jarayonda bitta runner: rejalashtirgich ham, admin tugmasi ham shu
 * obyektni chaqiradi, `running` qulfi ikki run'ni bir vaqtda yurgizmaydi.
 * JWT diskka yozilmaydi (xotirada, 401 → qayta login). Delta kursori ham
 * xotirada — restart to'liq run bilan boshlanadi (o'chirilganlarni ham ushlaydi).
 *
 * Docker `functions/`ni tashimaydi, shuning uchun bu fayl faqat `server/` va
 * `shared/`dan import qiladi va SQL'ni `Env` shartnomasi orqali yozadi.
 */
export interface BillzSyncHandle {
  status(): Promise<BillzSyncStatus>;
  /** Fon vazifasini boshlaydi va darhol qaytadi; natija `site_config.billz_last_sync`ga tushadi. */
  run(mode: 'full' | 'delta'): Promise<'started' | 'sync_running' | 'not_configured'>;
  shops(): Promise<BillzShop[]>;
  start(): void;
}

const DELTA_EVERY_MS = 30 * 60 * 1000;
const FULL_EVERY_MS = 6 * 60 * 60 * 1000;
const BOOT_DELAY_MS = 10 * 1000;
const MIN_GAP_MS = 500; // Billz chegarasi 2 so'rov/s
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const PHOTO_PARALLEL = 4;

interface Config { token: string; shopId: string; usdToUzs: number }

class BillzError extends Error {
  constructor(public code: string, message?: string) {
    super(message ?? code);
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function createBillzSync(env: Env): BillzSyncHandle {
  let running = false;
  let jwt: { token: string; expiresAt: number } | null = null;
  let lastSyncedAt: string | null = null; // UTC 'YYYY-MM-DD HH:MM:SS'
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

  function upsertStatements(m: MappedProduct, existingId: string | undefined): { stmts: SqlStatement[]; id: string } {
    const id = existingId ?? crypto.randomUUID();
    const stmts: SqlStatement[] = [];
    if (existingId) {
      // Egasining ustunlari (slug, condition, sort_order, reyting, sharhlar) tegilmaydi.
      stmts.push(env.DB.prepare(
        'UPDATE products SET name=?, category=?, cash_price_uzs=?, old_price_uzs=?, brand_id=?, category_id=?, type=?, description=?, billz_stock=?, is_active=?, image_url=? WHERE id=?',
      ).bind(m.name, m.legacyCategory, m.cashPriceUzs, m.oldPriceUzs, m.brandId, m.categoryId, m.type, m.description, m.stock, m.isActive ? 1 : 0, m.imageUrl, id));
    } else {
      stmts.push(env.DB.prepare(
        `INSERT INTO products (id, name, category, condition, condition_note, cash_price_uzs, image_url, sort_order, is_active, category_id, type, old_price_uzs, description, brand_id, slug, rating_avg, review_count, created_at, billz_id, billz_stock)
         VALUES (?, ?, ?, 'yangi', NULL, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, NULL, 0, unixepoch(), ?, ?)`,
      ).bind(id, m.name, m.legacyCategory, m.cashPriceUzs, m.imageUrl, m.isActive ? 1 : 0, m.categoryId, m.type, m.oldPriceUzs, m.description, m.brandId, m.slug, m.billzId, m.stock));
    }
    stmts.push(...specsStatements(env, id, m.specs));
    // Galereya faqat Billz'da rasm bo'lsa qayta yoziladi — admin yuklagan galereya rasmsiz tovarda qoladi.
    if (m.photos.length > 0) stmts.push(...imagesStatements(env, id, m.gallery));
    return { stmts, id };
  }

  async function execute(mode: 'full' | 'delta', cfg: Config): Promise<BillzSyncResult> {
    const startedAt = new Date();
    const since = mode === 'delta' && lastSyncedAt ? lastSyncedAt : undefined;
    const result: BillzSyncResult = {
      at: startedAt.toISOString(), mode: since ? 'delta' : 'full', ok: false,
      count: 0, seen: 0, inserted: 0, updated: 0, hidden: 0, photos: 0, skipped: 0,
    };

    const cats = await env.DB.prepare('SELECT id FROM categories').all<{ id: string }>();
    const categoryIds = new Set(cats.results.map((c) => c.id));
    const brands = await env.DB.prepare('SELECT id, name FROM brands').all<{ id: string; name: string }>();
    const brandsByName = new Map(brands.results.map((b) => [b.name.toLowerCase(), b.id]));
    const brandIds = new Set(brands.results.map((b) => b.id));
    const existingRows = await env.DB.prepare('SELECT id, billz_id, image_url FROM products WHERE billz_id IS NOT NULL')
      .all<{ id: string; billz_id: string; image_url: string }>();
    const existing = new Map(existingRows.results.map((r) => [r.billz_id, { id: r.id, image: r.image_url }]));
    const seen = new Set<string>();

    for (let page = 1; ; page++) {
      const data = await get<BillzProductsPage>(productsUrl(page, since), cfg.token);
      result.count = data.count;
      const products = data.products ?? [];
      if (products.length === 0) break;

      const mapped: MappedProduct[] = [];
      for (const raw of products) {
        const ctx: MapContext = {
          shopId: cfg.shopId, usdToUzs: cfg.usdToUzs, categoryIds, brandsByName,
          existingImage: existing.get(raw.id)?.image || null,
        };
        const m = mapBillzProduct(raw, ctx);
        if (m) mapped.push(m);
        else result.skipped++;
      }

      const { downloaded, failed } = await fetchPhotos(mapped);
      result.photos += downloaded;

      const stmts: SqlStatement[] = [];
      for (const m of mapped) {
        if (m.newBrand && !brandIds.has(m.newBrand.id)) {
          stmts.push(env.DB.prepare("INSERT INTO brands (id, name, slug, logo_url, sort_order) VALUES (?, ?, ?, '', 0)")
            .bind(m.newBrand.id, m.newBrand.name, m.newBrand.id));
          brandIds.add(m.newBrand.id);
          brandsByName.set(m.newBrand.name.toLowerCase(), m.newBrand.id);
        }
        const ex = existing.get(m.billzId);
        // Asosiy rasm yuklanmagan bo'lsa saytdagi rasm qoladi (bo'sh bo'lsa tovar ko'rinmaydi).
        let eff = m;
        if (m.photos.length > 0 && failed.has(m.photos[0].key)) {
          const imageUrl = ex?.image ?? '';
          eff = { ...m, photos: [], imageUrl, gallery: [], isActive: m.stock > 0 && imageUrl !== '' };
        }
        const { stmts: s, id } = upsertStatements(eff, ex?.id);
        stmts.push(...s);
        if (ex) result.updated++;
        else { result.inserted++; existing.set(m.billzId, { id, image: eff.imageUrl }); }
        seen.add(m.billzId);
      }
      if (stmts.length) await env.DB.batch(stmts);
      result.seen += products.length;
      if (result.seen >= data.count) break;
    }

    if (result.mode === 'full') {
      if (result.seen === result.count) {
        const gone = hiddenIds(existingRows.results.map((r) => r.billz_id), seen);
        if (gone.length) {
          await env.DB.batch(gone.map((bid) =>
            env.DB.prepare('UPDATE products SET is_active = 0, billz_stock = 0 WHERE billz_id = ?').bind(bid)));
        }
        result.hidden = gone.length;
      } else {
        // Sahifalash paytida katalog o'zgargan — yashirish keyingi to'liq run'ga qoladi.
        result.note = 'count_mismatch';
      }
    }
    lastSyncedAt = utcStamp(startedAt);
    result.ok = true;
    return result;
  }

  async function saveResult(r: BillzSyncResult): Promise<void> {
    await env.DB.prepare('UPDATE site_config SET billz_last_sync = ? WHERE id = 1').bind(JSON.stringify(r)).run();
    console.log(
      `billz sync ${r.mode}: ${r.ok ? 'ok' : `XATO ${r.error}`} seen=${r.seen}/${r.count} +${r.inserted} ~${r.updated} -${r.hidden} photos=${r.photos} skipped=${r.skipped}${r.note ? ` note=${r.note}` : ''}`,
    );
  }

  async function run(mode: 'full' | 'delta'): Promise<'started' | 'sync_running' | 'not_configured'> {
    if (running) return 'sync_running';
    const cfg = await config();
    if (!cfg) return 'not_configured';
    running = true;
    void (async () => {
      let result: BillzSyncResult;
      try {
        result = await execute(mode, cfg);
      } catch (err) {
        console.error('billz sync xato:', err);
        result = {
          at: new Date().toISOString(), mode, ok: false,
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
      const tick = (mode: 'full' | 'delta') => { void run(mode); };
      // unref — timerlar jarayonni tirik ushlab turmaydi (CLI/test chiqib ketaveradi).
      setTimeout(() => tick('full'), BOOT_DELAY_MS).unref();
      setInterval(() => tick('delta'), DELTA_EVERY_MS).unref();
      setInterval(() => tick('full'), FULL_EVERY_MS).unref();
    },
  };
}
