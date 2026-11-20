# Dizayn tizimini topshirish bo'yicha so'rov

Salom! ERP platformamizning dizayn tizimini boshqa loyihaga — internet-do'konning admin paneliga — to'liq ko'chirmoqchimiz. Admin panelni boshqa dasturchi (AI agent) qayta quradi. Uning qo'lida sizning hujjatingizdan boshqa narsa bo'lmaydi: ERP'ni ko'rmaydi, Figma'ga kira olmaydi. Shuning uchun hujjat **o'zi yetarli** bo'lsin: har bir qiymat raqam bilan yozilsin, "Figma'ga qarang" kabi havolalar bo'lmasin.

## Admin panel haqida (moslashtirish uchun)

- **Foydalanuvchi** — do'kon egasi va xodimlari. Texnik odamlar emas. Mijozning shikoyati: "kontentni o'zim boshqara olmayapman". Asosiy maqsad — tushunarli UX, chiroyli ko'rinish ikkinchi o'rinda.
- **Til:** o'zbekcha va ruscha (ruscha matn ~30% uzunroq — komponentlar shunga chidashi kerak).
- **Qurilma:** asosan desktop, lekin telefondan ham ishlatiladi (buyurtmani ko'rish, holatini o'zgartirish).
- **Mavzu:** yorug' va qorong'i rejim, ikkalasi ham kerak.
- **Bo'limlar:** Bosh sahifa (statistika) · Mahsulotlar (ro'yxat ~1600 ta, tahrirlash formasi: rasmlar, narx, variantlar, xususiyatlar) · Buyurtmalar va arizalar (kiruvchi quti, holat almashtirish) · Mijozlar · Kontent (bannerlar, yangiliklar, blog, sahifalar, vakansiyalar — matn + rasm + jonli ko'rinish) · Sozlamalar (do'kon, aloqa, to'lov, integratsiyalar, SEO, akkaunt).
- **Texnologiya:** React 19, Tailwind CSS v4 (tokenlar `@theme` ichida CSS o'zgaruvchilari sifatida), ikonkalar `lucide-react`, animatsiya `motion`. Komponentlarni o'zimiz yozamiz.

## Nima kerak

### 1. Tokenlar — alohida fayl, aniq qiymatlar bilan
Bitta CSS fayl: `:root` (yorug') va `[data-theme="dark"]` (qorong'i) ichida CSS o'zgaruvchilari. Nomlari semantik bo'lsin (`--color-bg`, `--color-surface`, `--color-text-muted`, `--color-primary`...), `--blue-500` kabi xom nomlar emas. Bunday nomlar bo'lsa ham, semantik qatlam baribir kerak.

- **Ranglar:** fon, yuza (karta, sidebar, modal), yuqori qatlam yuzalari, matn pog'onalari (asosiy, ikkinchi darajali, o'chirilgan), chegaralar, asosiy (brend) rang va uning hover/active/soft holatlari, holat ranglari: success / warning / danger / info — har biri uchun matn, fon (soft) va chegara varianti. Har biri yorug' va qorong'i rejimda. Matn ranglari uchun kontrast nisbatini yozing (WCAG).
- **Tipografiya:** shrift nomi, qayerdan olinadi (Google Fonts havolasi yoki woff2 fayllar), litsenziyasi, ishlatiladigan og'irliklar. Har pog'ona uchun: o'lcham / qator balandligi / harf oralig'i / og'irlik va nomi (masalan `heading-lg`, `body`, `caption`). Raqamlar (narx, jadval) uchun qoida — `tabular-nums` yoki alohida shrift.
- **Bo'shliq** shkalasi, **radius** shkalasi (qaysi komponentda qaysi biri), **soya/elevation** (qaysi qatlamda qaysi biri), chegara qalinligi, **z-index** qatlamlari.
- **Harakat:** davomiylik va easing qiymatlari, qaysi holatda qaysi biri ishlatiladi.
- **Breakpoint**lar va zichlik (jadval qatori, input va tugma balandligi).

### 2. Ikonkalar
To'plam nomi va npm paketi. Agar Lucide bo'lsa — zo'r, bizda bor. Chiziq qalinligi, o'lchamlar (16/20/24...), qaysi o'lcham qayerda ishlatiladi. Agar o'zingizning ikonkalaringiz bo'lsa — SVG fayllar.

### 3. Komponentlar
Har biri uchun: tuzilishi (qaysi qismlardan iborat), o'lchamlari (px), variantlari, holatlari (default, hover, active, focus, disabled, loading, error), qaysi token ishlatiladi va **qachon ishlatiladi / qachon ishlatilmaydi**.

- Tugma: primary, secondary, ghost, danger, faqat ikonkali; o'lchamlar
- Input, Textarea, Select, qidiruvli Select (combobox), qidiruv maydoni, narx inputi (minglik ajratgich bilan)
- Checkbox, Radio, Switch, Segmented control
- Tabs, Breadcrumbs, Pagination
- Badge / holat chip'i (buyurtma holatlari: yangi, bog'lanildi, bajarildi), Tag, Avatar, Tooltip
- Dropdown menyu, Modal, Drawer (yon panel), Toast, tasdiqlash oynasi (xavfli amal uchun)
- **Jadval** — eng muhimi: sarlavha, qator, hover, tanlangan qator, saralash, ommaviy amallar (bulk actions), bo'sh holat, yuklanish holati, telefonda karta ko'rinishiga o'tishi
- Karta, statistika (KPI) kartasi
- Sahifa sarlavhasi (nom + tavsif + amal tugmalari + breadcrumbs)
- **Sidebar navigatsiya:** guruhlar, faol band, sanoq belgilari (badge), yig'ilgan holat; telefonda pastki navigatsiya
- **Forma:** label, yordamchi izoh, xato matni, majburiy maydon belgisi, bo'limlarga ajratish, pastda/tepada qotib turadigan "Saqlash" paneli
- Rasm yuklagich: drag & drop, yuklanish jarayoni, tartibini sudrab o'zgartirish
- Bo'sh holat (empty state), Skeleton, filtrlar paneli, Stepper (qadamlar)
- Ikki tilli maydon (bitta maydonning uz/ru versiyalari)

