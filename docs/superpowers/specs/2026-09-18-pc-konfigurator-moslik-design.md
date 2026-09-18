# PC konfigurator: moslik tekshiruvi va buyurtma asosidagi qismlar

**Sana:** 2026-09-18 · **Holat:** tasdiqlangan (egasi, chatda)

## Muammo

`/category/pc` oxiridagi `PcConfigurator` (`src/store/PcConfigurator.tsx`) hozir:

1. **Moslikni tekshirmaydi.** Mijoz Intel Core Ultra 7 265F (LGA1851) bilan B760 platani (LGA1700) yoki DDR4 plata bilan DDR5 xotirani tanlay oladi. Mijoz buni bilmaydi.
2. **Faqat saytda ko'rinadigan tovarlarni ko'rsatadi** (`is_active = 1`, ya'ni qoldiq > 0 va rasm bor). Do'kon esa omborda yo'q qismni ham keltirib bera oladi. Sinov bazasida PC qismlari: faol — 5 CPU / 4 plata / 1 RAM / 3 GPU / 0 SSD; qoldig'i 0 (yashirin) — 19 / 23 / 20 / 22 / 19; qoldiq bor, rasmsiz (yashirin) — 6 / 4 / 3 / 2 / 27.
3. **Blok (PSU) va korpus bo'g'ini yo'q**, SSD bo'g'inida esa faol tovar 0 ta.

Billz'da moslik uchun maydon yo'q: CPU/plata xususiyatlari bo'sh, faqat `Xotira`/`Rang`/`Chip` keladi. Lekin **nomda bor**: `Intel Core i5 13600KF`, `ASUS Z890 AYW Gaming WiFi`, `MaxSun Challenger B760M-F DDR4`, `DDR5 Corsair Vengeance 16GB 6000Mhz`, `SAMA K650W 80Plus Bronze`.

## Qarorlar (egasi bilan kelishilgan)

1. Mos kelmaydigan qism **yashirilmaydi — kulrang, sababi yozilgan** ("LGA1851 soket kerak").
2. **Blok va Korpus bo'g'inlari qo'shiladi.**
3. **Blok quvvati tekshiriladi** (ogohlantirish, bloklamaydi).
4. Konfigurator **hamma Billz PC qismlarini** ko'rsatadi: qoldiq bor — "Omborda", qoldiq 0 — "Buyurtma asosida" (narx Billz'dagi oxirgi narx, "taxminiy" yozuvi bilan). Billz'da umuman yo'q model uchun — "Kerakli model ro'yxatda yo'qmi? Operator topib beradi" havolasi (landing konsultatsiya formasi).
5. Eskirgan modellarni egasi o'chira olishi uchun admin'da **"Konfiguratorda ko'rsatilmasin"** tugmasi.

## Dizayn

### 1. Qism atributlari — nomdan, admin tuzatishi ustun (`shared/pc-compat.ts`, sof, testli)

`partAttrs(kind, name, override) → { socket, memory, watts }` — har biri `null` bo'lishi mumkin (aniqlanmadi).

**Admin tuzatishi ustun:** `products.pc_socket` / `pc_memory` / `pc_watts` (migratsiya `0037`) to'ldirilgan bo'lsa — nomdan olingan qiymat o'rniga shu. `product_specs` ishlatilmaydi: Billz sinxronizatsiyasi xususiyatlarni har run'da butunlay qayta yozadi (`specsStatements` — `DELETE` + `INSERT`), admin'da esa Billz tovarining xususiyatlari faqat o'qiladi. Yangi ustunlarga sinxronizatsiya tegmaydi (`slug`, `condition` kabi — egasiniki), shuning uchun tuzatish Billz tovarida ham saqlanib qoladi.

**CPU soketi** (nom kichik harfda):

| Naqsh | Soket |
|---|---|
| `core ultra [3579] 2xx` | LGA1851 |
| `i[3579] 12xxx/13xxx/14xxx` | LGA1700 |
| `i[3579] 10xxx/11xxx` | LGA1200 |
| `ryzen [3579] 7xxx/8xxx/9xxx` | AM5 |
| `ryzen [3579] 3xxx/4xxx/5xxx` | AM4 |

CPU xotirasi soketdan: LGA1851/AM5 → DDR5, AM4/LGA1200 → DDR4, LGA1700 → `null` (ikkalasi).

