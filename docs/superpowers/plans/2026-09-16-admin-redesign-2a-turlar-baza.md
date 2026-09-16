# Admin qayta qurilishi — 2a-bosqich: Tovar turlari bazada, Billz/sayt bazadan, brend tasmasi, kategoriya tozalash (reja)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `shared/product-types.ts` registri `product_types` jadvaliga ko'chadi (admin CRUD, sayt tile qatori, Billz moslash va mahsulot validatsiyasi bazadan o'qiydi), landing brend tasmasi `brands.logo_url`dan chiziladi, kategoriya formasidagi o'lik maydonlar (ikonka tanlagichi, cover izohi) olib tashlanadi.

**Architecture:** "Kengaytir → ko'chir → qisqartir": avval bazadagi qator shakli (`ProductTypeRow`) va sof yordamchilar (`typesOf`, `matchBillzType`) eski registr **yonida** qo'shiladi, keyin har iste'molchi (tile qatori, Billz runner, validatsiya/route, admin forma) birma-bir bazaga o'tkaziladi, oxirgi task eski registrni o'chiradi — har task lint/test bilan yashil. Migratsiya `0035` uchta jadval yaratadi (`product_types` + 39 qator seed; spec §6 dagi `site_texts`/`site_assets` — 4-bosqich ishlatadi) va 16 brend logotipini `public/brands/`ga ko'chirib `brands.logo_url`ga yozadi. Admin "Turlar" tabi 1-bosqich kit'i ustida.

**Tech Stack:** React Router v7 (resource route'lar, `+types` typegen), SQLite (`env.DB.prepare().bind().first/all/run`, `env.DB.batch`), Node type-stripping (`server/`dan `shared/` importlari `.ts` kengaytmali), vitest, 1-bosqich UI-kit (`src/admin/ui/`), lucide-react.

**Spec:** `docs/superpowers/specs/2026-09-15-admin-redesign-design.md` — §5 "Turlar", "Kategoriyalar · Brendlar", §6 (`product_types`, API), §7 (turlar, `BrandStrip`), §10.2. **Spec tuzatishi (bu reja bilan):** tur ikonkasi fayli **220×136** qutiga sig'diriladi (spec'dagi "440×272" xato — mavjud `public/sections/*.webp` ikonkalar 220×136 va sayt ularni `[zoom:0.5]` bilan 110×68 da chizadi). 2-bosqichning qolgani — mahsulot ro'yxati/tahrir ekranlari — alohida **2b** rejasi.

## Global Constraints

- **Node 22.18+, `bun`** (npm emas). Har task oxirida `bun run lint` (typegen + tsc ×2) va `bun run test` toza.
- **Migratsiya:** faqat yangi fayl `migrations/0035_product_types.sql` (qo'llanganlar tahrirlanmaydi); lokalda `bun run migrate` bilan qo'llanadi (dev server ishlayotganda ham mumkin — WAL). Jadval kaliti `(category_id, id)`.
- **`shared/` fayllar** `server/`dan import qilinadi → o'zaro importlar **`.ts` kengaytmali** (`./product-types.ts`), parametr-xususiyat (`constructor(public x)`) yo'q. `functions/` `src/`ni ko'rmaydi; `app/routes/*` ikkalasini ham ko'radi.
- **Strict TypeScript, `any` yo'q.** `@types/react` yo'q: `useState(x as T)` + cast, hook'larga generik berilmaydi, `key` faqat native element/`FC<{…}>`da; event tiplari `src/admin/react-events.d.ts` shim'idan.
- **Admin UI faqat kit va tokenlar:** `src/admin/ui/` primitivlari; hex yo'q (`white` faqat `cta`/`danger` to'ldirmasi ustida), `text-[Npx]` yo'q (shkala: `text-heading/subhead/copy/control/para/label`), radius `rounded-xs/sm/md/lg/xl/full`, `shadow-*` yo'q, `bg-white`/`text-white` yuza uchun yo'q, `press` har bosiladigan elementda va ustiga `transition-*` yo'q, tugma matni 400.
- **Admin API:** har route `requireAdmin` (`if (who instanceof Response) return who;`) + `parseBody(body, parseFn)`; javob `json()`; xato kodlari `src/admin/errText.ts`ga.
- UI matni va izohlar o'zbekcha; ataylab soddalashtirilgan joyga `// ponytail:`.
- **Commit faqat egasi tasdig'i bilan** (CLAUDE.md) — bajarish boshida egasi 1-bosqichdagidek task'ma-task commit'ga ruxsat bersa, har task oxirida commit; format `feat:`/`fix:`/`chore:`/`docs:`, trailer `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
- Dev server `bun run dev` (:3000) egasi tomonida ishlab turgan bo'lishi mumkin — **qayta ishga tushirilmaydi**; admin'ga kirishni egasi qiladi (parol yozilmaydi).

---

## Fayl xaritasi

