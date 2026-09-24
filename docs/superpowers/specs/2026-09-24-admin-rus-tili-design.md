# Admin panelga rus tili (i18next) — dizayn

**Sana:** 2026-09-24 · **Manba:** mijoz feedbacki (sayt qabul qilingan kun) — mijozning xodimlariga admin rus tilida kerak.
**Qaror:** i18next + react-i18next (egasining tanlovi). Ko'rib chiqilgan muqobillar: kalitli o'z lug'atimiz (`locales.ts` naqshi) va joyida juftlik `tr('uz', 'ru')` (tavsiya qilingan edi — kam kod, lekin tarjimalar ekranlarga sochiladi). Egasi sanoat standartini tanladi: tarjimalar alohida fayllarda turadi, ko'plik shakllari va matn ichidagi havolalar kutubxonada tayyor.

## Maqsad va chegaralar

**Maqsad:** admin paneldagi (`/admin/*`) hamma UI matni o'zbek va rus tilida; til har brauzerda alohida tanlanadi va eslab qolinadi.

**Doira:**
- `src/admin/**` — qobiq, menyu, bosh sahifa, kirish sahifasi, UI-kit, hamma ekranlar, toast va tasdiqlash oynalari, `src/admin/lib/*` dagi matn qaytaradigan yordamchilar;
- `src/lib/site-content.ts` — sayt matnlari registridagi odam o'qiydigan yozuvlar (maydon nomi, izoh, karta sarlavhasi) i18next'ga ko'chadi, registrda faqat tuzilma qoladi;
- `shared/err-text.ts` — faqat o'zbekcha xaritani eksport qilish (mantiq o'zgarmaydi).

**Doiradan tashqari (o'zgarmaydi):**
- bazadagi ma'lumot — mahsulot, kategoriya, tur nomlari (ular allaqachon uz/ru maydonlarda kiritiladi va ko'rsatiladi);
- Telegram bot xabarlari (`shared/order.ts`), egasi qo'llanmasi (`docs/egasi-qollanmasi.md`) — egasining qarori;
- MCP tool tavsiflari va MCP xato matnlari (`shared/err-text.ts` MCP uchun o'zbekcha qoladi), OAuth rozilik sahifasi;
- saytning o'zi (`src/locales.ts`), sahifa `<title>` («Admin — ProDuct» — tilga bog'liq emas).

## Foydalanuvchi tajribasi