**Plata soketi** — chipset tokeni (`[abhxz]\d{3}`):

| Chipset | Soket |
|---|---|
| H610 B660 H670 Z690 B760 H770 Z790 | LGA1700 |
| H810 B860 Z890 | LGA1851 |
| A620 B650 X670 B850 X870 | AM5 |
| A320 B350 X370 B450 X470 A520 B550 X570 | AM4 |
| H410 B460 H470 Z490 H510 B560 H570 Z590 | LGA1200 |

**Plata xotirasi:** nomda `DDR4`/`D4` → DDR4, `DDR5`/`D5` → DDR5; aks holda soketdan (AM5/LGA1851 → DDR5; AM4/LGA1200 → DDR4; LGA1700 → DDR5 — ishlab chiqaruvchilar DDR4 versiyani nomda `D4`/`DDR4` bilan belgilaydi).

**RAM:** nomda `DDR4`/`DDR5`; bo'lmasa chastota: ≥ 4800 MHz → DDR5, 2133–3600 MHz → DDR4.

**Blok quvvati:** `NNN(N)W`; bo'lmasa nomdagi birinchi 300–2000 oralig'idagi son (`SAMA G850` → 850).

**CPU/GPU iste'moli** (blok tekshiruvi uchun, taxminiy o'yin yuki, W):
- CPU: i9 / Ultra 9 → 250; i7 / Ultra 7 → 200; i5 `K` → 180; i5 / Ultra 5 → 125; i3 → 90; Ryzen 9 → 200; Ryzen 7 → 150; Ryzen 5 → 110.
- GPU jadvali: RTX 5090 575 · 5080 360 · 5070 Ti 300 · 5070 250 · 5060 Ti 180 · 5060 145 · 5050 130 · 4090 450 · 4080 320 · 4070 Ti 285 · 4070 200 · 4060 Ti 165 · 4060 115 · 3090 350 · 3080 320 · 3070 Ti 290 · 3070 220 · 3060 Ti 200 · 3060 170 · 3050 130 · 2080 215 · 2070 175 · 2060 160 · RX 9070 XT 304 · 9070 220 · 7900 XTX 355 · 7900 XT 315 · 7800 XT 263 · 7700 XT 245 · 7600 165 · Arc B580 190 · A770 225. `Super` → `Ti` qiymati. Topilmasa `null`.

### 2. Moslik qoidalari (`shared/pc-compat.ts`)

`issueFor(slot, candidate, picked) → Issue | null` — nomzodni **boshqa tanlangan** qismlarga qarab baholaydi:

| Qoida | Qachon | Turi | Sabab matni |
|---|---|---|---|
| Soket | CPU ↔ plata, ikkalasining soketi ma'lum va teng emas | `block` | "{soket} soket kerak" |
| Xotira | plata (yoki plata yo'q bo'lsa CPU) ↔ RAM, ikkalasi ma'lum va teng emas | `block` | "{DDR} xotira kerak" |
| Quvvat | blok ↔ (CPU + GPU); blok va kamida bittasi ma'lum | `warn` | "Kamida {N} W tavsiya etiladi" |

Tavsiya etilgan quvvat: `ceil((cpuW + gpuW + 100) × 1.2 / 50) × 50` (noma'lum qism 0 hisoblanadi, lekin ikkalasi noma'lum bo'lsa tekshiruv yo'q).

`summaryIssues(picked)` — yig'ma paneli uchun barcha muammolar. `needsVerify(slot, attrs)` — qismning tegishli atributi `null` (CPU/plata: soket; RAM: xotira; blok: quvvat) → "Moslikni operator tasdiqlaydi".

`hasMatch(cpu, boards)` — CPU uchun ro'yxatda mos plata bormi; yo'q bo'lsa CPU qatorida "Mos plata ro'yxatda yo'q" (bloklamaydi).

### 3. Ma'lumot (`app/lib/loaders.ts` → `loadConfiguratorParts(env)`)

Bitta so'rov: `category_id = 'pc'`, `type IN (bo'g'in turlari)`, `pc_hidden = 0`, `cash_price_uzs > 0`, `(is_active = 1 OR billz_id IS NOT NULL)` (qo'lda kiritilgan nofaol namuna mahsulotlar chiqmaydi); `pc_socket`/`pc_memory`/`pc_watts` shu qatorda keladi. Sof `toConfigParts(rows)`:
- `inStock = billz_stock > 0 || (billz_id IS NULL && is_active = 1)`;
- **nom bo'yicha dublikatlar olib tashlanadi** (`nameKey` — `shared/billz.ts`): sinxronizatsiya eski dublikatlarni `is_active = 0, billz_stock = 0` qilib qoldiradi; saqlanadigani — omborda bori, keyin faoli;
- tartib: omborda bori oldin, keyin narx o'sishi bo'yicha.

