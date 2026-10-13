# PC konfigurator: admin boshqaradigan moslik guruhlari

**Sana:** 2026-10-13 · **Holat:** qoralama (egasi chatda dizaynni ma'qulladi, spec ko'rib chiqilmoqda)
**O'rnini bosadi:** `2026-09-18-pc-konfigurator-moslik-design.md` ning 1–2 va 6-bo'limlari (soket/DDR nomdan aniqlash va `pc_socket`/`pc_memory` tuzatishi). Qolgani (bo'g'inlar, buyurtma asosidagi qismlar, quvvat ogohlantirishi, qidiruv, UI) o'zgarmaydi.

## Muammo

Konfigurator mosligi hozir **tovar nomidan taxmin qilinadi** (`shared/pc-compat.ts`: chipset jadvallari, `ryzen 7xxx → AM5` kabi naqshlar). Nom noodatiy yozilsa (`MaxSun Challenger B760M-F`, `CPU Intel 265F`), qoida yo yanglish "mos" deydi, yo umuman aniqlay olmaydi. Admin tuzatishi (`products.pc_socket` / `pc_memory`) bor, lekin prod'dagi 272 qismning birortasida ham to'ldirilmagan — tovarlar ro'yxatida qaysi qism noto'g'ri aniqlanganini ko'rib bo'lmaydi. Qoidalarning o'zi (qaysi soketlar bor, qaysi bo'g'inlar tekshiriladi) kodda qotgan.

**Mijozning talabi:** moslik admin panel orqali boshqarilsin.

## Qarorlar (egasi bilan kelishilgan)

1. **Moslik guruh orqali, juftlik orqali emas.** Egasi taklif qilgan "har bir ID boshqa ID bilan mos/mos emas" g'oyasi saqlanadi, lekin ID tovarga emas, **qiymatga** beriladi (AM5, DDR5…). Juftlikma-juft bog'lash faqat CPU × plata uchun ~930 bog'lanish bo'lardi va har yangi tovar hammasi bilan qayta bog'lanishi kerak edi; guruhda yangi plataga bitta "AM5" belgisi yetadi.
2. **Admin tasdiqlamagan qism konfiguratorda chiqmaydi.** Nomdan taxmin endi saytda ishlatilmaydi.
3. **Nomdan aniqlash taklif bo'lib qoladi.** Admin ekranida nomdan chiqqan qiymat "taklif" sifatida ko'rinadi; admin ro'yxatni ko'rib, ommaviy "Tasdiqlash" bosadi. Saytga faqat tasdiqlangan qiymat ta'sir qiladi.

## Dizayn

### 1. Ma'lumot modeli (migratsiya `0044_pc_dimensions.sql`)

```sql
CREATE TABLE pc_dimensions (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  key        TEXT UNIQUE,                      -- 'socket' | 'memory' — faqat seed turlari (nomdan taklif shu kalit bo'yicha); admin yaratgani NULL
  name       TEXT NOT NULL,                    -- "Soket"
  name_ru    TEXT NOT NULL DEFAULT '',
  slots      TEXT NOT NULL DEFAULT '[]',       -- JSON: SlotKey[] (kamida 2 ta)
  is_active  INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE pc_dimension_values (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  dimension_id INTEGER NOT NULL,
  label        TEXT NOT NULL,                  -- "AM5"
  sort_order   INTEGER NOT NULL DEFAULT 0,
  UNIQUE (dimension_id, label)
);
CREATE TABLE pc_part_values (
  product_id TEXT NOT NULL,
  value_id   INTEGER NOT NULL,
  PRIMARY KEY (product_id, value_id)
);
CREATE INDEX idx_pc_part_values_value ON pc_part_values (value_id);
```

**Seed** (ikkalasi `is_active = 1`):

| key | Nomi (uz / ru) | Bo'g'inlar | Qiymatlar |
|---|---|---|---|
| `socket` | Soket / Сокет | `cpu`, `mb` | AM4, AM5, LGA1200, LGA1700, LGA1851 |
| `memory` | Xotira turi / Тип памяти | `cpu`, `mb`, `ram` | DDR4, DDR5 |

CPU xotira turiga ham kiradi — RAM plata tanlanmasdan oldin ham tekshiriladi (hozirgi xatti-harakat).