- **Til tanlovi ikki joyda** (qorong'i mavzu almashtirgichi bilan bir joyda):
  - desktop sidebar pastida, «Qorong'i mavzu» qatoridan keyin — «Til» qatori: ixcham segment `UZ | RU` (sidebar qatori balandligiga mos, 28px);
  - Sozlamalar → Akkaunt → «Ko'rinish» kartasida — «Til» qatori: `Segmented` `O'zbekcha | Русский` (telefonda sidebar yo'q, tanlov shu yerda).
  - Tanlov darhol qo'llanadi (saqlash tugmasisiz), ikkala joy react-i18next orqali o'zi sinxron.
- **Saqlash:** `localStorage.adminLang` (`'uz' | 'ru'`), sukut — `uz`. Kirish sahifasi ham oxirgi tanlangan tilda. Brauzer tili avtomatik aniqlanmaydi: egasi admin'ni o'zbekcha ishlatib kelgan, brauzeri ruscha bo'lsa ham kutilmaganda til almashmasin.
- **`<html lang>`** — til almashganda `document.documentElement.lang` joriy tilga qo'yiladi (ekran o'quvchilar ruscha matnni ruscha o'qiydi).
- **Sonlar va birliklar:** ruscha ko'plik shakllari (1 товар · 2 товара · 5 товаров · 21 товар); summa qo'shimchasi `so'm` / `сум`; sana va vaqt raqamli — o'zgarmaydi (`formatDateTime`).
- **Yuklanish:** server admin'ni `uz`da chizadi; klientda saqlangan til birinchi effektda qo'llanadi. Avtorizatsiya tekshiruvi tugaguncha turadigan «Yuklanmoqda…» yozuvi bir lahza o'zbekcha ko'rinishi mumkin — haqiqiy ekran allaqachon tanlangan tilda chiziladi. Qabul qilinadi.
- **Ton:** ruscha UI — «вы» (kichik harf), tugmalar infinitivda («Сохранить»), gap boshidagina bosh harf (sentence case) — o'zbekchadagi kabi.

## Arxitektura

### Bog'liqliklar
- `i18next@^26.4`, `react-i18next@^17.0` — `dependencies`ga `bun add` bilan; **`package-lock.json` ham yangilanadi** (`npm install --package-lock-only`) — Dockerfile `npm ci` qiladi, `bun.lock` faqat lokal.
- `i18next-browser-languagedetector` **qo'shilmaydi** — til manbai bitta (`localStorage.adminLang`), bir necha qator o'zimizda.
- Kutubxona faqat admin'dan import qilinadi (`AdminApp` → `src/admin/i18n`), shuning uchun storefront chunk'lariga tushmaydi — build'dan keyin tekshiriladi.

### Fayllar
```
src/admin/i18n/
  index.ts        — i18next instansiyasi va init; `useAdminLang()`; `restoreAdminLang()`
  i18next.d.ts    — CustomTypeOptions (tipli kalitlar)
  dict.ts         — `Dict<T>`: o'zbekcha manbadan ruscha fayl uchun tuzilma tipi
  uz/  common.ts shell.ts products.ts orders.ts content.ts site.ts settings.ts errors.ts
  ru/  (xuddi shu 8 fayl)
```

**Namespace'lar (8):**

| ns | Nima |
|---|---|
| `common` | UI-kit va hamma joyda uchraydiganlar: Saqlash/Bekor qilish/O'chirish, «Yuklanmoqda…», «Orqaga», tasdiqlash oynasi standartlari, `Pagination`, `EmptyState`, qidiruv, `ImageUploader`, `MarkdownHelp`, `LangPair` («O'zbekcha»/«Ruscha»), `sum` qo'shimchasi, umumiy xato |
| `shell` | `nav.ts` bo'lim/tab nomlari va qisqa nomlari, sidebar pasti (Saytni ochish, Qorong'i mavzu, Til, Chiqish), `SectionTabs`, bosh sahifa (`Dashboard`), kirish sahifasi (`Login`) |
| `products` | Mahsulotlar ro'yxati va tahriri, `ReviewsEditor`, `ModelCombobox`, Turlar/Kategoriyalar/Brendlar/Modellar, `product-filter` va `product-form` matnlari |
| `orders` | Buyurtmalar, Ish arizalari, E'lonlar, `StatusControls`, `inbox` yordamchilari |
| `content` | Kontent → Bosh sahifa, Bannerlar, Yangiliklar, Blog, Sahifalar, Vakansiyalar (+ sahifa matni), `ContentFields`/`useSiteContent` umumiy matnlari |
| `site` | Sayt matnlari registri: `fields.<kalit>.label` / `.hint`, `sections.<id>` (`TEXT_FIELDS` va `ASSET_FIELDS` uchun) |
| `settings` | Do'kon, Aloqa, To'lov va kurs, Integratsiyalar (+ `billz-status`, MCP tokenlari), SEO, Akkaunt (+ «Ko'rinish» kartasi) |
| `errors` | Server xato kodlari → matn |

### Init
```ts
i18n.use(initReactI18next).init({
  resources: { uz: {...8 ns}, ru: {...8 ns} },   // ichki — tarmoq yuklashi yo'q
  lng: 'uz', fallbackLng: 'uz', supportedLngs: ['uz', 'ru'],
  ns: [...8], defaultNS: 'common',
  initAsync: false,                  // v26 sukuti `true` — SSR'da sinxron bo'lishi shart
  interpolation: { escapeValue: false }, // React o'zi escape qiladi
  returnNull: false,
});
```
Server singleton'ida til **hech qachon almashtirilmaydi** (`changeLanguage` faqat klient effektida) — so'rovlar orasida til sizib o'tmaydi.

### Til boshqaruvi
- `restoreAdminLang()` — `AdminApp`ning birinchi effekti: `localStorage.adminLang` `ru` bo'lsa `i18n.changeLanguage('ru')` va `html lang`.
- `useAdminLang()` → `{ lang, setLang }`: `setLang` — `changeLanguage` + `localStorage` (try/catch, private rejim) + `document.documentElement.lang`.
- Sidebar qatori va Akkaunt kartasi shu hook'dan foydalanadi; qayta chizishni react-i18next o'zi qiladi (`languageChanged`).

### Tip xavfsizligi (`bun run lint` — parity tekshiruvi)
- `i18next.d.ts`: `CustomTypeOptions { defaultNS: 'common'; resources: <uz resurslari tipi>; strictKeyChecks: true }` — mavjud bo'lmagan kalit, `defaultValue` bilan ham, lint'ni yiqitadi.
- **O'zbekcha — manba.** `uz/*.ts` `as const` bilan yoziladi (literal tiplar — kalit va interpolatsiya parametrlari tekshiruvi uchun). Har `ru/*.ts` `Dict<typeof uzX>` tipida: kalit tushib qolsa yoki ortiqcha bo'lsa lint yiqiladi (`src/locales.ts` bilan bir xil kafolat).
- **Dinamik kalitlar** (server xato kodi) tip bilan tekshirib bo'lmaydi — `i18n.exists(code, { ns: 'errors' })` bilan tekshirilib, keyin kalit tipiga keltiriladi; `any` ishlatilmaydi.
- **Ko'plik kalitlari ikkala tilda to'rt shaklda** — `_one`, `_few`, `_many`, `_other`; o'zbekchada hammasi bir xil matn (o'zbek tilida sondan keyin shakl o'zgarmaydi, `Intl.PluralRules('uz')` `few`/`many` ni tanlamaydi — ortiqcha shakl zararsiz). Shu qoida `Dict<T>` tuzilma tekshiruvini oddiy qoldiradi.
- Kalit nomlari: camelCase, ekran bo'yicha guruhlangan (`products:edit.images.title`, `orders:status.contacted`).

### Foydalanish qoidalari
- Komponentda: `const { t } = useTranslation('products')` (bir nechta ns: `useTranslation(['products', 'common'])`, boshqa ns kaliti — `t('common:save')`). Satr kalitlari (selector API emas) — bir xillik uchun.
- **Matn ichida havola/qalin bo'lak** — `<Trans t={t} i18nKey="…" components={{ link: <Link to="…" /> }} />`, resursda `<link>…</link>`. `t` doim uzatiladi — usiz `Trans` til almashganda qayta chizilmaydi.
- **Sof yordamchilar** (`billzStatusText`, `summaryText`, `statusSegments`, `product-form` validatsiyasi va boshqalar) **`t` ni parametr sifatida oladi** (`TFunction<'settings'>` va h.k.) — sof va testlanadigan bo'lib qoladi; testlarda `i18n.getFixedT('ru', 'settings')`.
- **`formatSum(n, sum)`** — qo'shimchani chaqiruvchi beradi (`t('common:sum')`), saytdagi `formatUzs(value, t.sum)` naqshi.
- **Statik ro'yxatlar** (`nav.ts` bo'limlari, holat nomlari, segment variantlari) — matn o'rniga **kalit** saqlaydi (`labelKey`), chizishda `t(...)`.
- **Xatolar:** `shared/err-text.ts`dagi o'zbekcha xarita `as const` bilan eksport qilinadi va `uz/errors.ts` shu xaritani qayta eksport qiladi — bitta manba, MCP ham shundan o'qiydi. `ru/errors.ts` — shu kalitlar bilan tipli. Admin'dagi `errText(e)` endi i18next orqali: kod `errors` da bo'lsa tarjima, bo'lmasa — kodning o'zi yoki umumiy «Xatolik yuz berdi» (bugungi xulq).
- **Sayt matnlari registri:** `TEXT_FIELDS`/`ASSET_FIELDS` dan `label`, `hint` va karta sarlavhasi matni olib tashlanadi; `section` — id (masalan `consult`), `ContentFields` yozuvlarni `site:fields.<key>.label` / `site:sections.<id>` dan oladi. Registr va resurslar bir-biriga mos kelishini **vitest** tekshiradi (har maydon uchun ikkala tilda nom bor).