| Fayl | Vazifasi |
|---|---|
| `migrations/0035_product_types.sql` | `product_types` (+39 seed), `site_texts`, `site_assets`, brend logotiplari |
| `public/brands/*.svg` (16) | Brend logotiplari — `brands.logo_url` yo'llari (`src/assets/images/logos/`dan nusxa; T7 asl papkani o'chiradi) |
| `shared/product-types.ts` (+test) | `ProductTypeRow`, `ProductTypeDbRow`, `rowToProductType`, `typesOf`, `matchBillzType` (T2); eski registr T9'da o'chadi |
| `app/lib/loaders.ts` | `loadTypes(env)` |
| `app/lib/tiles.ts` (+test), `app/routes/category.tsx` | Tile qatori bazadan |
| `shared/billz.ts` (+test), `server/billz-sync.ts` | `MapContext.types`, `matchBillzType`; runner turlarni run boshida o'qiydi |
| `shared/types.ts` | `ApiProductType` |
| `functions/lib/validate.ts` (+test) | `parseTypeInput`; `parseProductInput` turni faqat shakl bo'yicha tekshiradi |
| `functions/lib/db.ts` | `typeExists`, `rowToApiType`, `TYPE_LIST_SQL` |
| `app/routes/api.admin.types.tsx`, `api.admin.types.$catId.$id.tsx`, `app/routes.ts` | Turlar API |
| `app/routes/api.admin.products.tsx`, `api.admin.products.$id.tsx`, `api.admin.categories.$id.tsx` | `type_invalid` bazadan; yo'nalish o'chirilsa turlari ham |
| `src/admin/api.ts`, `errText.ts`, `nav.ts`, `AdminApp.tsx` | `listTypes/createType/updateType/deleteType`; kodlar; "Turlar" tabi; `screenFor` id bilan |
| `src/admin/screens/TypesList.tsx`, `TypeEdit.tsx` | Turlar ekranlari (kit) |
| `src/admin/lib/image-normalize.ts` (+test), `src/admin/ImageUploader.tsx` | `maxHeight` (`fitScale`), `normalize` propi |
| `src/admin/ProductForm.tsx` | Tur select'i API'dan |
| `src/store/BrandStrip.tsx`, `HomePage.tsx`, `app/routes/home.tsx`, `src/admin/BrandForm.tsx` | Tasma `brands`dan; asl SVG papka o'chadi; formada izoh |
| `src/admin/CategoryForm.tsx`, `CategoryList.tsx`, `src/lib/category-icons.tsx` (o'chadi) | Ikonka tanlagichi va cover izohlari yo'q |
| `CLAUDE.md`, spec | Hujjat (T9) |

---

### Task 1: Migratsiya `0035` — `product_types` seed, kontent jadvallari, brend logotiplari

**Files:**
- Create: `migrations/0035_product_types.sql`
- Create (nusxa): `public/brands/{2e-gaming,amd,apple,asus,audio-technica,bang-olufsen,blackmagic,dji,hollyland,hp,intel,logitech,nvidia,proart,sony,whoop}.svg`

**Interfaces:**
- Produces: jadval `product_types(id, category_id, label, label_ru, icon_url, billz_aliases JSON, sort_order, PK(category_id,id))` 39 qator bilan; `site_texts(key PK, uz, ru)`; `site_assets(key PK, url)`; `brands.logo_url` 16 brendda `/brands/<file>.svg` (13 mavjud + 3 yangi: `asus-proart`, `audio-technica`, `bang-olufsen`), `sort_order` shu 16 tada 10…160 (tasmadagi hozirgi tartib).

- [ ] **Step 1: Logotiplarni `public/brands/`ga nusxalang**

```bash
mkdir -p public/brands && cp src/assets/images/logos/*.svg public/brands/ && ls public/brands | wc -l
```
Expected: `16`. (Asl `src/assets/images/logos/` hozircha qoladi — `BrandStrip` uni T7 gacha import qiladi.)

- [ ] **Step 2: Migratsiya faylini yozing**

`migrations/0035_product_types.sql`:

```sql
-- Tovar turlari bazaga ko'chdi (shared/product-types.ts registri o'rniga): admin CRUD,
-- sayt tile qatori, Billz moslash va mahsulot validatsiyasi shu jadvaldan o'qiydi.
-- Kalit (category_id, id): `aksessuar` to'rttala yo'nalishda, `mikrofon` audio va video'da
-- takrorlanadi. products.type o'sha-o'sha id (FK yo'q — tur o'chirilsa NULL qilinadi).
CREATE TABLE product_types (
  id            TEXT NOT NULL,
  category_id   TEXT NOT NULL,
  label         TEXT NOT NULL,
  label_ru      TEXT NOT NULL DEFAULT '',
  icon_url      TEXT NOT NULL DEFAULT '',
  billz_aliases TEXT NOT NULL DEFAULT '[]',
  sort_order    INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (category_id, id)
);

INSERT INTO product_types (category_id, id, label, label_ru, icon_url, billz_aliases, sort_order) VALUES
('apple','iphone','iPhone','iPhone','/sections/image-grid-iphone-nav_2x.png','[]',10),
('apple','ipad','iPad','iPad','/sections/image-grid-ipad-tn_2x.png','["iPad Pro","iPad Air","iPad mini"]',20),
('apple','macbook','MacBook','MacBook','/sections/image-grid-mac-nav_2x.png','["MacBook Pro","MacBook Air","MacBook Neo"]',30),
('apple','imac','iMac','iMac','/sections/imac.webp','[]',40),
('apple','mac-mini','Mac mini','Mac mini','/sections/image-grid-mac-mini_2x.png','["Mac Studio","Mac Pro"]',50),
('apple','apple-watch','Apple Watch','Apple Watch','/sections/image-grid-watch_2x.png','["iWatch","Watch"]',60),
('apple','vision-pro','Apple Vision Pro','Apple Vision Pro','/sections/image-grid-apple-vision-pro_2x.png','["Vision Pro"]',70),
('apple','airpods','AirPods','AirPods','/sections/image-grid-airpods_2x.png','["Air Pods"]',80),
('apple','aksessuar','Aksessuar','Аксессуары','/sections/apple-accessories.webp','["Phone Case","Case","Cable","Glass","Charger","Adapter","Bag","Trackpad","Keyboard","Mouse","Magic Mouse","Magic Keyboard","Pencil","HUB","Kronshteyn","Combo","Speaker","Headset","Mousepad","Apple TV","Chair","MagSafe Battery","Magic trackpad","Power Bank","Power Adapter","Keyboard Guard","KIT","M.2 Adapter","SATA Adapter","Watch Band","Apple Pencil","EarPods"]',90),
('pc','noutbuk','Noutbuk','Ноутбуки','/sections/laptops.webp','["Laptop","Notebook"]',10),
('pc','tayyor-pc','Tayyor PC','Готовые ПК','/sections/pc.webp','["PC","Monoblock","Mini PC"]',20),
('pc','cpu','CPU','CPU','/sections/cpu.webp','["Processor"]',30),
('pc','gpu','GPU','GPU','/sections/gpu.webp','["Videokarta","Video Card"]',40),
('pc','motherboard','Motherboard','Материнские платы','/sections/motherboard.webp','[]',50),
('pc','ram','RAM','RAM','/sections/ram.webp','["DDR4","DDR5"]',60),
('pc','xotira','Xotira','Накопители','/sections/ssd-hdd.webp','["SSD","SSD M2","SSD M.2","NVMe","HDD","External SSD","External HDD"]',70),
('pc','korpus','Korpus','Корпуса','/sections/case.webp','["PC Case","Case"]',80),
('pc','psu','Quvvat bloki','Блоки питания','/sections/psu.webp','["PSU","Power Supply"]',90),
('pc','sovutish','Sovutish','Охлаждение','/sections/cooler.webp','["Liquid Cooler","CPU Cooler","Cooler","Fan","Fans"]',100),
('pc','monitor','Monitor','Мониторы','/sections/pc-monitor.webp','[]',110),
('pc','aksessuar','Aksessuar','Аксессуары','/sections/pc-accessories.webp','["Mouse","Keyboard","Mousepad","Glasspad","Headset","Speaker","Cable","HUB","Kronshteyn","Combo","Chair","Bag","Webcam","Microphone","Glass","Wired Headset","Controller Hub","DVD Writer"]',120),
('audio','mikrofon','Mikrofon','Микрофоны','/sections/condenser-microphone.webp','["Microphone","Mic","Wireless Microphone","Микрофон"]',10),
('audio','studio-monitor','Studio monitor','Студийные мониторы','/sections/studio-monitors.webp','["Studio Monitor","Studio Monitors","Monitors"]',20),
('audio','naushnik','Naushnik','Наушники','/sections/pro-headphones.webp','["Headphones","Headphone","Наушники"]',30),
('audio','interfeys','Audio interfeys','Аудиоинтерфейсы','/sections/audio-interface.webp','["Audio Interface","Interface","Sound Card"]',40),
('audio','mikser','Mikser / rekorder','Микшеры и рекордеры','/sections/audio-mixer.webp','["Mixer","Recorder","Audio Recorder"]',50),
('audio','analog','Analog uskuna','Аналоговое оборудование','/sections/analog-studio-hardware.webp','["Preamp","Compressor","Equalizer","Outboard"]',60),
('audio','midi','MIDI kontroller','MIDI-контроллеры','/sections/usb-midi-controllers.webp','["MIDI Controller","MIDI Keyboard","USB Controller"]',70),
('audio','aksessuar','Aksessuar','Аксессуары','/sections/audio-accessories.webp','["Stand","Cable","Pop Filter","Shock Mount"]',80),
('video','kamera','Kamera','Камеры','/sections/digital-cameras.webp','["Camera","Camcorder"]',10),
('video','action-kamera','Action kamera','Экшн-камеры','/sections/action-cameras.webp','["Action Camera"]',20),
('video','obyektiv','Obyektiv','Объективы','/sections/camera-lens.webp','["Lens","Lenses"]',30),
('video','stabilizator','Stabilizator','Стабилизаторы','/sections/gimbal.webp','["Gimbal","Stabilizer"]',40),
('video','shtativ','Shtativ','Штативы','/sections/tripods.webp','["Tripod"]',50),
('video','yoruglik','Yorug''lik','Свет','/sections/video-lighting.webp','["Light","LED Light","Lighting"]',60),
('video','post-production','Post-production','Постпродакшн','/sections/post-production.webp','["Post Production","Editing Console"]',70),
('video','mikrofon','Mikrofon','Микрофоны','/sections/wireless-mic.webp','["Microphone","Wireless Microphone","Микрофон"]',80),
('video','xotira-kartasi','Xotira kartasi','Карты памяти','/sections/memory-cards.webp','["Memory Card"]',90),
('video','aksessuar','Aksessuar','Аксессуары','/sections/video-accessories.webp','["Battery","Bag","Cable"]',100);

-- Sayt kontenti (spec §6; 4-bosqich ishlatadi): faqat o'zgartirilgan matn/rasm saqlanadi,
-- qolgani koddagi standart.
CREATE TABLE site_texts (
  key TEXT PRIMARY KEY,
  uz  TEXT NOT NULL DEFAULT '',
  ru  TEXT NOT NULL DEFAULT ''
);
CREATE TABLE site_assets (
  key TEXT PRIMARY KEY,
  url TEXT NOT NULL
);

-- Landing brend tasmasi endi brands.logo_url dan (16 ta SVG public/brands/ ga ko'chdi).
-- sort_order shu 16 tada tasmadagi hozirgi tartib (10..160); yo'q brendlar yaratiladi.
UPDATE brands SET logo_url = '/brands/apple.svg',      sort_order = 10  WHERE id = 'apple';
UPDATE brands SET logo_url = '/brands/sony.svg',       sort_order = 20  WHERE id = 'sony';
UPDATE brands SET logo_url = '/brands/intel.svg',      sort_order = 30  WHERE id = 'intel';
UPDATE brands SET logo_url = '/brands/nvidia.svg',     sort_order = 40  WHERE id = 'nvidia';
UPDATE brands SET logo_url = '/brands/asus.svg',       sort_order = 50  WHERE id = 'asus';
INSERT INTO brands (id, name, slug, logo_url, sort_order)
  SELECT 'asus-proart', 'ASUS ProArt', 'asus-proart', '/brands/proart.svg', 60
  WHERE NOT EXISTS (SELECT 1 FROM brands WHERE id = 'asus-proart' OR slug = 'asus-proart');
UPDATE brands SET logo_url = '/brands/hp.svg',         sort_order = 70  WHERE id = 'hp';
UPDATE brands SET logo_url = '/brands/amd.svg',        sort_order = 80  WHERE id = 'amd';
UPDATE brands SET logo_url = '/brands/blackmagic.svg', sort_order = 90  WHERE id = 'blackmagic';
UPDATE brands SET logo_url = '/brands/dji.svg',        sort_order = 100 WHERE id = 'dji';
INSERT INTO brands (id, name, slug, logo_url, sort_order)
  SELECT 'audio-technica', 'Audio-Technica', 'audio-technica', '/brands/audio-technica.svg', 110
  WHERE NOT EXISTS (SELECT 1 FROM brands WHERE id = 'audio-technica' OR slug = 'audio-technica');
INSERT INTO brands (id, name, slug, logo_url, sort_order)
  SELECT 'bang-olufsen', 'Bang & Olufsen', 'bang-olufsen', '/brands/bang-olufsen.svg', 120
  WHERE NOT EXISTS (SELECT 1 FROM brands WHERE id = 'bang-olufsen' OR slug = 'bang-olufsen');
UPDATE brands SET logo_url = '/brands/logitech.svg',   sort_order = 130 WHERE id = 'logitech';
UPDATE brands SET logo_url = '/brands/hollyland.svg',  sort_order = 140 WHERE id = 'hollyland';
UPDATE brands SET logo_url = '/brands/2e-gaming.svg',  sort_order = 150 WHERE id = '2e';
UPDATE brands SET logo_url = '/brands/whoop.svg',      sort_order = 160 WHERE id = 'whoop';
```

- [ ] **Step 3: Qo'llang va tekshiring**

```bash
bun run migrate && sqlite3 data/store.db "select category_id, count(*) from product_types group by category_id; select count(*) from brands where logo_url <> ''; select name from _migrations order by name desc limit 1;"
```
Expected: `apple|9`, `audio|8`, `pc|12`, `video|10`; `16`; `0035_product_types.sql`.

- [ ] **Step 4: Lint/test (o'zgarmagan bo'lishi kerak) va commit**

```bash
bun run lint && bun run test
git add migrations/0035_product_types.sql public/brands
git commit -m "feat(db): product_types jadvali (39 tur seed), site_texts/site_assets, brend logotiplari public/brands

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 2: `shared/product-types.ts` — bazadagi qator shakli va sof yordamchilar (TDD)

**Files:**
- Modify: `shared/product-types.ts` (eski `PRODUCT_TYPES`/`typesFor`/`findType`/`typeForBillzCategory` **hozircha qoladi** — T9 o'chiradi)
- Test: `shared/product-types.test.ts` (mavjud testlar qoladi, yangilari qo'shiladi)

**Interfaces:**
- Produces:
  ```ts
  export interface ProductTypeRow { id: string; categoryId: string; label: string; labelRu: string; iconUrl: string; billzAliases: string[]; sortOrder: number }
  export interface ProductTypeDbRow { id: string; category_id: string; label: string; label_ru: string; icon_url: string; billz_aliases: string; sort_order: number }
  export function rowToProductType(r: ProductTypeDbRow): ProductTypeRow
  export function typesOf(all: ProductTypeRow[], categoryId: string | null | undefined): ProductTypeRow[]
  export function matchBillzType(types: ProductTypeRow[], billzName: string): string | null
  ```

- [ ] **Step 1: Testlarni yozing** — `shared/product-types.test.ts` oxiriga qo'shing (import qatoriga yangi nomlarni qo'shing: `rowToProductType, typesOf, matchBillzType, type ProductTypeRow`):

```ts
const ROWS: ProductTypeRow[] = [
  { id: 'iphone', categoryId: 'apple', label: 'iPhone', labelRu: 'iPhone', iconUrl: '/sections/a.png', billzAliases: [], sortOrder: 10 },
  { id: 'aksessuar', categoryId: 'apple', label: 'Aksessuar', labelRu: 'Аксессуары', iconUrl: '', billzAliases: ['Case', 'Cable'], sortOrder: 90 },
  { id: 'korpus', categoryId: 'pc', label: 'Korpus', labelRu: 'Корпуса', iconUrl: '', billzAliases: ['PC Case', 'Case'], sortOrder: 80 },
  { id: 'ram', categoryId: 'pc', label: 'RAM', labelRu: 'RAM', iconUrl: '', billzAliases: ['DDR4', 'DDR5'], sortOrder: 60 },
];

describe('rowToProductType', () => {
  it('JSON aliaslarni ochadi, buzilgan JSON → bo\'sh ro\'yxat', () => {
    const base = { id: 'ram', category_id: 'pc', label: 'RAM', label_ru: 'RAM', icon_url: '/x.webp', sort_order: 3 };
    expect(rowToProductType({ ...base, billz_aliases: '["DDR4","DDR5"]' })).toEqual({
      id: 'ram', categoryId: 'pc', label: 'RAM', labelRu: 'RAM', iconUrl: '/x.webp', billzAliases: ['DDR4', 'DDR5'], sortOrder: 3,
    });
    expect(rowToProductType({ ...base, billz_aliases: 'oops' }).billzAliases).toEqual([]);
    expect(rowToProductType({ ...base, billz_aliases: '[1, "ok"]' }).billzAliases).toEqual(['ok']);
  });
});

describe('typesOf', () => {
  it("yo'nalishning turlari tartib bo'yicha; noma'lum yoki bo'sh yo'nalish → []", () => {
    expect(typesOf(ROWS, 'pc').map((t) => t.id)).toEqual(['ram', 'korpus']);
    expect(typesOf(ROWS, 'apple').map((t) => t.id)).toEqual(['iphone', 'aksessuar']);
    expect(typesOf(ROWS, 'video')).toEqual([]);
    expect(typesOf(ROWS, null)).toEqual([]);
  });
});

describe('matchBillzType', () => {
  it('nom yoki alias, katta-kichik harfsiz', () => {
    expect(matchBillzType(typesOf(ROWS, 'apple'), 'iPhone')).toBe('iphone');
    expect(matchBillzType(typesOf(ROWS, 'pc'), 'ddr5')).toBe('ram');
    expect(matchBillzType(typesOf(ROWS, 'pc'), 'PC Case')).toBe('korpus');
  });
  it("bir nom yo'nalishga qarab boshqa turga tushadi", () => {
    expect(matchBillzType(typesOf(ROWS, 'apple'), 'Case')).toBe('aksessuar');
    expect(matchBillzType(typesOf(ROWS, 'pc'), 'Case')).toBe('korpus');
  });
  it("noma'lum nom yoki bo'sh → null", () => {
    expect(matchBillzType(typesOf(ROWS, 'pc'), 'Glasspad Deluxe')).toBeNull();
    expect(matchBillzType(typesOf(ROWS, 'pc'), '  ')).toBeNull();
    expect(matchBillzType([], 'iPhone')).toBeNull();
  });
});
```

- [ ] **Step 2: Yiqilishini tekshiring**

Run: `bunx vitest run shared/product-types.test.ts`
Expected: FAIL — `rowToProductType`/`typesOf`/`matchBillzType` export yo'q.

- [ ] **Step 3: Implementatsiya** — `shared/product-types.ts` oxiriga (eski koddan keyin) qo'shing:

```ts
// ── Bazadagi turlar (`product_types`, migratsiya 0035) ─────────────────────
// Registr o'rniga: sayt (`loadTypes`), Billz runner va admin shu shaklni ishlatadi.

export interface ProductTypeRow {
  id: string;
  categoryId: string;
  label: string;
  labelRu: string;
  iconUrl: string;
  /** Billz kategoriya nomlari (katta-kichik harfsiz) — `label` ham mos keladi. */
  billzAliases: string[];
  sortOrder: number;
}

/** SQL qatori (snake_case). */
export interface ProductTypeDbRow {
  id: string;
  category_id: string;
  label: string;
  label_ru: string;
  icon_url: string;
  billz_aliases: string;
  sort_order: number;
}

/** `billz_aliases` JSON matn; buzilgan bo'lsa bo'sh ro'yxat — bitta yomon qator sinxronizatsiyani yiqitmasin. */
export function rowToProductType(r: ProductTypeDbRow): ProductTypeRow {
  let billzAliases: string[] = [];
  try {
    const v: unknown = JSON.parse(r.billz_aliases);
    if (Array.isArray(v)) billzAliases = v.filter((x): x is string => typeof x === 'string');
  } catch {
    // bo'sh qoladi
  }
  return { id: r.id, categoryId: r.category_id, label: r.label, labelRu: r.label_ru, iconUrl: r.icon_url, billzAliases, sortOrder: r.sort_order };
}

/** Yo'nalishning turlari `sort_order` bo'yicha; noma'lum yoki bo'sh yo'nalish → []. */
export function typesOf(all: ProductTypeRow[], categoryId: string | null | undefined): ProductTypeRow[] {
  if (!categoryId) return [];
  return all
    .filter((t) => t.categoryId === categoryId)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id));
}

