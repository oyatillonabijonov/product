# ProDuct sayti — egasi uchun qo'llanma

Bir sahifa. Sayt o'zi ishlaydi; sizdan faqat shu yerdagi narsalar kutiladi.

## 1. Tovar saytda qanday paydo bo'ladi

Sayt tovarlarni **Billz**dan oladi (har 30 daqiqada, o'zi). Tovar saytda ko'rinishi uchun Billz'da uchta narsa bo'lishi shart:

1. **Rasm** — Billz'da rasmsiz tovar saytga tushadi, lekin ko'rinmaydi. Rasmni Billz'ga yuklang (bir marta) yoki admin → Mahsulotlar → «Rasm kerak» ro'yxatidan saytning o'zida yuklang.
2. **Qoldiq > 0** — qoldiq nolga tushsa tovar o'zi yashirinadi, qaytsa o'zi chiqadi.
3. **«Nad Kategoriya»** maydoni: `Apple`, `PC`, `Audio` yoki `Video`. Bo'sh bo'lsa tovar hech qaysi bo'limga tushmaydi.

Bir xil nomdagi Billz yozuvlari (har dona alohida) saytda **bitta** tovar bo'lib chiqadi, qoldig'i yig'iladi. Shuning uchun nomni bir xil yozing: «MacBook Pro 14" …» va «MacBook Pro 14inch …» ikkita alohida tovar bo'ladi.

Billz'dagi kategoriya nomi (iPhone, MacBook, Laptop, Processor, Microphone…) saytdagi «tur»ga aylanadi. Tanimagan nomi bo'lsa tovar bo'limda turadi, lekin tur bo'yicha filtrda chiqmaydi — buni o'zingiz tuzatasiz: admin → Mahsulotlar → Turlar'da tegishli turni oching, «Billz aliaslari»ga o'sha nomni yozib Enter bosing, so'ng Saqlash; keyingi sinxronizatsiyada tovar joyiga tushadi.

## 2. Narx va dollar kursi

Billz'da narx dollarda, saytda so'mda. Kurs admin → **Sozlamalar → Dollar kursi** maydonida. **Haftada bir marta** yangilang, keyingi sinxronizatsiyada (30 daqiqa ichida) hamma narx qayta hisoblanadi. Unutilsa butun katalog narxi eskiradi.

Billz'da «promo narx» qo'ysangiz saytda chegirma (eski narx chizilgan) va «Chegirmalar» sahifasi o'zi paydo bo'ladi.

## 3. Buyurtmalar

Mijoz saytda ism va telefon qoldiradi. Buyurtma ikki joyga tushadi: **Telegram guruhingizga** (bot orqali) va admin → **Buyurtmalar**ga. Operator 30 daqiqa ichida qo'ng'iroq qilib narxni tasdiqlaydi (sayt shuni va'da qiladi). Statusni admin'da o'zgartiring: Yangi → Bog'lanildi → Bajarildi. Konsultatsiya arizalari ham shu yerda.

## 4. Matnlar va sahifalar

Admin → **Sahifalar**: Shartlar, FAQ, Biz haqimizda, Trade-In, Qaytarish, Ommaviy oferta, Maxfiylik. Matn oddiy belgilar bilan yoziladi: `## Sarlavha`, `- ro'yxat`, `**qalin**`. Ikki tilda (uz/ru).

**Birinchi kunlardayoq to'ldiring:** Oferta va Maxfiylik sahifalarida `[MCHJ / YaTT nomi]` va `[STIR raqami]` qavslari bor — o'z rekvizitlaringizni yozing.

Admin → **Blog**: maqolalar (bosh sahifada uchtasi ko'rinadi). Admin → **Bannerlar**: bosh sahifada hero'dan keyin chiqadigan aksiya rasmlari (1200×400 atrofida), bo'sh bo'lsa hech narsa ko'rinmaydi.

## 5. Sharhlar

Sayt o'zi sharh yig'maydi. Admin → Mahsulotlar → tovarni oching → pastda **Sharhlar**: muallif, baho, matn, sana. Reyting o'zi hisoblanadi. Sharhsiz tovarda yulduzcha ko'rinmaydi.

## 6. Kirish (mijoz akkauntlari)

Mijozlar ro'yxatdan o'tmasdan buyurtma beradi. Google/Telegram orqali kirish faqat admin → **Sayt ma'lumotlari**da Google Client ID yoki Telegram login bot kiritilgan bo'lsa ko'rinadi. Kiritilmagan bo'lsa «Kirish» tugmasi umuman yo'q — bu normal.

## 7. Sozlamalar (bir marta)

Admin → Sayt ma'lumotlari:
- **Telegram bot token** va **guruh chat id** — buyurtmalar guruhga tushishi uchun (bot guruhga admin qilib qo'shiladi).
- **Yandex Metrica id** — statistika.
- **Billz kaliti** va **do'kon** — sinxronizatsiya (kalit vaqtincha bo'lsa, doimiysiga almashtiring).

Admin → Sozlamalar → **Akkaunt**: standart `admin/admin` parolini birinchi kuni o'zgartiring.

## 8. Zaxira nusxa

Server har kuni bazaning nusxasini `data/backups/` papkasiga oladi (oxirgi 7 kun). Oyda bir marta shu papkani va `data/images/` ni kompyuteringizga ko'chirib oling — bu sizning butun saytingiz.

## 9. Kimga murojaat qilish

- Tovar saytda ko'rinmayapti → 1-bo'limdagi uchta shartni tekshiring.
- Narx noto'g'ri → kurs (2-bo'lim) yoki Billz'dagi narx.
- Buyurtma Telegramga kelmayapti → bot token/chat id (7-bo'lim); buyurtma baribir admin'da turadi.
- Boshqa hamma narsa → dasturchi.