**Ko'chirish:** `pc_socket` / `pc_memory` to'ldirilgan qatorlar (prod'da 0 ta, lekin lokal bazalar uchun) shu migratsiyada `pc_part_values`ga o'tkaziladi (`INSERT … SELECT … JOIN pc_dimension_values ON label = pc_socket`). Ustunlarning o'zi bazada qoladi, kod ularni endi o'qimaydi ham, yozmaydi ham (`map_label` naqshi). `pc_watts` va `pc_hidden` o'zgarmaydi.

**Billz** bu jadvallarga tegmaydi — tovar nomi Billz'da o'zgarsa ham tasdiqlangan qiymat qoladi. Mahsulot o'chirilganda (`api.admin.products.$id` DELETE batch'i) `pc_part_values` qatorlari ham o'chadi.

### 2. Qism guruhi — dublikatlar bitta qiymat to'plamini bo'lishadi

Konfigurator nom bo'yicha dublikatlarni bitta qismga yig'adi (`partKey`, `toConfigParts`) — sinxronizatsiya eski dublikatni `is_active = 0` qilib qoldiradi va qaysi qator "vakil" bo'lishi qoldiqqa qarab o'zgaradi. Shu sababli:

- **o'qishda** guruhning qiymatlari = guruhdagi hamma qatorlar qiymatlarining **birlashmasi** (yangi dublikat kelsa ham qism yo'qolib qolmaydi);
- **yozishda** server berilgan `productId`ni o'sha bo'g'indagi guruhining hamma qatorlariga kengaytiradi (`partKey` bir xil). Klient (admin jadvali ham, mahsulot tahriri ham) bitta id yuborishi yetarli.

### 3. Qoida (`shared/pc-compat.ts`, sof, testli)

Atributlar endi nomdan emas, bazadan keladi:

```ts
interface PcDimension { id: number; key: string | null; name: string; nameRu: string; slots: SlotKey[]; active: boolean; values: { id: number; label: string }[] }
interface PartAttrs { values: Record<number, number[]>; watts: number | null }   // dimensionId → valueId[]
```

- **Ko'rinish:** `isTagged(slot, attrs, dims)` — `slot`ni o'z ichiga olgan **har bir faol** turda qism kamida bitta qiymatga ega. Ega bo'lmasa — `toConfigParts` uni chiqarmaydi. GPU, blok, SSD, korpus hozircha hech qaysi turga kirmaydi → avvalgidek hammasi ko'rinadi.
- **Moslik:** `issueFor(slot, cand, picked, dims)` — har faol tur `D` va har tanlangan `p` uchun (`p`ning bo'g'ini `cand`nikidan boshqa, ikkalasi `D.slots`da): `cand` va `p` ning `D` qiymatlari kesishmasi bo'sh bo'lsa → `block`, `{ code: 'dimension', dimensionId: D.id, need: p ning D qiymatlari }`. Maxsus holat yo'q: hozirgi "plata bo'lsa xotirani plata belgilaydi" qoidasi juftlik tekshiruvidan o'zi chiqadi (LGA1700 CPU `{DDR4, DDR5}`, D4 plata `{DDR4}`, DDR5 RAM → RAM plata bilan to'qnashadi, CPU bilan emas).
- **Quvvat** (`warn`, `pc_watts` → nomdan) va **grafikasiz protsessor** (`graphicsIssue`, nomdan) — o'zgarmaydi; ular saytni bloklamaydi.
- `candidateState` (oldingi bo'g'in bloklaydi, keyingisi `drops`), `summaryIssues` — tuzilishi o'zgarmaydi, `dims` parametri qo'shiladi.
- `needsVerify` — faqat blok quvvati qoladi (soket/DDR noma'lum qism endi umuman ko'rinmaydi).
- `hasMatch(cpu, boards, dims)` — CPU bilan `cpu`↔`mb` turlarining hammasida mos plata bormi (hozirgidek faqat ogohlantirish yozuvi).
- **Taklif:** `suggestValues(slot, name, dims)` — mavjud nom parserlari (`cpuSocket`, `boardSocket`, `ramMemory`, `nameMemory`, `socketMemory`…) **faqat** `key = 'socket' | 'memory'` turlar uchun, natija qiymat `label`iga moslanadi (turda bunday qiymat bo'lmasa — taklif yo'q). LGA1700 CPU xotirasi → `{DDR4, DDR5}`; H610 plata xotirasi → taklif yo'q (hozirgi noaniqlik qoidasi). Admin yaratgan turlarga taklif berilmaydi.

### 4. Sayt (`loadConfiguratorParts`, `PcConfigurator`)