### 4. Sahifa shablonlari
Har biri uchun sxema/skrinshot va o'lchamlar (kenglik, grid, bo'shliqlar):
- Ilova qobig'i (sidebar + header + kontent)
- Ro'yxat sahifasi (filtrlar + jadval)
- Tahrirlash sahifasi (forma, iloji bo'lsa yonida jonli ko'rinish)
- Sozlamalar sahifasi
- Dashboard

### 5. UX qoidalari
ERP'da qabul qilingan qoidalar:
- Saqlash: avtomatik saqlashmi yoki tugma bilanmi? Saqlanmagan o'zgarish bo'lsa nima bo'ladi?
- Xavfli amallar (o'chirish) va tasdiqlash
- Xato va muvaffaqiyat xabarlari: qayerda, qancha turadi
- Bo'sh va yuklanish holatlari
- Matn ohangi: tugma va xabarlar qanday yoziladi
- Klaviatura yorliqlari, ommaviy amallar

### 6. Vizual namunalar
Asosiy ekranlar va komponentlarning skrinshotlari (PNG), yorug' va qorong'i rejimda. Agar komponentlar kodda yozilgan bo'lsa (ayniqsa React + Tailwind), manba kodini ham yuboring — namuna sifatida ishlatamiz.

## Formati
1. `design-system.md` — yuqoridagi hammasi, bitta hujjatda
2. `tokens.css` — tokenlar fayli
3. `screenshots/` — rasmlar
4. Shrift fayllari (agar Google Fonts'da bo'lmasa)

Hujjat oxirida alohida qayd eting: qaysi qismlar faqat ERP'ga xos (bizga kerak emas), qaysilari umumiy tizim. Biror qiymat aniq bo'lmasa — taxmin qilib yozmang, "aniqlanmagan" deb belgilang.
