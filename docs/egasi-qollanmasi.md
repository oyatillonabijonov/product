# ProDuct sayti — egasi uchun qo'llanma

Bir sahifa. Sayt o'zi ishlaydi; sizdan faqat shu yerdagi narsalar kutiladi.

Admin: saytingiz manzili + `/admin`. Chapda beshta bo'lim: **Bosh sahifa · Mahsulotlar · Buyurtmalar · Kontent · Sozlamalar** (telefonda — pastdagi qator).

## 1. Kunni Bosh sahifadan boshlang

Bosh sahifada faqat harakat talab qiladigan narsa turadi: **Rasm kerak** (rasmi yo'qligi uchun saytda ko'rinmayotgan tovarlar — bosilsa o'sha ro'yxat ochiladi), **Yangi buyurtmalar**, **Yangi arizalar**, **Billz** (oxirgi sinxronizatsiya) va **Dollar kursi**. Bo'sh bo'lsa — qiladigan ish yo'q.

## 2. Tovar saytda qanday paydo bo'ladi

Sayt tovarlarni **Billz**dan oladi (har 30 daqiqada, o'zi). Tovar saytda ko'rinishi uchun ikkita shart bor:

1. **Rasm** — Billz'da rasmsiz tovar saytga tushadi, lekin ko'rinmaydi. Rasmni Billz'ga yuklang (bir marta) yoki admin → Mahsulotlar → «Rasm kerak» ro'yxatidan saytning o'zida yuklang. Rasm qo'yilishi bilan tovar **darhol** saytda chiqadi — kutish shart emas. **Qoldiq bu yerda shart emas** (2026-09-24): omborda hali kelmagan tovar ham, rasmi bo'lsa, saytda turaveradi — mijoz oldindan ko'rib qo'yishi mumkin.
2. Siz o'zingiz yashirmagan bo'lishi kerak. Admin'da tovarni «Saytdan yashir» qilsangiz — bu **doimiy**: Billz sinxronizatsiyasi uni endi qaytarib ochmaydi, faqat siz «Saytda ko'rsat» deb qaytarasiz.

**«Nad Kategoriya»** maydoni (Billz'da) tovarni `Apple`, `PC`, `Audio` yoki `Video` bo'limiga qo'yadi; bo'sh bo'lsa tovar katalog va qidiruvda qoladi, lekin hech qaysi bo'limga tushmaydi. Billz'ni tuzatmoqchi bo'lmasangiz, tovarni admin'da oching — bo'lim yoki turni o'zingiz o'zgartirsangiz, o'sha maydon avtomatik «Qo'lda» belgisini oladi va sinxronizatsiya keyin unga tegmaydi.

**Billz tovarida o'zgartirgan narsangiz qoladi.** Admin'da narx, xususiyat, tavsif, bo'lim/tur, nom, brend yoki rasmni o'zgartirsangiz — o'sha maydon yonida **«Qo'lda»** belgisi chiqadi, sinxronizatsiya endi uni yangilamaydi. Xatoan o'zgartirgan bo'lsangiz, belgi yonidagi **«Billz'ga qaytarish»**ni bosing — qulf yechiladi va keyingi sinxronizatsiyada Billz'dagi qiymat qaytadi. Tegilmagan maydonlar («Billz» belgisi bilan) har doim Billz'dan yangilanaveradi.

Bir xil nomdagi Billz yozuvlari (har dona alohida) saytda **bitta** tovar bo'lib chiqadi, qoldig'i yig'iladi. Shuning uchun nomni bir xil yozing: «MacBook Pro 14" …» va «MacBook Pro 14inch …» ikkita alohida tovar bo'ladi. (Saytdagi nomni admin'da o'zingiz o'zgartirsangiz, u ham «Qo'lda» bo'lib qoladi — moslashtirish Billz'dagi nomdan davom etadi, shuning uchun tovar adashmaydi.)

Billz'dagi kategoriya nomi (iPhone, MacBook, Laptop, Processor, Microphone…) saytdagi **tur**ga aylanadi. Tanimagan nomi bo'lsa tovar bo'limda turadi, lekin tur bo'yicha filtrda chiqmaydi — buni o'zingiz tuzatasiz: **Mahsulotlar → Turlar**'da tegishli turni oching, «Billz aliaslari»ga o'sha nomni yozib Enter bosing, so'ng Saqlash; keyingi sinxronizatsiyada tovar joyiga tushadi.

## 3. Narx va dollar kursi

Billz'da narx dollarda, saytda so'mda. Hammasi **Sozlamalar → To'lov va kurs**da:

- **Dollar kursi** — «Ustama (%)» ga bir marta raqam yozing (masalan 2). Sayt Markaziy bank kursini har 6 soatda o'zi oladi va ustama qo'shib do'kon kursini hisoblaydi; endi kursni qo'lda yangilash shart emas. Ustamani bo'sh qoldirsangiz kursni o'zingiz yozasiz va u o'zi o'zgarmaydi.
- **Boshlang'ich to'lov** — mahsulot sahifasidagi slayder shu oraliqda suriladi.
- **Muddatlar va ustama** — muddatli to'lov qatorlari. Har qator yonida 10 mln so'mlik tovar uchun namunaviy oylik to'lov ko'rinadi: raqamni o'zgartirsangiz namunasi darhol yangilanadi, shuning uchun saqlashdan oldin natijani ko'rasiz.

Billz'da «promo narx» qo'ysangiz saytda chegirma (eski narx chizilgan) va «Chegirmalar» sahifasi o'zi paydo bo'ladi.

## 4. Buyurtmalar

Mijoz saytda ism va telefon qoldiradi. Buyurtma ikki joyga tushadi: **Telegram guruhingizga** (bot orqali) va admin → **Buyurtmalar**ga. Operator 30 daqiqa ichida qo'ng'iroq qilib narxni tasdiqlaydi (sayt shuni va'da qiladi). Statusni admin'da o'zgartiring: Yangi → Bog'lanildi → Bajarildi. Konsultatsiya arizalari shu ro'yxatda «Konsultatsiya» belgisi bilan turadi.

Vakansiyaga kelgan arizalar alohida: **Buyurtmalar → Ish arizalari**.

## 5. Sayt matnlari va rasmlari — Kontent

Saytdagi deyarli har bir matn va rasm admin'da tahrirlanadi. Maydonni bo'shatsangiz standart matn qaytadi.

- **Kontent → Bosh sahifa** — to'rt yo'nalish kartasi (nom, rasm, poster va ikkitagacha video), xizmat va'dalari, konsultatsiya bloki, bo'lim sarlavhalari.
- **Kontent → Sahifalar** — Shartlar, FAQ, Biz haqimizda, Trade-In, Kontakt, Qaytarish, Ommaviy oferta, Maxfiylik. «Biz haqimizda» alohida forma (matnlar va to'rtta foto), huquqiy sahifalarda «Qisqa izoh» sarlavha ostida chiqadi. Matn oddiy belgilar bilan yoziladi: `## Sarlavha`, `- ro'yxat`, `1. band`, `**qalin**`. Ikki tilda (uz/ru); ruscha sarlavha bo'sh qolsa o'zbekchasi ishlatiladi.
- **Kontent → Yangiliklar** — bosh sahifadagi uchta plitka. **Blog** — maqolalar. **Bannerlar** — bosh sahifada hero'dan keyin chiqadigan aksiya rasmlari (1200×400 atrofida); bo'sh bo'lsa hech narsa ko'rinmaydi.
- **Kontent → Vakansiyalar** — lavozimlar ro'yxati; «Sahifa matni» kartasida vakansiyalar sahifasining matni va ikkita fotosi.

**Birinchi kunlardayoq to'ldiring:** Oferta va Maxfiylik sahifalarida `[MCHJ / YaTT nomi]` va `[STIR raqami]` qavslari bor — o'z rekvizitlaringizni yozing.

## 6. Sozlamalar

- **Do'kon** — do'kon nomi, narx rejimi (naqd / muddatli / ikkalasi), logo (yorug' va qorong'i mavzu uchun) va favicon, mahsulot sahifasidagi va'dalar, buyurtma va cookie matnlari.
- **Aloqa** — telefon (qanday yozsangiz saytda shunday chiqadi), Telegram, Instagram, WhatsApp, manzil, ish vaqti, xarita koordinatasi. Bo'sh qoldirilgan havola saytda umuman chiqmaydi.
- **To'lov va kurs** — 3-bo'limga qarang.
- **Integratsiyalar** — Billz kaliti va do'koni (+ «Sinxronlash» tugmasi va oxirgi natija), buyurtma xabarnomasi uchun Telegram bot tokeni va guruh chat id, mijoz kirishi (Google / Telegram), Yandex Metrica hisoblagichi.
- **SEO** — sarlavha qo'shimchasi, bosh sahifa tavsifi, ulashish rasmi (havola Telegram yoki ijtimoiy tarmoqda tashlanganda ko'rinadi), katalog sahifalari uchun tavsif shabloni.
- **Akkaunt** — login va parol. Standart `admin/admin` parolini birinchi kuni o'zgartiring; har o'zgarish joriy parol bilan tasdiqlanadi va parol almashgach barcha ochiq sessiyalar bekor bo'ladi.

## 7. Sharhlar

Sayt o'zi sharh yig'maydi. Admin → **Mahsulotlar** → tovarni oching → «Reyting va sharhlar» kartasi: muallif, baho, matn, sana. Reyting o'zi hisoblanadi. Sharhsiz tovarda yulduzcha ko'rinmaydi.

## 8. Mijoz akkauntlari

Mijozlar ro'yxatdan o'tmasdan buyurtma beradi. Google/Telegram orqali kirish faqat **Sozlamalar → Integratsiyalar**da Google Client ID yoki Telegram login boti kiritilgan bo'lsa ko'rinadi. Kiritilmagan bo'lsa saytda «Kirish» tugmasi umuman yo'q — bu normal.

## 9. Zaxira nusxa

Server har kuni bazaning nusxasini `data/backups/` papkasiga oladi (oxirgi 7 kun). Oyda bir marta shu papkani va `data/images/` ni kompyuteringizga ko'chirib oling — bu sizning butun saytingiz.

## 10. Claude bilan gaplashib tovar qo'shish

Claude Code o'rnatish shart emas — telefondan ham ishlaydi. Claude bilan gaplashib tovar
qo'shish, yetishmayotgan rasm/tavsifni to'ldirish va katalog holatini so'rash mumkin.

1. claude.ai → Settings → Connectors → **Add custom connector**.
2. Manzil sifatida saytingizni yozing: `https://<saytingiz>/mcp`.
3. Ochilgan sahifada admin login va parolingizni kiriting, bu ulanishga bir nom bering
   (masalan «Javlonning telefoni») va «Ruxsat berish»ni bosing.

Ulanish admin → Sozlamalar → Integratsiyalar → «MCP tokenlari» ro'yxatida ko'rinadi —
kerak bo'lsa o'sha yerdan bir bosishda bekor qilinadi.

Telefondan rasm yuborish: chatga tashlagan rasmingizni Claude saytga to'g'ridan-to'g'ri
uzata olmaydi. Shunday holatda **«rasm yuklash havolasini ber»** deb yozing — Claude
30 daqiqa ishlaydigan havola beradi, uni bosib galereyadan rasm tanlaysiz, rasmlar
tovarga o'zi qo'shiladi.

## 11. Kimga murojaat qilish

- Tovar saytda ko'rinmayapti → 2-bo'limdagi shartlarni tekshiring (rasm bormi, o'zingiz yashirmaganmisiz).
- Narx noto'g'ri → kurs (3-bo'lim) yoki Billz'dagi narx.
- Buyurtma Telegramga kelmayapti → bot token va chat id (Sozlamalar → Integratsiyalar); buyurtma baribir admin'da turadi.
- Matnni o'zgartirdim, saytda eskisi turibdi → 1–5 daqiqa kuting, sahifa keshi shuncha vaqtda yangilanadi.
- Boshqa hamma narsa → dasturchi.