- Loader faol turlarni, ularning qiymatlarini va konfigurator qatorlarining `pc_part_values`ini oladi (3 so'rov, `IN` bilan); `toConfigParts(rows, valuesByProduct, dims)` guruh birlashmasini va `isTagged` filtrini qo'llaydi. Natija: `{ parts, dims }` (dims — nom va qiymat yorliqlari sabab matni uchun).
- **Majburiy bo'g'inlardan (CPU, plata, RAM) birortasida qism bo'lmasa — konfigurator bo'limi umuman chizilmaydi.** Deploy'dan keyin egasi tasdiqlaguncha shunday turadi (pastdagi "Ishga tushirish"ga qarang).
- Sabab matni umumiy: `t.cfgNeedValue` = "{dim}: {need} kerak" (ru: "{dim}: нужен {need}"), `{need}` — qiymatlar " / " bilan. `cfgNeedSocket`, `cfgNeedMemory`, `cfgVerify` (soket/DDR uchun) olib tashlanadi; blok uchun `cfgVerify` qoladi.
- Qolgan UI (qatorlar, o'q-qadamlar, qidiruv, yig'ma, savatga qo'shish) o'zgarmaydi.

### 5. Admin

**API** (`requireAdmin` + `parseBody`; validatorlar `functions/lib/validate.ts`da):

| Endpoint | Vazifa |
|---|---|
| `GET /api/admin/pc-dimensions` | turlar + qiymatlar + har turda belgilanmagan qismlar soni |
| `POST /api/admin/pc-dimensions` | yangi tur (`is_active = 0` bo'lib yaratiladi) |
| `PUT /api/admin/pc-dimensions/:id` | nom uz/ru, bo'g'inlar (≥ 2, `SlotKey`), faol, qiymatlar (`[{ id?, label }]` — to'liq almashtirish; olib tashlangan qiymat `pc_part_values`dan ham o'chadi) |
| `DELETE /api/admin/pc-dimensions/:id` | faqat `key IS NULL` tur (Soket va Xotira turini o'chirib bo'lmaydi — faqat faolligini almashtirish mumkin) |
| `GET /api/admin/pc-parts?slot=cpu` | bo'g'in qismlari, guruhlangan: `{ id, ids, name, image, inStock, values, suggested }` |
| `PUT /api/admin/pc-parts` | `{ items: [{ productId, dimensionId, valueIds }] }` — o'sha qism guruhining shu turdagi qiymatlarini **almashtiradi** (bo'sh ro'yxat — tozalash). `≤ 500` element, qiymat shu turga tegishli, qism shu turning bo'g'inida bo'lishi shart |

`PUT pc-dimensions` validatsiyasi: nom 1–60 belgi, qiymat yorlig'i 1–30 belgi va tur ichida takrorlanmas, `slots` `PC_SLOTS` kalitlaridan. Xato kodlari `errText`/`ERR_MESSAGES`ga qo'shiladi.

**Ekran: Mahsulotlar → «Konfigurator»** (`nav.ts` — `{ id: 'configurator', segment: 'configurator', ownPage: true }`, `screens/ConfiguratorParts.tsx`):

- **"Moslik turlari" kartasi** — har tur bitta qator: nom, bo'g'in yorliqlari, qiymat chiplari, "N ta qism belgilanmagan", faol `Toggle`. Bosilsa — tahrir modali (`Modal`): nom uz/ru, 7 bo'g'in belgisi, qiymatlar (chip + qo'shish maydoni, ✕ bilan o'chirish — qismlarda ishlatilgan bo'lsa `useConfirm` bilan so'raladi), faqat admin yaratgan turda «O'chirish». "Yangi tur" tugmasi. **Yangi tur faol emas holda yaratiladi** — admin qismlarni belgilab bo'lgach yoqadi; aks holda yoqilgan zahoti o'sha bo'g'inning hamma qismi saytdan yo'qolardi (yoqishdan oldin `useConfirm`: "N ta qism belgilanmagan — ular konfiguratordan yo'qoladi").
- **"Qismlar" kartasi** — bo'g'in `Segmented` (faqat biror turga kirgan bo'g'inlar), filtr `Hammasi · Belgilanmagan · Tasdiqlangan` (URL'da, `product-filter` naqshida), `SearchInput`. `DataTable` qatori: belgi katakchasi, rasm, nom, "Omborda / Buyurtma asosida", har tur uchun ustun — tasdiqlangan qiymat to'liq chip (`bg-fill-2`), taklif punktir chegarali chip + "taklif" yozuvi. Qator bosilsa — qiymat tanlash popover'i (har tur uchun chiplar, bosish darhol `PUT`).
- **Ommaviy amallar** (tanlov bo'lganda pastki panel): «Taklifni tasdiqlash» — tanlangan qatorlarda tasdiqlanmagan har tur uchun taklifni yozadi (taklifsiz qatorlar o'tkazib yuboriladi, toast: "12 ta tasdiqlandi, 3 tasida taklif yo'q"); «Qiymat berish» — tur + qiymat(lar) tanlanadi, tanlangan qatorlarga yoziladi; «Tozalash» — tanlangan turdagi qiymatlarni olib tashlaydi.
- Sof yordamchilar `src/admin/lib/pc-parts.ts` (testli): filtr, ommaviy amaldan `PUT` elementlarini yig'ish, "belgilanmagan" hisob.

**Mahsulot tahriri** (`ProductEdit` → «Konfigurator» kartasi): soket va xotira select'lari o'rniga shu qismning tur chiplari (o'sha popover komponenti, darhol `PUT /api/admin/pc-parts`). "Konfiguratorda ko'rsatilmasin" va quvvat (W) qoladi. `pcSocket`/`pcMemory` mahsulot payload'idan, `ApiProductDetail`dan, `parseProductInput`dan, `product-form.ts`dan va `shared/mcp-tools.ts` `detailToInput`dan olib tashlanadi.

**Bosh sahifa:** `GET /api/admin/dashboard` ga `configuratorUntagged` (faol turlarga kiradigan bo'g'inlarda belgilanmagan qism guruhlari soni, `pc_hidden = 0`); karta matni sodda tilda — "Konfiguratorda N ta qism tasdiqlanmagan — ular saytda ko'rinmaydi", 0 bo'lsa "Konfiguratordagi hamma qismlar tasdiqlangan". Bosilsa → `/admin/products/configurator?f=untagged`.

**i18n:** admin matnlari `products` namespace'ida uz + ru (`Dict` tekshiruvi), sayt matni `locales.ts` uz + ru.

### 6. Ishga tushirish

Deploy'dan keyin CPU, plata va RAM hali tasdiqlanmagan → konfigurator bo'limi saytda **ko'rinmaydi** (bo'sh yoki yarim konfigurator ko'rsatilmaydi). Egasi Mahsulotlar → Konfigurator'da bo'g'inma-bo'g'in "Belgilanmagan" filtri → hammasini belgilash → takliflarni ko'zdan kechirish → «Taklifni tasdiqlash» (taxminan 10–15 daqiqa: 30 CPU, 31 plata, 24 RAM). Taklifsiz qatorlarga «Qiymat berish». Uchala bo'g'inda kamida bitta qism bo'lishi bilan konfigurator yana chiqadi. `docs/egasi-qollanmasi.md` ga shu bo'lim qo'shiladi.

## Testlar

- `shared/pc-compat.test.ts` — qayta yoziladi: `isTagged` (faol/nofaol tur, bo'g'in turga kirmaydi), `issueFor` (kesishma bo'sh → block, bir nechta qiymat, nofaol tur e'tiborsiz, LGA1700 + D4 plata + DDR5 RAM), `candidateState` (drops kaskadi), `suggestValues` (hozirgi parser keyslari qiymat id'lariga), `toConfigParts` (guruh birlashmasi, belgilanmagani chiqmaydi), `hasMatch`.
- `functions/lib/validate.test.ts` — `parsePcDimensionInput`, `parsePcPartsInput`.
- `src/admin/lib/pc-parts.test.ts` — ommaviy amal → `PUT` elementlari, filtr.
- `bun run lint`, `bun run test`; brauzerda: admin'da tasdiqlash → sayt konfiguratorida qism chiqadi va mos kelmaydigani bloklanadi.

## Tashqarida (hozir qilinmaydi)

- Seed'da form-faktor (plata ↔ korpus) turi yo'q — admin o'zi yaratishi mumkin (faol emas → belgilash → yoqish); unga nomdan taklif yo'q.
- Raqamli qoidalar (GPU uzunligi ↔ korpus, sovutgich balandligi) — guruh modeliga tushmaydi.
- MCP tool'lari orqali moslikni boshqarish.
- Billz'dan moslik maydonlarini olish (Billz'da bunday maydon yo'q).