/** Billz kategoriya nomi → tur id'si (nom yoki alias, katta-kichik harfsiz); mos kelmasa null. */
export function matchBillzType(types: ProductTypeRow[], billzName: string): string | null {
  const needle = billzName.trim().toLowerCase();
  if (!needle) return null;
  for (const t of types) {
    if (t.label.toLowerCase() === needle) return t.id;
    if (t.billzAliases.some((a) => a.toLowerCase() === needle)) return t.id;
  }
  return null;
}
```

- [ ] **Step 4: Test va lint**

Run: `bunx vitest run shared/product-types.test.ts && bun run lint`
Expected: PASS (eski 4 + yangi 6 test), lint toza.

- [ ] **Step 5: Commit**

```bash
git add shared/product-types.ts shared/product-types.test.ts
git commit -m "feat(types): ProductTypeRow, typesOf, matchBillzType — bazadagi turlar uchun sof yordamchilar

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 3: Sayt tile qatori bazadan — `loadTypes`, `categoryTiles(types, …)` (TDD)

**Files:**
- Modify: `app/lib/loaders.ts` (yangi `loadTypes`), `app/lib/tiles.ts` (to'liq qayta yoziladi), `app/routes/category.tsx` (loader)
- Test: `app/lib/tiles.test.ts` (yangi)

**Interfaces:**
- Consumes: `ProductTypeRow`, `ProductTypeDbRow`, `rowToProductType`, `typesOf` (T2).
- Produces: `loadTypes(env: Env): Promise<ProductTypeRow[]>` (xato → `[]`); `categoryTiles(types: ProductTypeRow[], categoryId: string, lang: 'uz' | 'ru'): CategoryTile[]` (`CategoryTile { id; label; img }` o'zgarmaydi).

- [ ] **Step 1: Test** — `app/lib/tiles.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { categoryTiles } from './tiles';
import type { ProductTypeRow } from '../../shared/product-types';

const ROWS: ProductTypeRow[] = [
  { id: 'gpu', categoryId: 'pc', label: 'GPU', labelRu: '', iconUrl: '/sections/gpu.webp', billzAliases: [], sortOrder: 40 },
  { id: 'noutbuk', categoryId: 'pc', label: 'Noutbuk', labelRu: 'Ноутбуки', iconUrl: '/sections/laptops.webp', billzAliases: [], sortOrder: 10 },
  { id: 'iphone', categoryId: 'apple', label: 'iPhone', labelRu: 'iPhone', iconUrl: '/sections/i.png', billzAliases: [], sortOrder: 10 },
];

describe('categoryTiles', () => {
  it("yo'nalish turlari tartib bo'yicha, ikonka bilan", () => {
    expect(categoryTiles(ROWS, 'pc', 'uz')).toEqual([
      { id: 'noutbuk', label: 'Noutbuk', img: '/sections/laptops.webp' },
      { id: 'gpu', label: 'GPU', img: '/sections/gpu.webp' },
    ]);
  });
  it("ru: labelRu, bo'sh bo'lsa o'zbekchasi", () => {
    expect(categoryTiles(ROWS, 'pc', 'ru').map((t) => t.label)).toEqual(['Ноутбуки', 'GPU']);
  });
  it("noma'lum yo'nalish → []", () => {
    expect(categoryTiles(ROWS, 'video', 'uz')).toEqual([]);
  });
});
```

- [ ] **Step 2: Yiqilishini tekshiring**

Run: `bunx vitest run app/lib/tiles.test.ts`
Expected: FAIL (hozirgi `categoryTiles(categoryId, lang)` imzosi — tip/argument xatosi yoki `[]`).

- [ ] **Step 3: `app/lib/tiles.ts`** (to'liq):

```ts
import { typesOf, type ProductTypeRow } from '../../shared/product-types';

export interface CategoryTile {
  /** `products.type` qiymati — havolada `?tur=` bo'lib ketadi. */
  id: string;
  label: string;
  /** Shaffof 2x ikonka (`product_types.icon_url`; sayt `[zoom:0.5]` bilan chizadi). */
  img: string;
}

/**
 * Yo'nalish sahifasidagi rasmli bo'lim qatori: yo'nalishning **hamma** turi (mahsuloti yo'qlari
 * ham — do'kon tuzilishi assortiment kelmasidan ko'rinsin), tartib `sort_order` (egasi admin'da
 * qo'yadi). Turlar bazadan (`loadTypes`), bu funksiya sof.
 */
export function categoryTiles(types: ProductTypeRow[], categoryId: string, lang: 'uz' | 'ru'): CategoryTile[] {
  return typesOf(types, categoryId).map((t) => ({
    id: t.id,
    label: lang === 'ru' && t.labelRu ? t.labelRu : t.label,
    img: t.iconUrl,
  }));
}
```

- [ ] **Step 4: `app/lib/loaders.ts`** — import qatorlariga `import { rowToProductType, type ProductTypeDbRow, type ProductTypeRow } from '../../shared/product-types';`; `loadBrands`dan keyin:

```ts
/** Tovar turlari (`product_types`); xato → [] — tile qatori bo'sh chiqadi, sahifa yiqilmaydi. */
export async function loadTypes(env: Env): Promise<ProductTypeRow[]> {
  try {
    const { results } = await env.DB.prepare('SELECT * FROM product_types ORDER BY sort_order ASC, id ASC').all<ProductTypeDbRow>();
    return results.map(rowToProductType);
  } catch (err) {
    console.error('loadTypes fallback:', err);
    return [];
  }
}
```

- [ ] **Step 5: `app/routes/category.tsx` loader** — `loadTypes`ni loaders importiga qo'shing; `Promise.all`ga to'rtinchi element:

```ts
  const [result, config, brands, types] = await Promise.all([
    queryProducts(env, filters), loadConfig(env), loadBrands(env), loadTypes(env),
  ]);
  const title = categoryLabel(category, locale);
  const tiles = categoryTiles(types, slug, locale === 'ru' ? 'ru' : 'uz');
```
(`tiles` loader natijasida avvalgidek qaytadi; `CategoryTiles` komponenti o'zgarmaydi.)

- [ ] **Step 6: Test, lint, brauzer**

Run: `bunx vitest run app/lib/tiles.test.ts && bun run lint && bun run test` → PASS.
Brauzer (dev server ishlayotgan bo'lsa): `curl -s http://localhost:3000/category/apple | grep -o 'tur=[a-z-]*' | sort -u | wc -l` → `9` (Apple turlari bazadan). `/category/pc` → `12`.

- [ ] **Step 7: Commit**

```bash
git add app/lib/tiles.ts app/lib/tiles.test.ts app/lib/loaders.ts app/routes/category.tsx
git commit -m "feat(store): tur qatori product_types jadvalidan (loadTypes + sof categoryTiles)

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 4: Billz moslash bazadagi turlar bilan

**Files:**
- Modify: `shared/billz.ts` (`MapContext`, `mapBillzProduct`), `shared/billz.test.ts` (`ctx` fixture), `server/billz-sync.ts` (`execute` boshida turlar)

**Interfaces:**
- Consumes: `ProductTypeRow`, `ProductTypeDbRow`, `rowToProductType`, `typesOf`, `matchBillzType` (T2).
- Produces: `MapContext.types: ProductTypeRow[]` (hamma yo'nalish); `mapBillzProduct` turni `matchBillzType(typesOf(ctx.types, categoryId), billzKategoriyaNomi)` bilan aniqlaydi.

- [ ] **Step 1: Test fixture** — `shared/billz.test.ts` `ctx` ga `types` qo'shing (import qatoriga `import type { ProductTypeRow } from './product-types';`):

```ts
const TYPES: ProductTypeRow[] = [
  { id: 'iphone', categoryId: 'apple', label: 'iPhone', labelRu: 'iPhone', iconUrl: '', billzAliases: [], sortOrder: 10 },
  { id: 'ipad', categoryId: 'apple', label: 'iPad', labelRu: 'iPad', iconUrl: '', billzAliases: ['iPad Pro'], sortOrder: 20 },
  { id: 'ram', categoryId: 'pc', label: 'RAM', labelRu: 'RAM', iconUrl: '', billzAliases: ['DDR4', 'DDR5'], sortOrder: 60 },
];
const ctx: MapContext = {
  shopId: SHOP,
  usdToUzs: 12600,
  categoryIds: new Set(['apple', 'pc', 'audio', 'video']),
  brandsByName: new Map([['apple', 'apple'], ['asus', 'asus']]),
  types: TYPES,
  existingImage: null,
};
```

- [ ] **Step 2: Yiqilishini tekshiring**

Run: `bunx vitest run shared/billz.test.ts`
Expected: FAIL — `types` `MapContext`da yo'q (tip xatosi vitest'da ko'rinmasligi mumkin; u holda `bun run lint` yiqiladi — ikkalasini ham ishga tushiring).

- [ ] **Step 3: `shared/billz.ts`**

Import (2-qator) almashadi:
```ts
import { matchBillzType, typesOf, type ProductTypeRow } from './product-types.ts';
```
`MapContext`ga (`brandsByName`dan keyin):
```ts
  /** Bazadagi turlar (hamma yo'nalish) — Billz kategoriya nomi shulardan biriga tushadi. */
  types: ProductTypeRow[];
```
`mapBillzProduct` ichida tur qatori:
```ts
  const type = categoryId ? matchBillzType(typesOf(ctx.types, categoryId), raw.categories?.[0]?.name ?? '') : null;
```
(`typeForBillzCategory` importi olib tashlanadi; funksiya o'zi T9 gacha `product-types.ts`da qoladi.)

- [ ] **Step 4: `server/billz-sync.ts`**

Importlarga: `import { rowToProductType, type ProductTypeDbRow } from '../shared/product-types.ts';`
`execute(cfg)` ichida, `brandIds` qatoridan keyin:
```ts
    // Turlar bazadan (registr yo'q) — run boshida bir marta; Billz kategoriya nomi shulardan biriga tushadi.
    const typeRows = await env.DB.prepare('SELECT * FROM product_types').all<ProductTypeDbRow>();
    const types = typeRows.results.map(rowToProductType);
```
`ctx` yasalishida: `{ shopId: cfg.shopId, usdToUzs: cfg.usdToUzs, categoryIds, brandsByName, types, existingImage: … }`.

- [ ] **Step 5: Test, lint**

Run: `bunx vitest run shared/billz.test.ts && bun run lint && bun run test` → PASS (billz testlari: iPhone → `iphone`, DDR5 → `ram`, Gaming → `null`).

- [ ] **Step 6: Commit**

```bash
git add shared/billz.ts shared/billz.test.ts server/billz-sync.ts
git commit -m "feat(billz): tur moslash product_types jadvalidan (MapContext.types)

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 5: Turlar API + mahsulot validatsiyasi bazadan

**Files:**
- Modify: `shared/types.ts` (`ApiProductType`), `functions/lib/validate.ts` (`parseTypeInput`, `parseProductInput`), `functions/lib/validate.test.ts`, `functions/lib/db.ts` (`typeExists`, `TYPE_LIST_SQL`, `rowToApiType`), `app/routes.ts`, `app/routes/api.admin.products.tsx`, `app/routes/api.admin.products.$id.tsx`, `app/routes/api.admin.categories.$id.tsx`, `src/admin/api.ts`, `src/admin/errText.ts`
- Create: `app/routes/api.admin.types.tsx`, `app/routes/api.admin.types.$catId.$id.tsx`

**Interfaces:**
- Consumes: `ProductTypeRow`, `ProductTypeDbRow`, `rowToProductType` (T2); `asRecord`/`reqString`/`slugify` (`validate.ts` ichki yordamchilari — `parseTypeInput` shu faylda).
- Produces:
  - `ApiProductType extends ProductTypeRow { productCount: number }` (`shared/types.ts`)
  - `parseTypeInput(body): TypeInput` (`TypeInput { id; categoryId; label; labelRu; iconUrl; billzAliases: string[]; sortOrder }`), kodlar: `label_required`, `categoryId_required`, `id_invalid`, `icon_required`, `url_invalid`, `aliases_limit`
  - `parseProductInput`: `type` faqat shakl (`^[a-z0-9-]{1,40}$`, aks holda `type_invalid`); yo'nalishga tegishlilik route'da `typeExists`
  - `typeExists(env, categoryId, type): Promise<boolean>`, `TYPE_LIST_SQL`, `rowToApiType(r: TypeListRow): ApiProductType` (`functions/lib/db.ts`)
  - `GET /api/admin/types` → `ApiProductType[]`; `POST` → 201 `ApiProductType` (400 `categoryId_invalid`/`id_taken`); `PUT /api/admin/types/:catId/:id` → `ApiProductType` (404 `not_found`); `DELETE` → `{ ok: true, cleared: number }`
  - `src/admin/api.ts`: `AdminTypeInput`, `listTypes()`, `createType(t)`, `updateType(categoryId, id, t)`, `deleteType(categoryId, id)`

- [ ] **Step 1: Validatsiya testlari** — `functions/lib/validate.test.ts`: import ro'yxatiga `parseTypeInput`; 44-qatordagi testni almashtiring:

```ts
    // Yo'nalishga tegishlilik endi route'da (bazadan); parser faqat shaklni tekshiradi.
    expect(parseProductInput({ ...base, categoryId: 'pc', type: 'iphone' }).type).toBe('iphone');
    expect(() => parseProductInput({ ...base, categoryId: 'pc', type: 'Bad Type!' })).toThrow('type_invalid');
```
Fayl oxiriga:
```ts
describe('parseTypeInput', () => {
  const base = { categoryId: 'pc', label: 'GPU', labelRu: 'GPU', iconUrl: '/sections/gpu.webp', billzAliases: ['Videokarta'], sortOrder: 40 };
  it("to'liq kirish", () => {
    expect(parseTypeInput({ ...base, id: 'gpu' })).toEqual({ id: 'gpu', categoryId: 'pc', label: 'GPU', labelRu: 'GPU', iconUrl: '/sections/gpu.webp', billzAliases: ['Videokarta'], sortOrder: 40 });
  });
  it("id bo'lmasa nomdan slug; lotin bo'lmasa id_invalid", () => {
    expect(parseTypeInput({ ...base, label: 'Quvvat bloki' }).id).toBe('quvvat-bloki');
    expect(() => parseTypeInput({ ...base, label: 'Свет' })).toThrow('id_invalid');
    expect(() => parseTypeInput({ ...base, id: 'Bad Id' })).toThrow('id_invalid');
  });
  it('majburiy maydonlar va ikonka', () => {
    expect(() => parseTypeInput({ ...base, label: '' })).toThrow('label_required');
    expect(() => parseTypeInput({ ...base, categoryId: '' })).toThrow('categoryId_required');
    expect(() => parseTypeInput({ ...base, iconUrl: '' })).toThrow('icon_required');
    expect(() => parseTypeInput({ ...base, iconUrl: 'https://evil/x.png' })).toThrow('url_invalid');
    expect(parseTypeInput({ ...base, iconUrl: '/images/products/abc.webp' }).iconUrl).toBe('/images/products/abc.webp');
  });
  it('aliaslar tozalanadi va chegaralanadi', () => {
    expect(parseTypeInput({ ...base, billzAliases: [' DDR4 ', '', 5, 'DDR5'] }).billzAliases).toEqual(['DDR4', 'DDR5']);
    expect(parseTypeInput({ ...base, billzAliases: undefined }).billzAliases).toEqual([]);
    expect(() => parseTypeInput({ ...base, billzAliases: Array.from({ length: 21 }, (_, i) => `a${i}`) })).toThrow('aliases_limit');
    expect(() => parseTypeInput({ ...base, billzAliases: ['x'.repeat(41)] })).toThrow('aliases_limit');
  });
});
```

- [ ] **Step 2: Yiqilishini tekshiring**

Run: `bunx vitest run functions/lib/validate.test.ts` → FAIL (`parseTypeInput` yo'q; `type: 'iphone'` hali `type_invalid` tashlaydi).

- [ ] **Step 3: `functions/lib/validate.ts`**

`import { findType } from '../../shared/product-types';` qatorini **o'chiring**. Modul darajasida (limitlar yonida):
```ts
/** Tur id'si: kichik lotin, raqam, `-`; 40 belgigacha — URL `?tur=` va `products.type` uchun. */
const TYPE_ID = /^[a-z0-9-]{1,40}$/;
const MAX_ALIASES = 20;
const MAX_ALIAS_LEN = 40;
```
`parseProductInput` ichida tur tekshiruvi almashadi:
```ts
  // Tur faqat shakl bo'yicha; yo'nalishga tegishliligi route'da bazadan (`typeExists`).
  const type = typeof o.type === 'string' && o.type.trim() !== '' ? o.type.trim() : null;
  if (type !== null && !TYPE_ID.test(type)) throw new ValidationError('type_invalid');
```
Fayl oxiriga:
```ts
export interface TypeInput {
  id: string;
  categoryId: string;
  label: string;
  labelRu: string;
  iconUrl: string;
  billzAliases: string[];
  sortOrder: number;
}

/** Tovar turi (admin CRUD). Ikonka majburiy — ikonkasiz tur qatorda bo'sh joy bo'lardi. */
export function parseTypeInput(body: unknown): TypeInput {
  const o = asRecord(body);
  const label = reqString(o, 'label');
  const categoryId = reqString(o, 'categoryId');
  const id = typeof o.id === 'string' && o.id.trim() !== '' ? o.id.trim() : slugify(label);
  if (!TYPE_ID.test(id)) throw new ValidationError('id_invalid');
  const labelRu = typeof o.labelRu === 'string' ? o.labelRu.trim() : '';
  const iconUrl = typeof o.iconUrl === 'string' ? o.iconUrl.trim() : '';
  if (!iconUrl) throw new ValidationError('icon_required');
  if (!iconUrl.startsWith('/images/products/') && !iconUrl.startsWith('/sections/')) throw new ValidationError('url_invalid');
  const rawAliases: unknown[] = Array.isArray(o.billzAliases) ? o.billzAliases : [];
  const billzAliases = rawAliases.filter((a): a is string => typeof a === 'string').map((a) => a.trim()).filter(Boolean);
  if (billzAliases.length > MAX_ALIASES || billzAliases.some((a) => a.length > MAX_ALIAS_LEN)) throw new ValidationError('aliases_limit');
  const sortOrder = typeof o.sortOrder === 'number' && Number.isFinite(o.sortOrder) ? o.sortOrder : 0;
  return { id, categoryId, label, labelRu, iconUrl, billzAliases, sortOrder };
}
```
`slugify` (`validate.ts:262-267`) `parseTypeInput`dan **oldin** e'lon qilingan bo'lishi shart emas (function hoisting), lekin `const TYPE_ID` — `parseTypeInput` chaqirilganda allaqachon initsializatsiya qilingan (modul yuklangan) bo'ladi.

- [ ] **Step 4: `shared/types.ts`** — fayl boshidagi importga `import type { ProductTypeRow } from './product-types';`; oxiriga:

```ts
/** Tovar turi (`product_types`) — admin CRUD; `id` yo'nalish ichida noyob, `products.type` shunga bog'lanadi. */
export interface ApiProductType extends ProductTypeRow {
  /** Shu turdagi mahsulotlar soni (ro'yxatda ko'rinadi, o'chirish tasdig'ida aytiladi). */
  productCount: number;
}
```

- [ ] **Step 5: `functions/lib/db.ts`** — importlarga `import { rowToProductType, type ProductTypeDbRow } from '../../shared/product-types';` va `ApiProductType` (types importiga); fayl oxiriga:

```ts
// ── Tovar turlari (`product_types`) ────────────────────────────────────────
export type TypeListRow = ProductTypeDbRow & { product_count: number };

/** Ro'yxat: har turda mahsulot soni (o'chirish tasdig'i va admin jadvali uchun). */
export const TYPE_LIST_SQL =
  `SELECT t.*, (SELECT COUNT(*) FROM products p WHERE p.category_id = t.category_id AND p.type = t.id) AS product_count
   FROM product_types t`;

export function rowToApiType(r: TypeListRow): ApiProductType {
  return { ...rowToProductType(r), productCount: r.product_count };
}

/** Tur shu yo'nalishda bormi — mahsulot yozishda `type_invalid` (registr bazaga ko'chgan, parser faqat shaklni biladi). */
export async function typeExists(env: { DB: SqlDatabase }, categoryId: string | null, type: string | null): Promise<boolean> {
  if (type === null) return true;
  if (categoryId === null) return false;
  const row = await env.DB.prepare('SELECT 1 AS ok FROM product_types WHERE category_id = ? AND id = ?').bind(categoryId, type).first<{ ok: number }>();
  return row !== null;
}
```

- [ ] **Step 6: Mahsulot route'lari** — `app/routes/api.admin.products.tsx` (POST) va `api.admin.products.$id.tsx` (PUT): `parseBody(...)` natijasi olingandan keyin, `ensureUniqueSlug`dan oldin:

```ts
  if (!(await typeExists(env, input.categoryId, input.type))) return json({ error: 'type_invalid' }, { status: 400 });
```
(`typeExists` `functions/lib/db.ts` importiga qo'shiladi.)

- [ ] **Step 7: Yo'nalish o'chirilsa turlari ham** — `app/routes/api.admin.categories.$id.tsx` DELETE batch:

```ts
    await env.DB.batch([
      env.DB.prepare('UPDATE products SET category_id = NULL WHERE category_id = ?').bind(id),
      env.DB.prepare('DELETE FROM product_types WHERE category_id = ?').bind(id),
      env.DB.prepare('DELETE FROM categories WHERE id = ?').bind(id),
    ]);
```

- [ ] **Step 8: Turlar route'lari**

`app/routes/api.admin.types.tsx`:
```tsx
import type { Route } from './+types/api.admin.types';
import { json, rowToApiType, TYPE_LIST_SQL, type TypeListRow } from '../../functions/lib/db';
import { parseTypeInput } from '../../functions/lib/validate';
import { requireAdmin, parseBody } from './api.admin.guard';

/** Tovar turlari: ro'yxat (mahsulot soni bilan) va yaratish. Kalit (category_id, id). */
export async function loader({ request, context }: Route.LoaderArgs) {
  const env = context.env;
  const who = await requireAdmin(request, env);
  if (who instanceof Response) return who;
  const { results } = await env.DB.prepare(`${TYPE_LIST_SQL} ORDER BY t.category_id ASC, t.sort_order ASC, t.id ASC`).all<TypeListRow>();
  return json(results.map(rowToApiType));
}

export async function action({ request, context }: Route.ActionArgs) {
  const env = context.env;
  const who = await requireAdmin(request, env);
  if (who instanceof Response) return who;
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, { status: 405 });
  const input = parseBody(await request.json().catch(() => null), parseTypeInput);
  if (input instanceof Response) return input;
  const cat = await env.DB.prepare('SELECT 1 AS ok FROM categories WHERE id = ?').bind(input.categoryId).first<{ ok: number }>();
  if (!cat) return json({ error: 'categoryId_invalid' }, { status: 400 });
  const dup = await env.DB.prepare('SELECT 1 AS ok FROM product_types WHERE category_id = ? AND id = ?').bind(input.categoryId, input.id).first<{ ok: number }>();
  if (dup) return json({ error: 'id_taken' }, { status: 400 });
  await env.DB.prepare(
    'INSERT INTO product_types (id, category_id, label, label_ru, icon_url, billz_aliases, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)',
  ).bind(input.id, input.categoryId, input.label, input.labelRu, input.iconUrl, JSON.stringify(input.billzAliases), input.sortOrder).run();
  const row = await env.DB.prepare(`${TYPE_LIST_SQL} WHERE t.category_id = ? AND t.id = ?`).bind(input.categoryId, input.id).first<TypeListRow>();
  if (!row) return json({ error: 'insert_failed' }, { status: 500 });
  return json(rowToApiType(row), { status: 201 });
}
```

`app/routes/api.admin.types.$catId.$id.tsx`:
```tsx
import type { Route } from './+types/api.admin.types.$catId.$id';
import { json, rowToApiType, TYPE_LIST_SQL, type TypeListRow } from '../../functions/lib/db';
import { parseTypeInput } from '../../functions/lib/validate';
import { requireAdmin, parseBody } from './api.admin.guard';

/** Bitta tur: tahrir (id va yo'nalish o'zgarmaydi — products.type bog'langan) va o'chirish. */
export async function action({ request, context, params }: Route.ActionArgs) {
  const env = context.env;
  const who = await requireAdmin(request, env);
  if (who instanceof Response) return who;
  const categoryId = String(params.catId);
  const id = String(params.id);

  if (request.method === 'PUT') {
    const body = ((await request.json().catch(() => null)) ?? {}) as object;
    const input = parseBody({ ...body, id, categoryId }, parseTypeInput);
    if (input instanceof Response) return input;
    await env.DB.prepare(
      'UPDATE product_types SET label = ?, label_ru = ?, icon_url = ?, billz_aliases = ?, sort_order = ? WHERE category_id = ? AND id = ?',
    ).bind(input.label, input.labelRu, input.iconUrl, JSON.stringify(input.billzAliases), input.sortOrder, categoryId, id).run();
    const row = await env.DB.prepare(`${TYPE_LIST_SQL} WHERE t.category_id = ? AND t.id = ?`).bind(categoryId, id).first<TypeListRow>();
    if (!row) return json({ error: 'not_found' }, { status: 404 });
    return json(rowToApiType(row));
  }

  if (request.method === 'DELETE') {
    // Tursiz qolgan mahsulotlar katalogda qoladi, tur qatorida chiqmaydi — soni javobda.
    const cnt = await env.DB.prepare('SELECT COUNT(*) AS n FROM products WHERE category_id = ? AND type = ?').bind(categoryId, id).first<{ n: number }>();
    await env.DB.batch([
      env.DB.prepare('UPDATE products SET type = NULL WHERE category_id = ? AND type = ?').bind(categoryId, id),
      env.DB.prepare('DELETE FROM product_types WHERE category_id = ? AND id = ?').bind(categoryId, id),
    ]);
    return json({ ok: true, cleared: cnt?.n ?? 0 });
  }

  return json({ error: 'method_not_allowed' }, { status: 405 });
}
```

`app/routes.ts` — `api/admin/brands/:id` qatoridan keyin:
```ts
  route('api/admin/types', 'routes/api.admin.types.tsx'),
  route('api/admin/types/:catId/:id', 'routes/api.admin.types.$catId.$id.tsx'),
```

- [ ] **Step 9: Klient** — `src/admin/api.ts`: type importiga `ApiProductType`; oxiriga:

```ts
// ── Tovar turlari ───────────────────────────────────────────────────────────
export interface AdminTypeInput {
  id?: string;
  categoryId: string;
  label: string;
  labelRu: string;
  iconUrl: string;
  billzAliases: string[];
  sortOrder: number;
}
export async function listTypes(): Promise<ApiProductType[]> {
  return handle(await fetch('/api/admin/types'));
}
export async function createType(t: AdminTypeInput): Promise<ApiProductType> {
  return handle(await fetch('/api/admin/types', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(t),
  }));
}
export async function updateType(categoryId: string, id: string, t: AdminTypeInput): Promise<ApiProductType> {
  return handle(await fetch(`/api/admin/types/${encodeURIComponent(categoryId)}/${encodeURIComponent(id)}`, {
    method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(t),
  }));
}
export async function deleteType(categoryId: string, id: string): Promise<{ ok: true; cleared: number }> {
  return handle(await fetch(`/api/admin/types/${encodeURIComponent(categoryId)}/${encodeURIComponent(id)}`, { method: 'DELETE' }));
}
```
`src/admin/errText.ts` `MESSAGES`ga:
```ts
  label_required: 'Nomi majburiy',
  id_invalid: "ID faqat kichik lotin harflari, raqam va '-' (40 belgigacha)",
  icon_required: 'Ikonka majburiy',
  url_invalid: "Rasm yo'li noto'g'ri",
  aliases_limit: 'Billz aliaslari: 20 tagacha, har biri 40 belgigacha',
  categoryId_invalid: "Yo'nalish topilmadi",
```
va `id_taken` xabarini umumiylashtiring: `id_taken: 'Bu ID allaqachon band'` (modellar parseri ham shu kodni beradi).

- [ ] **Step 10: Test, lint, curl**

Run: `bun run lint && bun run test` → PASS (typegen ikki yangi `+types` yaratadi).
`curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3000/api/admin/types` → `401`.

- [ ] **Step 11: Commit**

```bash
git add shared/types.ts functions/lib/validate.ts functions/lib/validate.test.ts functions/lib/db.ts app/routes.ts app/routes/api.admin.types.tsx 'app/routes/api.admin.types.$catId.$id.tsx' app/routes/api.admin.products.tsx 'app/routes/api.admin.products.$id.tsx' 'app/routes/api.admin.categories.$id.tsx' src/admin/api.ts src/admin/errText.ts
git commit -m "feat(admin): turlar API (CRUD, mahsulot soni), type_invalid bazadan, yo'nalish o'chirilsa turlari ham

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 6: Admin "Turlar" ekranlari, ikonka yuklash 220×136, mahsulot formasida turlar API'dan

**Files:**
- Modify: `src/admin/lib/image-normalize.ts` (+`maxHeight`, `fitScale`), `src/admin/lib/image-normalize.test.ts`, `src/admin/ImageUploader.tsx` (`normalize` propi), `src/admin/nav.ts` (Turlar tabi), `src/admin/AdminApp.tsx` (`screenFor` id bilan), `src/admin/ProductForm.tsx` (tur select'i API'dan)
- Create: `src/admin/screens/TypesList.tsx`, `src/admin/screens/TypeEdit.tsx`

**Interfaces:**
- Consumes: `listTypes/createType/updateType/deleteType`, `AdminTypeInput` (T5); `ApiProductType`; `listCategories`; kit: `Page, Card, Button, Badge, Field, Input, Select, DataTable, Column, EmptyState, Skeleton`, `useToast`, `useConfirm`; `ImageUploader { label; images; onChange; multiple?; reorderable?; normalize? }`; `adminPath`.
- Produces: `fitScale(w: number, h: number, maxSize: number, maxHeight?: number): number`; `NormalizeOptions.maxHeight`; `TypesList: FC`; `TypeEdit: FC<{ id: string }>` (`id` = `'new'` yoki `` `${categoryId}/${typeId}` ``); `screenFor(key, clearDefaultPw, defaultPw, id: string | null)`.

- [ ] **Step 1: `fitScale` testi** — `src/admin/lib/image-normalize.test.ts` (import qatoriga `fitScale`):

```ts
describe('fitScale', () => {
  it('uzun tomon maxSize dan katta bo\'lsa kichraytiradi, kattalashtirmaydi', () => {
    expect(fitScale(1000, 500, 220)).toBeCloseTo(0.22);
    expect(fitScale(100, 50, 220)).toBe(1);
  });
  it('maxHeight bo\'lsa balandlik ham chegaralanadi (220×136 quti)', () => {
    expect(fitScale(300, 300, 220, 136)).toBeCloseTo(136 / 300);
    expect(fitScale(1000, 100, 220, 136)).toBeCloseTo(0.22);
  });
});
```
Run: `bunx vitest run src/admin/lib/image-normalize.test.ts` → FAIL (`fitScale` yo'q).

- [ ] **Step 2: `image-normalize.ts`** — `NormalizeOptions`ga `maxHeight?: number;` (izoh: `/** Balandlik chegarasi — tur ikonkasi 220×136 qutiga sig'sin (uzun tomon yetarli emas). */`); export:

```ts
/** Kontent qutisini `maxSize` (uzun tomon) va ixtiyoriy `maxHeight` ichiga sig'diradigan masshtab; hech qachon > 1. */
export function fitScale(w: number, h: number, maxSize: number, maxHeight?: number): number {
  const byLong = maxSize / Math.max(w, h);
  const byHeight = maxHeight ? maxHeight / h : 1;
  return Math.min(1, byLong, byHeight);
}
```
`normalizeImage` ichida `const scale = Math.min(1, maxSize / Math.max(b.width, b.height));` → `const scale = fitScale(b.width, b.height, maxSize, opts.maxHeight);`.

- [ ] **Step 3: `ImageUploader.tsx`** — prop qo'shing: `normalize?: NormalizeOptions` (import `type NormalizeOptions` `./lib/image-normalize`dan); `handleFiles`da `normalizeImage(file)` → `normalizeImage(file, normalize)`; FC props tipiga va destrukturaga `normalize` qo'shing.

- [ ] **Step 4: `nav.ts`** — importga `Shapes`; products tabs'ga `list`dan keyin: `{ id: 'types', segment: 'types', label: 'Turlar', Icon: Shapes },`.

- [ ] **Step 5: `AdminApp.tsx`** — `screenFor` imzosi `(key: string, clearDefaultPw: () => void, defaultPw: boolean, id: string | null)`; `import TypesList from './screens/TypesList'; import TypeEdit from './screens/TypeEdit';`; case qo'shing:
```ts
    case 'products/types': return id ? <TypeEdit key={id} id={id} /> : <TypesList />;
```
`SectionPage`da chaqiruv: `screenFor(\`${section.id}/${tab.id}\`, clearDefaultPw, defaultPw, route.id)`.

- [ ] **Step 6: `src/admin/screens/TypesList.tsx`**

```tsx
import { useEffect, useState } from 'react';
import type { FC } from 'react';
import { useNavigate } from 'react-router';
import type { ApiCategory, ApiProductType } from '../../../shared/types';
import { listCategories, listTypes } from '../api';
import { Badge, Button, Card, DataTable, EmptyState, Skeleton, type Column } from '../ui';

const MAX_CHIPS = 4;

/** Turlar — 4 yo'nalish bo'yicha guruhlangan; qator bosilsa tahrir. Tartib = saytdagi tur qatori tartibi. */
const TypesList: FC = () => {
  const navigate = useNavigate();
  const [rawTypes, setTypes] = useState(null as ApiProductType[] | null);
  const [rawCats, setCats] = useState([] as ApiCategory[]);
  const [error, setError] = useState('');
  const types = rawTypes as ApiProductType[] | null;
  const cats = rawCats as ApiCategory[];

  useEffect(() => {
    Promise.all([listTypes(), listCategories()])
      .then(([t, c]) => { setTypes(t); setCats(c); })
      .catch(() => setError('Yuklashda xatolik'));
  }, []);

  const columns: Column<ApiProductType>[] = [
    {
      id: 'icon', label: '', className: 'w-16',
      cell: (t) => <img src={t.iconUrl} alt="" className="h-9 w-14 object-contain object-bottom" />,
      mobile: 'hide',
    },
    {
      id: 'label', label: 'Nomi', mobile: 'title',
      cell: (t) => (
        <span className="flex flex-col">
          <span className="text-primary">{t.label}</span>
          {t.labelRu && t.labelRu !== t.label && <span className="text-label text-muted-2">{t.labelRu}</span>}
        </span>
      ),
    },
    {
      id: 'aliases', label: 'Billz aliaslari',
      cell: (t) => (
        <span className="flex flex-wrap gap-1">
          {t.billzAliases.slice(0, MAX_CHIPS).map((a) => <Badge key={a}>{a}</Badge>)}
          {t.billzAliases.length > MAX_CHIPS && <Badge>+{t.billzAliases.length - MAX_CHIPS}</Badge>}
          {t.billzAliases.length === 0 && <span className="text-label text-muted-2">faqat nom</span>}
        </span>
      ),
    },
    { id: 'count', label: 'Mahsulot', align: 'right', className: 'w-24', cell: (t) => <span className={t.productCount > 0 ? 'text-primary' : 'text-muted-2'}>{t.productCount}</span> },
    { id: 'sort', label: 'Tartib', align: 'right', className: 'w-20', cell: (t) => <span className="text-muted">{t.sortOrder}</span>, mobile: 'hide' },
  ];

  if (error) return <EmptyState title="Ma'lumot yuklanmadi" text={error} />;
  if (!types) return <Skeleton rows={6} />;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <p className="text-para text-muted">Yo'nalish sahifasidagi tur qatori va Billz moslash shu ro'yxatdan. Ikonka — shaffof PNG, 220×136 ga sig'diriladi.</p>
        <Button to="/admin/products/types/new">Tur qo'shish</Button>
      </div>
      {cats.map((c) => {
        const rows = types.filter((t) => t.categoryId === c.id);
        return (
          <Card key={c.id} title={c.name} description={`${rows.length} ta tur`} padded={false}>
            <div className="px-2 pb-2">
              <DataTable
                columns={columns}
                rows={rows}
                rowKey={(t) => `${t.categoryId}/${t.id}`}
                onRowClick={(t) => navigate(`/admin/products/types/${t.categoryId}/${t.id}`)}
                empty={<p className="px-3 py-6 text-para text-muted">Bu yo'nalishda tur yo'q.</p>}
              />
            </div>
          </Card>
        );
      })}
    </div>
  );
};

export default TypesList;
```

- [ ] **Step 7: `src/admin/screens/TypeEdit.tsx`**

```tsx
import { useEffect, useState } from 'react';
import type { FC } from 'react';
import { useNavigate } from 'react-router';
import { X } from 'lucide-react';
import type { ApiCategory, ApiProductType } from '../../../shared/types';
import { createType, deleteType, listCategories, listTypes, updateType, type AdminTypeInput } from '../api';
import { errText } from '../errText';
import ImageUploader from '../ImageUploader';
import { Badge, Button, Card, Field, INPUT_CLS, Input, Page, Select, Skeleton } from '../ui';
import { useConfirm } from '../ui/confirm';
import { useToast } from '../ui/toast';

const LIST = '/admin/products/types';

/** Nomdan id — serverdagi `slugify` bilan bir xil qoida (kichik lotin, raqam, `-`). */
function slugId(label: string): string {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

interface Form { categoryId: string; id: string; label: string; labelRu: string; iconUrl: string; billzAliases: string[]; sortOrder: number }
const EMPTY: Form = { categoryId: '', id: '', label: '', labelRu: '', iconUrl: '', billzAliases: [], sortOrder: 0 };

/** Tur tahriri. `id` = 'new' yoki `${categoryId}/${typeId}` (yaratilgandan keyin id/yo'nalish o'zgarmaydi). */
const TypeEdit: FC<{ id: string }> = ({ id }) => {
  const isNew = id === 'new';
  const [catParam, typeParam] = isNew ? ['', ''] : id.split('/');
  const navigate = useNavigate();
  const toast = useToast();
  const confirm = useConfirm();
  const [rawForm, setForm] = useState(EMPTY as Form);
  const form = rawForm as Form;
  const [rawCats, setCats] = useState([] as ApiCategory[]);
  const cats = rawCats as ApiCategory[];
  const [rawCurrent, setCurrent] = useState(null as ApiProductType | null);
  const current = rawCurrent as ApiProductType | null;
  const [loaded, setLoaded] = useState(isNew);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [alias, setAlias] = useState('');

  useEffect(() => {
    listCategories().then(setCats).catch(() => setError('Yo\'nalishlar yuklanmadi'));
    if (isNew) return;
    listTypes().then((all) => {
      const t = all.find((x) => x.categoryId === catParam && x.id === typeParam);
      if (!t) { setError('Tur topilmadi'); return; }
      setCurrent(t);
      setForm({ categoryId: t.categoryId, id: t.id, label: t.label, labelRu: t.labelRu, iconUrl: t.iconUrl, billzAliases: t.billzAliases, sortOrder: t.sortOrder });
      setLoaded(true);
    }).catch(() => setError('Yuklashda xatolik'));
  }, [isNew, catParam, typeParam]);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => { setForm((f: Form) => ({ ...f, [k]: v })); setDirty(true); };

  function addAlias() {
    const a = alias.trim();
    setAlias('');
    if (!a || form.billzAliases.includes(a)) return;
    set('billzAliases', [...form.billzAliases, a]);
  }

  async function save() {
    setBusy(true); setError('');
    const body: AdminTypeInput = {
      id: form.id || undefined, categoryId: form.categoryId, label: form.label, labelRu: form.labelRu,
      iconUrl: form.iconUrl, billzAliases: form.billzAliases, sortOrder: form.sortOrder,
    };
    try {
      if (isNew) {
        const created = await createType(body);
        toast('Tur qo\'shildi');
        navigate(`${LIST}/${created.categoryId}/${created.id}`, { replace: true });
      } else {
        const saved = await updateType(catParam, typeParam, body);
        setCurrent(saved);
        setDirty(false);
        toast('Saqlandi · saytda 1–5 daqiqada ko\'rinadi');
      }
    } catch (e) {
      setError(errText(e));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!current) return;
    const n = current.productCount;
    const ok = await confirm({
      title: `«${current.label}» turini o'chirish`,
      message: n > 0 ? `${n} ta mahsulot tursiz qoladi — katalogda ko'rinadi, tur qatorida chiqmaydi.` : 'Bu turda mahsulot yo\'q.',
      confirmLabel: "O'chirish", destructive: true,
    });
    if (!ok) return;
    try {
      await deleteType(catParam, typeParam);
      toast('Tur o\'chirildi');
      navigate(LIST);
    } catch (e) {
      toast(errText(e), 'error');
    }
  }

  const title = isNew ? 'Yangi tur' : current?.label ?? 'Tur';
  const canSave = dirty && !busy && form.label.trim() !== '' && form.categoryId !== '' && form.iconUrl !== '';

  return (
    <Page
      title={title}
      back={LIST}
      actions={<Button onClick={save} disabled={!canSave}>{busy ? 'Saqlanmoqda…' : 'Saqlash'}</Button>}
    >
      {!loaded && !error ? <Skeleton rows={4} /> : (
        <div className="flex flex-col gap-4">
          {error && <p className="text-para text-danger">{error}</p>}
          <Card title="Asosiy">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Yo'nalish" required>
                <Select value={form.categoryId} onChange={(v) => set('categoryId', v)} disabled={!isNew}>
                  <option value="">— tanlang —</option>
                  {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Select>
              </Field>
              <Field label="ID" hint={isNew ? "Bo'sh qolsa nomdan yasaladi; keyin o'zgarmaydi" : 'Yaratilgandan keyin o\'zgarmaydi'} required>
                <Input value={form.id} onChange={(v) => set('id', v)} placeholder={slugId(form.label)} disabled={!isNew} />
              </Field>
              <Field label="Nomi" required>
                <Input value={form.label} onChange={(v) => set('label', v)} />
              </Field>
              <Field label="Nomi (ru)" hint="Bo'sh qolsa o'zbekchasi chiqadi">
                <Input value={form.labelRu} onChange={(v) => set('labelRu', v)} />
              </Field>
              <Field label="Tartib" hint="Tur qatoridagi o'rni — kichigi oldin">
                <Input type="number" value={String(form.sortOrder)} onChange={(v) => set('sortOrder', Number(v) || 0)} />
              </Field>
            </div>
          </Card>

          <Card title="Ikonka" description="Shaffof PNG; yuklashda 220×136 qutiga sig'diriladi (sayt yarim o'lchamda chizadi).">
            <ImageUploader
              label="Ikonka"
              images={form.iconUrl ? [form.iconUrl] : []}
              onChange={(next) => set('iconUrl', next[0] ?? '')}
              normalize={{ maxSize: 220, maxHeight: 136, quality: 0.8 }}
            />
          </Card>

          <Card title="Billz aliaslari" description="Billz'dagi kategoriya nomlari — sinxronizatsiya shu nomdagi tovarni shu turga qo'yadi (tur nomi ham mos keladi).">
            <div className="flex flex-wrap gap-2">
              {form.billzAliases.map((a) => (
                <span key={a} className="inline-flex items-center gap-1">
                  <Badge>{a}</Badge>
                  <button type="button" aria-label={`${a} — olib tashlash`} onClick={() => set('billzAliases', form.billzAliases.filter((x) => x !== a))} className="press rounded-full p-1 text-muted-2 hover:text-primary">
                    <X aria-hidden className="size-3.5" />
                  </button>
                </span>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              {/* Kit `Input`i onKeyDown bermaydi — native input o'sha `INPUT_CLS` bilan (Enter alias qo'shadi). */}
              <input
                value={alias}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAlias(e.target.value)}
                onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') { e.preventDefault(); addAlias(); } }}
                placeholder="Masalan: DDR5 — Enter"
                className={INPUT_CLS}
              />
              <Button variant="secondary" onClick={addAlias}>Qo'shish</Button>
            </div>
          </Card>

          {!isNew && current && (
            <Card title="Xavfli zona" description="Tur o'chirilsa shu turdagi mahsulotlar tursiz qoladi.">
              <Button variant="destructive" onClick={remove}>Turni o'chirish</Button>
            </Card>
          )}
        </div>
      )}
    </Page>
  );
};

export default TypeEdit;
```
Izoh: `React.KeyboardEvent` shim 1-bosqichda qo'shilgan (`src/admin/react-events.d.ts`); `INPUT_CLS` kit'ning `form.tsx`idan (`../ui` re-export qiladi).

- [ ] **Step 8: `ProductForm.tsx`** — eski forma turlarni API'dan oladi:
  - import: `import { typesFor, findType } from '../../shared/product-types';` → o'chiring; `listTypes` ni `./api` importiga, `ApiProductType` ni types importiga qo'shing.
  - state: `const [rawTypes, setTypes] = useState([] as ApiProductType[]); const types = rawTypes as ApiProductType[];` va effect: `useEffect(() => { listTypes().then(setTypes).catch(() => {}); }, []);`
  - `pickModel`: `type: f.type && types.some((t) => t.categoryId === m.categoryId && t.id === f.type) ? f.type : null,`
  - kategoriya `onChange`: `type: f.type && types.some((t) => t.categoryId === categoryId && t.id === f.type) ? f.type : null,`
  - tur select: `{types.filter((t) => t.categoryId === form.categoryId).map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}`

- [ ] **Step 9: Lint, test, brauzer**

Run: `bunx vitest run src/admin/lib/image-normalize.test.ts && bun run lint && bun run test` → PASS.
Brauzer (egasi kirgan): `/admin/products/types` — 4 karta (Apple 9, PC 12, Audio 8, Video 10), ikonkalar ko'rinadi; qator bosilsa `/admin/products/types/pc/cpu` ochiladi, "Tartib"ni o'zgartirib Saqlash → toast; `/category/pc` tile qatorida tartib o'zgargan (qaytarib qo'ying). "Tur qo'shish" → `/admin/products/types/new`: nom "Test tur" → ID placeholder `test-tur`, ikonkasiz Saqlash o'chiq. Fayl yuklash Browser panelida qiyin — yaratishni sahifa ichidan `fetch` bilan tekshiring (cookie bilan): `await (await fetch('/api/admin/types', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ categoryId: 'pc', label: 'Test tur', labelRu: '', iconUrl: '/sections/gpu.webp', billzAliases: ['Test Alias'], sortOrder: 999 }) })).status` → `201`; so'ng `/admin/products/types/pc/test-tur` ochiladi, alias chipi ko'rinadi, "Turni o'chirish" tasdiq varag'i (`0 ta mahsulot`) bilan o'chiradi → ro'yxatga qaytadi. `/admin/products` → mahsulot tahririda "Turi" select'i to'ldirilgan. Mobil 375px: turlar kartalari `DataTable` mobil ko'rinishida.

- [ ] **Step 10: Commit**

```bash
git add src/admin/lib/image-normalize.ts src/admin/lib/image-normalize.test.ts src/admin/ImageUploader.tsx src/admin/nav.ts src/admin/AdminApp.tsx src/admin/ProductForm.tsx src/admin/screens/TypesList.tsx src/admin/screens/TypeEdit.tsx
git commit -m "feat(admin): Turlar bo'limi — ro'yxat, tahrir, ikonka 220×136, mahsulot formasida turlar bazadan

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 7: Brend tasmasi `brands.logo_url`dan

**Files:**
- Modify: `app/routes/home.tsx` (loader + render), `src/store/HomePage.tsx` (prop), `src/store/BrandStrip.tsx` (props, importlar), `src/admin/BrandForm.tsx` (izoh)
- Delete: `src/assets/images/logos/` (16 SVG — endi `public/brands/`da)

**Interfaces:**
- Consumes: `loadBrands(env): Promise<ApiBrand[]>` (`ApiBrand { id; name; slug; logoUrl; sortOrder }`).
- Produces: `BrandStrip: FC<{ title: string; brands: ApiBrand[] }>` (logotipi bor brendlar `sort_order` bo'yicha, ikki qatorga bo'linadi: birinchi yarmi yuqorida, qolgani pastda; bitta qator ham bo'lishi mumkin); `HomePage` `brands: ApiBrand[]` propi; home loader `brands` (faqat `logoUrl !== ''`).

- [ ] **Step 1: `app/routes/home.tsx`** — `loadBrands` importi; loader:
```ts
  const [categories, news, banners, allBrands] = await Promise.all([loadCategories(env), loadNews(env), loadBanners(env), loadBrands(env)]);
  // Tasmada faqat logotipi bor brendlar (admin → Brendlar'da yuklanadi); tartib sort_order.
  const brands = allBrands.filter((b) => b.logoUrl !== '');
  return { categories, news, banners, brands, locale, origin: new URL(request.url).origin };
```
Render: `<HomePage … brands={brands} />` (`useLoaderData`dan `brands` olinadi).

- [ ] **Step 2: `src/store/HomePage.tsx`** — props tipiga `brands: ApiBrand[]` (import `ApiBrand`); render: `{brands.length > 0 && <BrandStrip title={t.homeBrands} brands={brands} />}`.

- [ ] **Step 3: `src/store/BrandStrip.tsx`** — 16 ta `import … from '../assets/images/logos/*.svg'` qatorini, `ROW_TOP`/`ROW_BOTTOM`ni o'chiring; `import type { ApiBrand } from '../../shared/types';` qo'shing; `Logo`, `Mark`, `Row`, konstantalar qoladi; komponent:

```tsx
/**
 * Brendlar tasmasi — `brands.logo_url` dan (admin → Brendlar). Ikki qator qarama-qarshi yo'nalishda:
 * birinchi yarmi yuqorida, qolgani pastda; kam bo'lsa `Row` o'zi to'ldiradi. Logotiplar `brand-logo`
 * klassi bilan bir tonga (yorug'da qora, qorong'ida oq) keltiriladi — rangli PNG ham silhouette bo'ladi.
 */
const BrandStrip: FC<{ title: string; brands: ApiBrand[] }> = ({ title, brands }) => {
  const logos: Logo[] = brands.map((b) => ({ src: b.logoUrl, name: b.name }));
  const half = Math.ceil(logos.length / 2);
  const top = logos.slice(0, half);
  const bottom = logos.slice(half);
  return (
    <section className="flex flex-col gap-8 md:gap-10">
      <h2 className={SECTION_HEADING}>{title}</h2>
      <div className="flex flex-col gap-14">
        <Row logos={top} />
        {bottom.length > 0 && <Row logos={bottom} reverse />}
      </div>
    </section>
  );
};
```

- [ ] **Step 4: Asl SVG papkani o'chiring va importlarni tekshiring**

```bash
git rm -rq src/assets/images/logos && grep -rn "assets/images/logos" src app | wc -l
```
Expected: `0`.

- [ ] **Step 5: `src/admin/BrandForm.tsx`** — fayl input'i ostiga (`</div>` dan oldin, 65-qator atrofida) izoh:
```tsx
      <p className="text-label text-muted mb-3">Logo yuklansa bosh sahifadagi brendlar tasmasida chiqadi. Shaffof fonli PNG; tasmada bir rangga (qora/oq) keltiriladi.</p>
```
(Eski forma — o'z uslubida qoladi, 2b qayta bo'yaydi.)

- [ ] **Step 6: Lint, test, brauzer**

Run: `bun run lint && bun run test` → PASS.
`curl -s http://localhost:3000/ | grep -o '/brands/[a-z0-9-]*\.svg' | sort -u | wc -l` → `16`; brauzerda landing "Brendlar" bo'limi ikki qator, logotiplar avvalgidek bir tonda.

- [ ] **Step 7: Commit**

```bash
git add app/routes/home.tsx src/store/HomePage.tsx src/store/BrandStrip.tsx src/admin/BrandForm.tsx
git commit -m "feat(store): brendlar tasmasi brands.logo_url dan; bundled SVG logotiplar olib tashlandi

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 8: Kategoriya formasi — ikonka tanlagichi va cover izohlari yo'q

**Files:**
- Modify: `src/admin/CategoryForm.tsx`, `src/admin/CategoryList.tsx`
- Delete: `src/lib/category-icons.tsx`

**Interfaces:**
- `parseCategoryInput`/API o'zgarmaydi — forma `icon`, `iconUrl`, `coverLede`, `coverLedeRu` uchun **mavjud qiymatni** yuboradi (UI'siz), yangi kategoriyada `''`.

- [ ] **Step 1: `CategoryForm.tsx`** — `import { CATEGORY_ICON_LIST, categoryIcon } from '../lib/category-icons';` o'chiriladi; `icon`, `coverLede`, `coverLedeRu` state'lari va ularning JSX bloklari (ikonka to'ri 53–75, izoh inputlari 82–87) o'chiriladi; payload:
```ts
      // Saytda ko'rinmaydigan ustunlar (ikonka kaliti, cover izohi) tahrirlanmaydi — mavjud qiymat saqlanadi.
      const payload = {
        name, nameRu, coverUrl, sortOrder,
        icon: initial?.icon ?? '', iconUrl: initial?.iconUrl ?? '',
        coverLede: initial?.coverLede ?? '', coverLedeRu: initial?.coverLedeRu ?? '',
      };
```

- [ ] **Step 2: `CategoryList.tsx`** — `import { categoryIcon } from '../lib/category-icons';` o'chiriladi; `items.map` bloki (50–67-qatorlar) to'liq shu bilan almashadi:
```tsx
      <div className="space-y-2">
        {items.map((c) => (
          <div key={c.id} className=" rounded-md bg-white p-3 flex items-center gap-3">
            {/* Avatar — cover eskizi, bo'lmasa bosh harf (ikonka kaliti saytda ishlatilmaydi). */}
            {c.coverUrl ? (
              <img src={c.coverUrl} alt="" className="w-10 h-10 rounded-full object-cover bg-bg" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-bg flex items-center justify-center text-primary font-semibold">{c.name.slice(0, 1)}</div>
            )}
            <div className="flex-1 font-semibold">{c.name}</div>
            <IconAction Icon={Pencil} label="Tahrir" onClick={() => setEditing(c)} />
            <IconAction Icon={Trash2} label="O'chir" onClick={() => remove(c)} danger />
          </div>
        ))}
      </div>
```

- [ ] **Step 3: Registrni o'chiring**

```bash
git rm -q src/lib/category-icons.tsx && grep -rn "category-icons" src app shared functions | wc -l
```
Expected: `0` (`shared/types.ts:68` izohidagi "see src/lib/category-icons" ni `(saytda ishlatilmaydi, ustun qoldi)` ga almashtiring).

- [ ] **Step 4: Lint, test, brauzer, commit**

`bun run lint && bun run test` → PASS. `/admin/products/categories`: forma faqat nom uz/ru, tartib, cover; ro'yxatda cover eskizi yoki bosh harf.

```bash
git add src/admin/CategoryForm.tsx src/admin/CategoryList.tsx shared/types.ts
git commit -m "chore(admin): kategoriya formasidan saytda chiqmaydigan ikonka tanlagichi va cover izohi olib tashlandi

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 9: Eski registrni o'chirish, hujjat

**Files:**
- Modify: `shared/product-types.ts` (eski qism o'chadi), `shared/product-types.test.ts` (eski testlar o'chadi), izohli havolalar: `app/lib/catalog.ts:16`, `shared/types.ts:23`, `src/data/products.ts:30`, `src/store/PcConfigurator.tsx:14`; `CLAUDE.md`; `docs/superpowers/specs/2026-09-15-admin-redesign-design.md`

- [ ] **Step 1: Iste'molchilar qolmaganini tekshiring**

```bash
grep -rn "typesFor\|findType\|typeForBillzCategory\|PRODUCT_TYPES\b" app src shared functions server --include='*.ts' --include='*.tsx' | grep -v "product-types.ts\|product-types.test.ts"
```
Expected: faqat izoh qatorlari (`catalog.ts`, `types.ts`, `products.ts`, `PcConfigurator.tsx`) — kod chaqiruvi yo'q. Bo'lsa — o'sha task qoldirgan, avval uni tuzating.

- [ ] **Step 2: `shared/product-types.ts`** — `ProductType` interfeysi, `PRODUCT_TYPES`, `typesFor`, `findType`, `typeForBillzCategory` va fayl boshidagi eski izoh o'chiriladi; fayl boshi:
```ts
/**
 * Tovar turlari — yo'nalish ichidagi bo'linish (iPhone, GPU, Mikrofon …).
 * Ro'yxat bazada (`product_types`, migratsiya 0035; admin → Mahsulotlar → Turlar). Bu fayl sof:
 * qator shakli va yordamchilar — sayt (`loadTypes`), Billz runner (`server/`) va admin ishlatadi,
 * shuning uchun `shared/`da va `.ts` kengaytmali import bilan.
 */
```
`shared/product-types.test.ts` — `describe('PRODUCT_TYPES')` va eski `describe('typeForBillzCategory')` bloklari va `existsSync` importi o'chiriladi (T2 testlari qoladi).

- [ ] **Step 3: Izohlar** — to'rt fayldagi "`shared/product-types.ts` registri" so'zlarini "`product_types` jadvali (admin → Turlar)" ga almashtiring (kod o'zgarmaydi).

- [ ] **Step 4: CLAUDE.md** — quyidagi joylarni yangilang (Edit bilan, boshqa matn tegilmaydi):
  1. "Tovar turi (2026-09)" xatboshisi (`**Tovar turi (2026-09)** — yo'nalishning ichki bo'linishi (\`products.type\`, registr \`shared/product-types.ts\`…`): "registr `shared/product-types.ts`" → "**`product_types` jadvali** (migratsiya `0035`, admin → Mahsulotlar → **Turlar**: nom uz/ru, id — yaratilgach o'zgarmaydi, ikonka — shaffof PNG 220×136 qutiga (`normalizeImage` `maxHeight`), Billz aliaslari, tartib; tur o'chirilsa `products.type = NULL`); sayt `loadTypes` + sof `categoryTiles(types, …)`, Billz `matchBillzType(typesOf(ctx.types, cat), nom)`, mahsulot `type_invalid` route'da `typeExists` bilan".
  2. "Turlar registri kodda: alohida jadval + CRUD hozircha ortiqcha…" gapini o'chiring.
  3. Billz bo'limi "Tur = Billz kategoriyasining birinchisi → `typeForBillzCategory` (`shared/product-types.ts`dagi `billz[]` aliaslari + `label`…)" → "`matchBillzType` (`product_types.billz_aliases` + `label`, run boshida bazadan o'qiladi)".
  4. `app/lib/tiles.ts` tavsifi: "`categoryTiles(categoryId, lang)` registrdagi turlarni…" → "`categoryTiles(types, categoryId, lang)` — sof; turlar `loadTypes(env)` bilan bazadan"; "`shared/product-types.test.ts` har bir `icon` fayli `public/`da borligini tekshiradi" gapini o'chiring.
  5. Marquee/BrandStrip xatboshisi: "Logo SVGs are stored with their viewBox tightened…" oldiga: "**2026-09-16:** logotiplar `brands.logo_url`dan (admin → Brendlar; 16 ta SVG `public/brands/`da, migratsiya `0035` yozgan); tasma faqat logotipi bor brendlarni `sort_order` bo'yicha oladi, birinchi yarmi yuqori, qolgani pastki qator; 0 bo'lsa bo'lim chiqmaydi."
  6. Data model: `0034` dan keyin "`0035` **tovar turlari va kontent** (`product_types` + 39 seed; `site_texts`/`site_assets` — 4-bosqich; brend logotiplari `public/brands/` + `logo_url`)".
  7. Admin panel bo'limidagi "Categories" tavsifi: "Kategoriyalar (nom uz/ru, tartib, cover — ikonka tanlagichi va cover izohi 2026-09-16'da olib tashlandi, saytda chiqmasdi; `src/lib/category-icons.tsx` o'chirildi)"; Known dead code: `category-icons` o'chirilgani.
  8. 1-bosqich xatboshisidagi "1-bosqich bajarildi" → "1- va 2a-bosqich bajarildi".
- Spec: §5 "Turlar" va §6 `parseTypeInput` matnidagi "440×272" → "220×136 (mavjud ikonkalar bilan bir o'lcham; sayt `[zoom:0.5]`)".

- [ ] **Step 5: Lint, test, commit**

`bun run lint && bun run test` → PASS.
```bash
git add shared/product-types.ts shared/product-types.test.ts app/lib/catalog.ts shared/types.ts src/data/products.ts src/store/PcConfigurator.tsx CLAUDE.md docs/superpowers/specs/2026-09-15-admin-redesign-design.md
git commit -m "chore(types): eski tur registri o'chirildi; CLAUDE.md va spec — turlar bazada, brend tasmasi, kategoriya formasi

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

## O'z-o'zini tekshirish (spec bilan)

- §6 `product_types` (kalit, ustunlar, seed, `PC_SLOTS` id'lari kodda) — T1, T3–T5 ✔; `site_texts`/`site_assets` jadvallari — T1 (4-bosqich ishlatadi) ✔.
- §6 API (`GET/POST /api/admin/types`, `PUT/DELETE /:catId/:id`, `parseTypeInput` qoidalari, `iconUrl` `/images/products/` yoki `/sections/`, aliaslar ≤ 20, `type_invalid` bazadan, `errText` kodlari) — T5 ✔.
- §5 Turlar ekrani (guruhlangan ro'yxat, forma maydonlari, id o'zgarmasligi, o'chirish tasdig'i soni bilan, ikonkasiz saqlanmaydi) — T6 ✔ (ikonka 220×136 — spec tuzatildi).
- §7 turlar: `tiles.ts` sof, `loadTypes`, Billz runner run boshida, `PcConfigurator` id'lari kodda — T3, T4 ✔.
- §7 `BrandStrip` bazadan, migratsiya logotiplar, 0 → bo'lim yo'q, `brand-logo` qoladi — T1, T7 ✔ (ikki qatorga bo'lish: yarmi/yarmi — hozirgi ko'rinish saqlanadi).
- §7 kategoriya ikonka registri va admin maydonlari o'chadi — T8 ✔. Brendlar/Kategoriyalar/Modellar ekranlarini kit bilan qayta chizish — **2b**.
- Yo'nalish o'chirilsa turlari ham (§6) — T5 ✔.
- Cheklovlar: hech bir task'da eski registr ishlatuvchi kod yashirin qolmaydi — T9 grep tekshiradi.

## Natija va qoldiqlar (bajarilgandan keyin, 2026-09-16)

Bajarildi: `feat/admin-2a` branch'ida 14 commit (`56ac005..HEAD`), har task alohida review, yakuniy butun-branch review
bitta tuzatish to'lqini bilan toza (lint 0, 27 fayl / 300 test). Brauzerda egasi kirgan holda tekshirildi: Turlar
ro'yxati (4 karta, ikonkalar) → tahrir → Tartib saqlash → `/category/pc` tile tartibi; yangi tur (ID placeholder, ikonkasiz
saqlanmaydi) → POST 201 → alias chipi → o'chirish tasdig'i; mahsulot formasida "Turi" select API'dan; landing brend tasmasi
2 qator × 16; kategoriya formasi; 375px.

Reja matnidan farqlar (ledger ruling'lari): tur ikonkasi 440×272 emas **220×136** (mavjud ikonkalar bilan bir o'lcham);
0035 brend `UPDATE`lari faqat bo'sh `logo_url`ni to'ldiradi (spec §6) va uchta `INSERT`dan keyin himoyali `UPDATE`;
`TabDef.detail` — id-ekranlar (`TypeEdit`) o'z `Page`ini chizadi, qobiq tashqi sarlavha/tablarni chizmaydi; BrandForm
izohi fayl qatorining ostida; `label_long` tekshiruvi id yasashdan oldin (aks holda `slugify` → `id_invalid`).

Qoldiqlar:

- **2b:** Mahsulotlar/Kategoriyalar/Brendlar/Modellar ekranlari kit bilan (eski `bg-white`/`text-[13px]` shu ekranlarda
  qoladi); mahsulot tahriri `detail: true` bilan; `ProductList` `?f=needs_image`; brend `sort_order` to'qnashuvi (0035
  10..160 vs mavjud qiymatlar — faqat admin ro'yxati tartibiga ta'sir qiladi, tasma logotipi borlarni oladi).
- **Kichik (istalgan bosqichda):** turlar POST check-then-insert (parallel dublikat → 500; admin bitta foydalanuvchi);
  yo'nalish o'chirilganda `products.type` qoladi (avvalgi xatti-harakat); `TypeEdit` `slugId` placeholder'i lotin-only
  (server kirillni ham slug qiladi); `loadTypes` SQL `ORDER BY` + `typesOf` saralashi ikki marta; `MapContext.types`
  `Readonly` emas; faqat `action`li `$id` route'larga kirishsiz GET RR'ning 400 xabarini beradi (sir oqmaydi) — umumiy
  `loader → 405` mumkin.
- **Deploy kuni tekshiruv:** `/category/pc` 12 tile + konfigurator bo'g'inlari; landing 2 qator × 16 logotip; admin →
  Turlar 4 karta; Billz run'idan keyin `SELECT count(*) FROM products WHERE type IS NULL AND category_id IS NOT NULL`
  avvalgi darajada. Prod'da 0035 `product_types`ni seed qiladi, `site_texts`/`site_assets` bo'sh (4-bosqich), mavjud
  `logo_url`ga tegmaydi.
- **6-bosqich:** `docs/egasi-qollanmasi.md`ga Turlar bo'limi (alias qo'shish jumlasi yozildi, to'liq bo'lim keyin).