## Atamalar lug'ati (uz → ru)

Hamma ekranda bir xil ishlatiladi; mijozning xodimlari o'zgartirishni so'rasa — shu yerda va resurslarda birga tuzatiladi.

| O'zbekcha | Ruscha |
|---|---|
| Mahsulot / tovar, Mahsulotlar | Товар, Товары |
| Buyurtma, Buyurtmalar | Заказ, Заказы |
| Konsultatsiya | Консультация |
| Ish arizalari | Отклики |
| E'lon | Объявление |
| Kontent | Контент |
| Sozlamalar | Настройки |
| Bosh sahifa | Главная |
| Yo'nalish (kategoriya) | Направление |
| Kategoriyalar (admin bo'limi) | Категории |
| Tur (tovar turi) | Тип |
| Brend | Бренд |
| Model | Модель |
| Variant | Вариант |
| Xotira · Rang | Память · Цвет |
| Holat (tovar): Yangi / Ishlatilgan | Состояние: Новый / Б/у |
| Holat (buyurtma): Yangi / Bog'lanildi / Bajarildi | Статус: Новый / Связались / Выполнен |
| Narx · Naqd narx · Eski narx | Цена · Цена за наличные · Старая цена |
| Chegirma | Скидка |
| Muddatli to'lov | Рассрочка |
| Boshlang'ich to'lov | Первоначальный взнос |
| Muddat · Ustama · Oylik to'lov | Срок · Наценка · Ежемесячный платёж |
| Dollar kursi | Курс доллара |
| Qoldiq | Остаток |
| Saytda ko'rsatish · Saytda bor / yo'q | Показывать на сайте · На сайте / Скрыт |
| Rasm kerak | Нужно фото |
| Asosiy rasm · Galereya | Главное фото · Галерея |
| Xususiyatlar · Tavsif | Характеристики · Описание |
| Sharh · Reyting | Отзыв · Рейтинг |
| Banner · Yangilik · Blog · Sahifa · Vakansiya | Баннер · Новость · Блог · Страница · Вакансия |
| Integratsiyalar · Akkaunt | Интеграции · Аккаунт |
| Ko'rinish · Qorong'i mavzu · Til | Оформление · Тёмная тема · Язык |
| Qo'lda tahrirlash (Billz qulfi) | Редактировать вручную |
| Pre-order | Предзаказ |
| Konfigurator | Конфигуратор |
| Xavfli zona | Опасная зона |
| Saqlash · Bekor qilish · O'chirish | Сохранить · Отмена · Удалить |
| Tahrirlash · Qo'shish · Yangilash · Sinxronlash | Редактировать · Добавить · Обновить · Синхронизировать |
| Qidirish · Hammasi · Orqaga | Поиск · Все · Назад |
| Saytni ochish · Chiqish | Открыть сайт · Выйти |
| Yuklanmoqda… | Загрузка… |
| so'm | сум |

## Sinov

- **Lint:** kalitlar mavjudligi (`strictKeyChecks`) va uz/ru tuzilma tengligi (`Dict<T>`).
- **Vitest:**
  - `t` oladigan hamma yordamchi — ikkala tilda;
  - ruscha ko'plik: 1 / 2 / 5 / 11 / 21 / 22;
  - registr qamrovi: har `TEXT_FIELDS`/`ASSET_FIELDS` maydoni va har `section` id uchun ikkala tilda yozuv bor;
  - `errText`: ma'lum kod → tarjima, noma'lum kod → kodning o'zi, bo'sh → umumiy xato.
- **Brauzer** (ikkala tilda, desktop va 375px):
  - hamma ekran ochiladi, o'zbekcha qoldiq yo'q;
  - ruscha nomlar 240px sidebar'ga, tugma va segmentlarga sig'adi (qator buzilmaydi);
  - til qayta yuklashdan keyin saqlanadi, kirish sahifasi tanlangan tilda;
  - qorong'i mavzu + rus tili birga.
- **Yakuniy qidiruv:** `src/admin` da (`i18n/` dan tashqari) qolgan o'zbekcha literallarni topuvchi bir martalik skript — natija bo'sh bo'lishi kerak (kod izohlari hisobga olinmaydi).
- **Bundle:** build'dan keyin storefront chunk'larida `i18next` yo'qligi tekshiriladi.

## Bajarish tartibi (reja uchun)

1. **Infratuzilma:** bog'liqliklar (+ `package-lock.json`), `src/admin/i18n` (init, tiplar, `Dict`, `useAdminLang`/`restoreAdminLang`), til tanlovi UI (sidebar + Akkaunt), `html lang`, `formatSum(n, sum)`; lint'ni tasdiqlaydigan kichik ishlatish.
2. **Qobiq:** `common` + `shell` — UI-kit, `nav.ts` kalitlarga, `AdminShell`, `SectionTabs`, `Dashboard`, `Login`, tasdiqlash/toast.
3. **`products`** ekranlari va yordamchilari (+ testlar).
4. **`orders`** ekranlari va `inbox` (+ testlar).
5. **`content`** + **`site`** — registr tuzilmaga o'tadi, `ContentFields`, qamrov testi.
6. **`settings`** (+ `billz-status` testlari, MCP tokenlari).
7. **`errors`** — `shared/err-text.ts` eksporti, ruscha xarita, admin `errText`.
8. **Yakun:** qoldiq literallar skripti, ikkala tilda brauzer ko'rigi, CLAUDE.md («Admin UI is Uzbek-only» o'rniga i18n qoidalari: namespace'lar, yangi matn qo'shish tartibi, ko'plik va `Trans` qoidasi).

## Xavflar

- **`@types/react` yo'q.** react-i18next tiplari React tiplariga tayanadi; `skipLibCheck: true` va `noImplicitAny: false` bilan kutubxona tiplari tekshirilmaydi, `t` tipi esa i18next'dan keladi. 1-bosqichdagi kichik ishlatish buni lint bilan tasdiqlaydi — ishlamasa, reja to'xtab, yechim alohida kelishiladi.
- **Hajm:** taxminan 1 400 satr matn. Parallel implementer'lar to'qnashmasligi uchun har bosqich faqat o'z namespace fayllariga yozadi, `common`/`shell` — 1–2-bosqichda.
- **Ruscha matn uzunroq** — layout brauzer ko'rigida tekshiriladi; kerak bo'lsa ruscha qisqaroq sinonim tanlanadi (dizayn o'zgarmaydi).
- **Bundle:** admin chunk'i taxminan 15–20 KB gz (kutubxona) va 25 KB gz (resurslar) ga oshadi — admin uchun qabul qilinadi.
