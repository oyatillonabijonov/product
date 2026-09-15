# Vakansiyalar — admin'dan boshqariladigan ish o'rinlari va ariza formasi (dizayn, 2026-09-15)

Do'kon egasi footerga "Vakansiyalar" havolasini va **apple.com/careers/us** uslubidagi sahifani so'radi.
Ochiq ish o'rinlari admin panelda yuritiladi, nomzod saytdagi forma orqali ariza topshiradi.

## 1. Qarorlar (egasi bilan)

1. **Vakansiyalar admin'dan** — alohida jadval va CRUD; dasturchisiz ochiladi/yopiladi.
2. **Ariza — saytdagi forma**: ism, telefon, xabar, rezyume havolasi. Ariza Telegram botga ketadi **va** bazaga yoziladi (konsultatsiya naqshi).
3. **Arizalar alohida jadvalda** (`job_applications`), `orders`da emas: nomzodlarning shaxsiy ma'lumoti sotuv arizalariga aralashmaydi, HR ishi admin → Vakansiyalar ichida.
4. **Rasmlar** egasidan: `work.png` (servis ustaxonasi fotosi), `life.png` (yashil gradient banner — egasi o'z uslubida qildi, "Biz haqimizda" hero'si oilasidan).
5. **Xodim iqtiboslari o'ylab topilmaydi.** Apple kartalarida haqiqiy xodimlar gapiradi; bizda kartada kompaniya nomidan gap turadi. Haqiqiy iqtiboslar (roziligi bilan) kelsa qo'shiladi.
6. **Imtiyozlar faqat egasi aytganidan.** Ro'yxat kelguncha "Bizda ish qanday" bo'limida ish mazmuni haqida faktlar turadi (maosh/imtiyoz va'dasi yo'q).

## 2. Maqsad emas (YAGNI)

- Rezyume **fayl** yuklash — yo'q, faqat `https://` havola (Telegram, Google Drive, hh.uz).
- Har vakansiyaga alohida sahifa va `JobPosting` JSON-LD (Google Jobs) — yo'q; bitta sahifa, qatorlar ochiladi.
- Vakansiyalar bo'yicha qidiruv/filtr — yo'q (ular kam).
- Alohida HR Telegram chati — yo'q; `telegram_order_chat_id` ishlatiladi.
- Nomzodga avtomatik javob, arizalarni avtomatik o'chirish — yo'q.

## 3. Ma'lumotlar — migratsiya `0034_vacancies.sql`

```sql
CREATE TABLE vacancies (
  id             TEXT PRIMARY KEY,
  title          TEXT NOT NULL,
  title_ru       TEXT NOT NULL DEFAULT '',
  department     TEXT NOT NULL DEFAULT '',     -- "Sotuv", "Servis"
  department_ru  TEXT NOT NULL DEFAULT '',
  employment     TEXT NOT NULL DEFAULT 'full', -- 'full' | 'part' | 'intern'
  salary         TEXT NOT NULL DEFAULT '',     -- erkin matn, bo'sh = ko'rsatilmaydi
  salary_ru      TEXT NOT NULL DEFAULT '',
  description    TEXT NOT NULL DEFAULT '',     -- markdown (vazifalar/talablar ro'yxati)
  description_ru TEXT NOT NULL DEFAULT '',
  sort_order     INTEGER NOT NULL DEFAULT 0,
  is_active      INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE job_applications (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at    INTEGER NOT NULL DEFAULT (unixepoch()),
  vacancy_id    TEXT,                          -- NULL = umumiy ariza
  position      TEXT NOT NULL,                 -- ariza paytidagi lavozim nomi (vakansiya o'chsa ham qoladi)
  name          TEXT NOT NULL,
  phone         TEXT NOT NULL,
  message       TEXT NOT NULL DEFAULT '',
  resume_url    TEXT NOT NULL DEFAULT '',
  status        TEXT NOT NULL DEFAULT 'new',   -- 'new' | 'contacted' | 'done' (OrderStatus bilan bir xil)
  telegram_sent INTEGER NOT NULL DEFAULT 0
);
```

`shared/types.ts`: `EmploymentType`, `ApiVacancy` (uz/ru juftliklari `ApiNews` naqshida), `ApiJobApplication`.
`functions/lib/db.ts`: `VacancyRow`/`rowToVacancy`, `JobApplicationRow`/`rowToJobApplication`.
`app/lib/loaders.ts`: `loadVacancies(env)` — faollari `sort_order` bo'yicha; xato bo'lsa `[]` (sahifa umumiy ariza bilan ochilaveradi).

## 4. API

**Ommaviy yozish — `POST /api/job-apply`** (`api.consult.tsx` naqshi): `allowLead` (10 ta / 10 daqiqa / IP) → 32 KB chegarasi → honeypot `company` → `parseJobApplicationInput`:
- `name` majburiy (≤120), `phone` 7–15 raqam, `message` ≤1000, `resumeUrl` bo'sh yoki `https://` (≤500), `vacancyId` ixtiyoriy.
- **Lavozim nomi mijozdan olinmaydi**: server `vacancyId` bo'yicha faol vakansiyani topib `title`ni yozadi; topilmasa yoki berilmasa — "Umumiy ariza". Bot va admin'ga ixtiyoriy matn kirmaydi.
- Telegram: `composeJobApplicationMessage(input, position, brand)` (`shared/order.ts`) — Telegram xato bersa ham ariza saqlanadi (`telegram_sent=0`).