Natija bo'g'in kaliti bo'yicha guruhlanadi. Xato → `{}` (konfigurator chiqmaydi).

### 4. Bo'g'inlar

`cpu` · `mb` (motherboard) · `ram` · `gpu` · `psu` · `ssd` (xotira) · `case` (korpus). Tovari yo'q bo'g'in ko'rinmaydi. **Buyurtma uchun majburiy:** CPU, plata, RAM — va `block` muammo yo'q. GPU (integrallashgan grafika), SSD, blok, korpus ixtiyoriy.

### 5. UI (`src/store/PcConfigurator.tsx`)

- Qator: rasm (bo'lmasa bo'g'in ikonkasi), nom, holat ("Omborda" `text-verified` / "Buyurtma asosida" `text-muted-2`), narx (+ "taxminiy" buyurtma asosidagida), tanlov belgisi.
- `block` nomzod: `opacity-50`, bosilmaydi (`disabled`), nom ostida sabab. `warn`: bosiladi, sabab to'q sariq (`text-new`). Noma'lum atribut: "Moslikni operator tasdiqlaydi" `text-muted-2`.
- Ro'yxat uzun bo'lishi mumkin (korpus ~90) — `max-h` + ichki scroll.
- Tanlov o'zgarganda boshqa bo'g'indagi endi `block` bo'lib qolgan tanlov o'chadi, bir qatorli xabar: "Mos kelmagani uchun olib tashlandi: Plata".
- Yig'ma: "✓ Hammasi mos" yoki ogohlantirishlar; buyurtma asosidagi qism bo'lsa "Buyurtma asosidagi qismlarning narxi va muddatini operator tasdiqlaydi".
- Har bo'g'in ro'yxati ostida: "Kerakli model ro'yxatda yo'qmi? Operator topib beradi ›" → `/#konsultatsiya` (locale bilan).
- Savatga: buyurtma asosidagi qism `variantLabel = t.cfgOnOrder` bilan — savat qatorida va Telegram xabarida (`shared/order.ts` `(variantLabel)`) ko'rinadi. Savat qatorida havola yo'q (tekshirildi: `CartPage` nomni havolasiz chizadi), rasm bo'sh bo'lsa bo'sh ramka.

### 6. Admin

- Migratsiya `0037`: `products.pc_hidden INTEGER NOT NULL DEFAULT 0`, `pc_socket TEXT`, `pc_memory TEXT`, `pc_watts INTEGER` (NULL — avtomatik). Billz sinxronizatsiyasi bu ustunlarga tegmaydi.
- `ProductEdit` → yangi **"Konfigurator"** kartasi (faqat `category === 'pc'` va turi bo'g'in turlaridan biri bo'lsa; Billz tovarida ham tahrirlanadi): `SwitchRow` "Konfiguratorda ko'rsatilmasin"; turga qarab maydonlar — CPU: soket + quvvat, plata: soket + xotira turi, RAM: xotira turi, GPU va blok: quvvat. Select'larda birinchi variant "Avtomatik (LGA1700)" — nomdan aniqlangan qiymat qavsda yoki "Avtomatik (aniqlanmadi)". Quvvat — son maydoni, placeholder'da aniqlangan qiymat.
- API/validator/forma — `preorder` naqshida: `pcHidden: boolean`, `pcSocket: PcSocket | null` (`LGA1700 | LGA1851 | LGA1200 | AM5 | AM4`), `pcMemory: 'DDR4' | 'DDR5' | null`, `pcWatts: number | null` (1–3000).

## Tashqarida (hozir qilinmaydi)

Korpus ↔ plata o'lchami (ATX/mATX/ITX), sovutgich soketi, GPU uzunligi — ma'lumot nomda ishonchli emas. Admin ro'yxatida "Moslik aniqlanmadi" filtri (tahrirdagi "Avtomatik (aniqlanmadi)" yetadi). Billz'da yo'q modellar uchun qo'lda katalog.