**Admin** (`requireAdmin` + `parseBody`):
- `api/admin/vacancies` — GET (hammasi), POST; `api/admin/vacancies/:id` — PUT, DELETE. `parseVacancyInput`: `title` majburiy, `employment` enum (`employment_invalid`), matnlar uzunligi cheklangan.
- `api/admin/job-applications` — GET (yangisi birinchi, 200 ta); `api/admin/job-applications/:id` — PATCH `{status}`.

## 5. Admin UI

NAV'da **"Vakansiyalar"** (lucide `Briefcase`), ichida ikki tab:
- **Vakansiyalar** — `VacancyList` / `VacancyForm` (`NewsList`/`NewsForm` naqshi): lavozim, bo'lim, maosh — uz/ru juftliklari; bandlik turi select; tavsif — markdown textarea (uz/ru); tartib; faol.
- **Arizalar** — `JobApplicationsList`: sana, ism, telefon (`tel:`), lavozim, xabar, rezyume havolasi (`safeHref`), holat select (Yangi / Bog'lanildi / Yopildi).

`errText.ts`ga yangi kodlar: `employment_invalid`, `resume_invalid`.

## 6. Sahifa `/vakansiyalar` (+ `:lang/vakansiyalar`)

Indekslanadi, sitemap'ga qo'shiladi; meta title/description `locales.ts`dan. Tartib apple.com/careers/us bo'yicha:

1. **Hero** — `shell-box rounded-xl bg-black` (kategoriya cover'i kabi, ikkala mavzuda qora): markazda `text-display` **"Bizga qo'shiling. O'zingiz bo'ling."** va oq pill tugma "Vakansiyalarni ko'rish" → `#vakansiyalar` (Apple'dagi "Watch the film" o'rnida).
2. **Kirish** — markazda katta shriftli bitta xatboshi.
3. **"ProDuct'da ishlash"** — eyebrow + qalin sarlavha + matn + "Vakansiyalarni ko'rish ›" havolasi; yonida `work.webp` fotoli karta, ustida kompaniya gapi (matn chap-yuqori qorong'i qismda).
4. **"Jamoadagi hayot"** — eyebrow + sarlavha + matn; `life.webp` gradient kartasi, matn gradient ustida; qorong'i mavzuda `dark-invert`.
5. **"Bizda ish qanday"** — 4 ikonkali karta (ilg'or texnika bilan ishlash, mijozga yechim topish, texnikani ichidan bilish, to'rt yo'nalish) — imtiyozlar egasi bergandan keyin almashtiriladi.
6. **`#vakansiyalar` "O'zingizga yoqqan ishni toping."** — har vakansiya `<details>` qatori: nom, bo'lim · bandlik · maosh; ochilganda tavsif (`MdBlockView`) va **"Ariza topshirish"** tugmasi → `JobApplyForm` (vakansiya bilan). Vakansiya bo'lmasa: "Hozir ochiq vakansiya yo'q" + "Umumiy ariza qoldirish".

**`JobApplyForm`** (`Modal` bilan): ism, telefon (`formatUzPhone`/`isCompleteUzPhone`), xabar, rezyume havolasi, honeypot; qatorda xatolar (jim ishlamaslik yo'q); muvaffaqiyat ekrani; `ymGoal('job_apply')`.

**Footer** — "Kompaniya" ustuni doim chiqadi, bazadagi sahifalardan keyin `/vakansiyalar` havolasi (`t.footerCareers`).

## 7. Rasmlar

`public/work/work.png` → `public/careers/work.webp` (q80), `public/work/life.png` → `public/careers/life.webp` (q90, gradient'da chiziq qolmasin); manba PNG'lar Trash'ga (`public/`da qolsa build va Docker image'ga tushadi).

## 8. Tekshiruv

- `functions/lib/validate.test.ts`: `parseVacancyInput` (majburiy nom, `employment` enum, sukut qiymatlar), `parseJobApplicationInput` (telefon, faqat `https` rezyume, xabar chegarasi, `vacancyId` ixtiyoriy).
- `bun run lint`, `bun run test`.
- Brauzer: sahifa yorug'/qorong'i va mobil; ariza oqimi (lokalda Telegram sozlanmagan — jadvalga yozilishi va admin'da ko'rinishi); admin'da vakansiya yaratish/tahrirlash/o'chirish va holat o'zgarishi.

## 9. Egasidan kutiladi

- Xodimlarga beriladigan haqiqiy imtiyozlar ro'yxati (5-bo'lim uchun).
- Maxfiylik siyosatiga nomzod ma'lumotlari haqida bo'lim (admin → Sahifalar).
