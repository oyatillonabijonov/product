-- Topshirish oldi kontent (2026-09-13): sayt naqd rejimda, sahifalar muddatli to'lov haqida
-- gapirardi va NAMUNA matnlar turardi. Bu yerda: Shartlar/FAQ/Biz haqimizda/Trade-In naqd rejimga
-- qayta yozildi, qaytarish + ommaviy oferta + maxfiylik siyosati qo'shildi (yuridik rekvizitlar
-- [qavs] ichida — egasi admin → Sahifalar'da to'ldiradi), Yangiliklar (blog dublikati) o'chirildi.
-- Namuna mahsulotlar (0002/0025 seed'lari, to'qima narx) ko'rinishdan olib tashlanadi, o'chirilmaydi.

UPDATE pages SET title_uz='Shartlar', title_ru='Условия', title_en='Shartlar', title_cyrl='Shartlar', content_uz='## Buyurtma
Saytdagi har bir mahsulot rasmiy import qilingan original texnika. Buyurtma bir bosishda beriladi: ism va telefon raqamingizni qoldirasiz, operatorimiz ish vaqtida 30 daqiqa ichida qo''ng''iroq qilib narx, mavjudlik va yetkazib berishni tasdiqlaydi.

## To''lov
- Naqd yoki karta orqali do''konda.
- Yetkazib berishda naqd yoki karta orqali.
- Yuridik shaxslar uchun hisob-faktura bilan pul o''tkazish.

Narxlar so''mda ko''rsatilgan. Import texnikasi narxi valyuta kursiga bog''liq, shuning uchun narx operator qo''ng''irog''ida tasdiqlanadi.

## Yetkazib berish
- Toshkent bo''ylab: omborda mavjud tovar 1 kun ichida.
- Viloyatlarga: 2–4 kun, kuryer xizmati orqali.
- Buyurtma jihozlari (omborda yo''q tovar) muddati alohida kelishiladi.

## Kafolat
Ishlab chiqaruvchi shartlari bo''yicha 12–24 oy. Kafolat xizmati do''konimizda ko''rsatiladi, diagnostika natijasi va narx oldindan yozma tasdiqlanadi. Batafsil: [Qaytarish va almashtirish](/page/qaytarish).', content_ru='## Заказ
Каждый товар на сайте — оригинальная техника официального импорта. Заказ оформляется в один клик: вы оставляете имя и номер телефона, оператор перезванивает в рабочее время в течение 30 минут и подтверждает цену, наличие и доставку.

## Оплата
- Наличными или картой в магазине.
- Наличными или картой при доставке.
- Для юридических лиц — перечислением по счёту.

Цены указаны в сумах. Стоимость импортной техники зависит от курса валют, поэтому цена подтверждается при звонке оператора.

## Доставка
- По Ташкенту: товар в наличии — в течение 1 дня.
- В регионы: 2–4 дня курьерской службой.
- Сроки по заказному оборудованию согласуются отдельно.

## Гарантия
12–24 месяца по условиям производителя. Гарантийное обслуживание — в нашем магазине, результат диагностики и стоимость подтверждаются письменно заранее. Подробнее: [Возврат и обмен](/page/qaytarish).', content_en='', content_cyrl='', sort_order=10, is_active=1 WHERE slug='muddatli-tolov';
INSERT INTO pages (id, slug, title_uz, title_ru, title_en, title_cyrl, content_uz, content_ru, content_en, content_cyrl, sort_order, is_active)
  SELECT 'page-muddatli-tolov', 'muddatli-tolov', 'Shartlar', 'Условия', 'Shartlar', 'Shartlar', '## Buyurtma
Saytdagi har bir mahsulot rasmiy import qilingan original texnika. Buyurtma bir bosishda beriladi: ism va telefon raqamingizni qoldirasiz, operatorimiz ish vaqtida 30 daqiqa ichida qo''ng''iroq qilib narx, mavjudlik va yetkazib berishni tasdiqlaydi.

## To''lov
- Naqd yoki karta orqali do''konda.
- Yetkazib berishda naqd yoki karta orqali.
- Yuridik shaxslar uchun hisob-faktura bilan pul o''tkazish.

Narxlar so''mda ko''rsatilgan. Import texnikasi narxi valyuta kursiga bog''liq, shuning uchun narx operator qo''ng''irog''ida tasdiqlanadi.

## Yetkazib berish
- Toshkent bo''ylab: omborda mavjud tovar 1 kun ichida.
- Viloyatlarga: 2–4 kun, kuryer xizmati orqali.
- Buyurtma jihozlari (omborda yo''q tovar) muddati alohida kelishiladi.

## Kafolat
Ishlab chiqaruvchi shartlari bo''yicha 12–24 oy. Kafolat xizmati do''konimizda ko''rsatiladi, diagnostika natijasi va narx oldindan yozma tasdiqlanadi. Batafsil: [Qaytarish va almashtirish](/page/qaytarish).', '## Заказ
Каждый товар на сайте — оригинальная техника официального импорта. Заказ оформляется в один клик: вы оставляете имя и номер телефона, оператор перезванивает в рабочее время в течение 30 минут и подтверждает цену, наличие и доставку.

## Оплата
- Наличными или картой в магазине.
- Наличными или картой при доставке.
- Для юридических лиц — перечислением по счёту.

Цены указаны в сумах. Стоимость импортной техники зависит от курса валют, поэтому цена подтверждается при звонке оператора.

## Доставка
- По Ташкенту: товар в наличии — в течение 1 дня.
- В регионы: 2–4 дня курьерской службой.
- Сроки по заказному оборудованию согласуются отдельно.

## Гарантия
12–24 месяца по условиям производителя. Гарантийное обслуживание — в нашем магазине, результат диагностики и стоимость подтверждаются письменно заранее. Подробнее: [Возврат и обмен](/page/qaytarish).', '', '', 10, 1
  WHERE NOT EXISTS (SELECT 1 FROM pages WHERE slug='muddatli-tolov');

UPDATE pages SET title_uz='Ko''p so''raladigan savollar', title_ru='Часто задаваемые вопросы', title_en='Ko''p so''raladigan savollar', title_cyrl='Ko''p so''raladigan savollar', content_uz='## Mahsulotlar originalmi?
Ha. Barcha texnika rasmiy import qilinadi, har bir tovar ishlab chiqaruvchi kafolati bilan keladi.

## Narx nima uchun so''mda va o''zgarishi mumkin?
Import texnikasi narxi valyuta kursiga bog''liq. Saytdagi narx joriy kurs bo''yicha hisoblanadi va operator qo''ng''irog''ida yakuniy tasdiqlanadi.

## Qanday buyurtma beraman?
Mahsulot sahifasida «Hoziroq xarid qilish» tugmasini bosing, ism va telefonni kiriting. Operator ish vaqtida 30 daqiqa ichida qo''ng''iroq qiladi. Ro''yxatdan o''tish shart emas.

## Qanday to''layman?
Naqd yoki karta orqali do''konda yoki yetkazib berishda. Yuridik shaxslar uchun hisob-faktura.

## Yetkazib berish qancha vaqt oladi?
Toshkent bo''ylab 1 kun, viloyatlarga 2–4 kun. Omborda yo''q tovar muddati alohida kelishiladi.

## Kafolat qanday?
Ishlab chiqaruvchi shartlari bo''yicha 12–24 oy, xizmat do''konimizda.

## Tovarni qaytarish mumkinmi?
Ha, qonunda belgilangan tartibda. Shartlar [Qaytarish va almashtirish](/page/qaytarish) sahifasida.

## Tanlashda yordam kerak bo''lsa?
Bosh sahifadagi bepul konsultatsiya formasini to''ldiring yoki qo''ng''iroq qiling — muhandis vazifangizga qarab konfiguratsiya taklif qiladi.', content_ru='## Товары оригинальные?
Да. Вся техника ввозится официально, каждый товар идёт с гарантией производителя.

## Почему цена в сумах и может измениться?
Стоимость импортной техники зависит от курса валют. Цена на сайте рассчитана по текущему курсу и окончательно подтверждается при звонке оператора.

## Как оформить заказ?
Нажмите «Купить сейчас» на странице товара, введите имя и телефон. Оператор перезвонит в рабочее время в течение 30 минут. Регистрация не нужна.

## Как оплатить?
Наличными или картой в магазине либо при доставке. Для юридических лиц — по счёту.

## Сколько занимает доставка?
По Ташкенту — 1 день, в регионы — 2–4 дня. Сроки по товарам под заказ согласуются отдельно.

## Какая гарантия?
12–24 месяца по условиям производителя, обслуживание в нашем магазине.

## Можно ли вернуть товар?
Да, в установленном законом порядке. Условия — на странице [Возврат и обмен](/page/qaytarish).

## Нужна помощь с выбором?
Заполните форму бесплатной консультации на главной странице или позвоните — инженер подберёт конфигурацию под вашу задачу.', content_en='', content_cyrl='', sort_order=20, is_active=1 WHERE slug='faq';
INSERT INTO pages (id, slug, title_uz, title_ru, title_en, title_cyrl, content_uz, content_ru, content_en, content_cyrl, sort_order, is_active)
  SELECT 'page-faq', 'faq', 'Ko''p so''raladigan savollar', 'Часто задаваемые вопросы', 'Ko''p so''raladigan savollar', 'Ko''p so''raladigan savollar', '## Mahsulotlar originalmi?
Ha. Barcha texnika rasmiy import qilinadi, har bir tovar ishlab chiqaruvchi kafolati bilan keladi.

## Narx nima uchun so''mda va o''zgarishi mumkin?
Import texnikasi narxi valyuta kursiga bog''liq. Saytdagi narx joriy kurs bo''yicha hisoblanadi va operator qo''ng''irog''ida yakuniy tasdiqlanadi.

## Qanday buyurtma beraman?
Mahsulot sahifasida «Hoziroq xarid qilish» tugmasini bosing, ism va telefonni kiriting. Operator ish vaqtida 30 daqiqa ichida qo''ng''iroq qiladi. Ro''yxatdan o''tish shart emas.

## Qanday to''layman?
Naqd yoki karta orqali do''konda yoki yetkazib berishda. Yuridik shaxslar uchun hisob-faktura.

## Yetkazib berish qancha vaqt oladi?
Toshkent bo''ylab 1 kun, viloyatlarga 2–4 kun. Omborda yo''q tovar muddati alohida kelishiladi.

## Kafolat qanday?
Ishlab chiqaruvchi shartlari bo''yicha 12–24 oy, xizmat do''konimizda.

## Tovarni qaytarish mumkinmi?
Ha, qonunda belgilangan tartibda. Shartlar [Qaytarish va almashtirish](/page/qaytarish) sahifasida.

## Tanlashda yordam kerak bo''lsa?
Bosh sahifadagi bepul konsultatsiya formasini to''ldiring yoki qo''ng''iroq qiling — muhandis vazifangizga qarab konfiguratsiya taklif qiladi.', '## Товары оригинальные?
Да. Вся техника ввозится официально, каждый товар идёт с гарантией производителя.

## Почему цена в сумах и может измениться?
Стоимость импортной техники зависит от курса валют. Цена на сайте рассчитана по текущему курсу и окончательно подтверждается при звонке оператора.

## Как оформить заказ?
Нажмите «Купить сейчас» на странице товара, введите имя и телефон. Оператор перезвонит в рабочее время в течение 30 минут. Регистрация не нужна.

## Как оплатить?
Наличными или картой в магазине либо при доставке. Для юридических лиц — по счёту.

## Сколько занимает доставка?
По Ташкенту — 1 день, в регионы — 2–4 дня. Сроки по товарам под заказ согласуются отдельно.

## Какая гарантия?
12–24 месяца по условиям производителя, обслуживание в нашем магазине.

## Можно ли вернуть товар?
Да, в установленном законом порядке. Условия — на странице [Возврат и обмен](/page/qaytarish).

## Нужна помощь с выбором?
Заполните форму бесплатной консультации на главной странице или позвоните — инженер подберёт конфигурацию под вашу задачу.', '', '', 20, 1
  WHERE NOT EXISTS (SELECT 1 FROM pages WHERE slug='faq');

UPDATE pages SET title_uz='Biz haqimizda', title_ru='О нас', title_en='Biz haqimizda', title_cyrl='Biz haqimizda', content_uz='ProDuct — Toshkentdagi professional texnika do''koni. To''rt yo''nalishda ishlaymiz: **Apple** qurilmalari, **PC** (ish stantsiyalari, noutbuklar va komponentlar), **professional audio** va **professional video** jihozlari.

## Professional yondashuv
Biz narx ro''yxati emas, yechim taklif qilamiz: muhandislarimiz vazifangizni eshitib, mos konfiguratsiyani tanlab beradi — montaj uchun kompyuterdan tortib studiya jihozigacha.

## Nimaga bizni tanlashadi
- Rasmiy import va ishlab chiqaruvchi kafolati.
- Diagnostika va servis do''konning o''zida, narx oldindan kelishiladi.
- Toshkent bo''ylab 1 kunda yetkazib berish.

Manzil va ish vaqti [Kontakt](/page/kontakt) sahifasida.', content_ru='ProDuct — магазин профессиональной техники в Ташкенте. Работаем в четырёх направлениях: устройства **Apple**, **PC** (рабочие станции, ноутбуки и комплектующие), **профессиональное аудио** и **профессиональное видео**.

## Профессиональный подход
Мы предлагаем не прайс-лист, а решение: инженеры выслушают задачу и подберут конфигурацию — от компьютера для монтажа до оснащения студии.

## Почему выбирают нас
- Официальный импорт и гарантия производителя.
- Диагностика и сервис в самом магазине, цена согласуется заранее.
- Доставка по Ташкенту за 1 день.

Адрес и часы работы — на странице [Контакты](/page/kontakt).', content_en='', content_cyrl='', sort_order=30, is_active=1 WHERE slug='biz-haqimizda';
INSERT INTO pages (id, slug, title_uz, title_ru, title_en, title_cyrl, content_uz, content_ru, content_en, content_cyrl, sort_order, is_active)
  SELECT 'page-biz-haqimizda', 'biz-haqimizda', 'Biz haqimizda', 'О нас', 'Biz haqimizda', 'Biz haqimizda', 'ProDuct — Toshkentdagi professional texnika do''koni. To''rt yo''nalishda ishlaymiz: **Apple** qurilmalari, **PC** (ish stantsiyalari, noutbuklar va komponentlar), **professional audio** va **professional video** jihozlari.

## Professional yondashuv
Biz narx ro''yxati emas, yechim taklif qilamiz: muhandislarimiz vazifangizni eshitib, mos konfiguratsiyani tanlab beradi — montaj uchun kompyuterdan tortib studiya jihozigacha.

## Nimaga bizni tanlashadi
- Rasmiy import va ishlab chiqaruvchi kafolati.
- Diagnostika va servis do''konning o''zida, narx oldindan kelishiladi.
- Toshkent bo''ylab 1 kunda yetkazib berish.

Manzil va ish vaqti [Kontakt](/page/kontakt) sahifasida.', 'ProDuct — магазин профессиональной техники в Ташкенте. Работаем в четырёх направлениях: устройства **Apple**, **PC** (рабочие станции, ноутбуки и комплектующие), **профессиональное аудио** и **профессиональное видео**.

## Профессиональный подход
Мы предлагаем не прайс-лист, а решение: инженеры выслушают задачу и подберут конфигурацию — от компьютера для монтажа до оснащения студии.

## Почему выбирают нас
- Официальный импорт и гарантия производителя.
- Диагностика и сервис в самом магазине, цена согласуется заранее.
- Доставка по Ташкенту за 1 день.

Адрес и часы работы — на странице [Контакты](/page/kontakt).', '', '', 30, 1
  WHERE NOT EXISTS (SELECT 1 FROM pages WHERE slug='biz-haqimizda');

UPDATE pages SET title_uz='Trade-In', title_ru='Trade-In', title_en='Trade-In', title_cyrl='Trade-In', content_uz='Eski qurilmangizni yangisiga almashtiring: do''konda mutaxassis qurilmani baholaydi va uning narxi yangi xarid narxidan chegiriladi.

## Qanday ishlaydi
1. Qurilmani do''konga olib keling (yoki telefon orqali oldindan baho so''rang).
2. Mutaxassis holatini tekshiradi: korpus, ekran, batareya, ishlashi.
3. Baholangan summa yangi qurilma narxidan ayiriladi.

## Qabul qilamiz
Apple qurilmalari (iPhone, iPad, MacBook, iMac, Apple Watch) va noutbuklar. Qurilma ishlaydigan holatda, Activation Lock o''chirilgan bo''lishi kerak.', content_ru='Обменяйте старое устройство на новое: специалист в магазине оценит устройство, и его стоимость будет вычтена из цены покупки.

## Как это работает
1. Принесите устройство в магазин (или запросите предварительную оценку по телефону).
2. Специалист проверит состояние: корпус, экран, батарею, работоспособность.
3. Оценённая сумма вычитается из цены нового устройства.

## Принимаем
Устройства Apple (iPhone, iPad, MacBook, iMac, Apple Watch) и ноутбуки. Устройство должно быть исправным, Activation Lock — отключён.', content_en='', content_cyrl='', sort_order=40, is_active=1 WHERE slug='trade-in';
INSERT INTO pages (id, slug, title_uz, title_ru, title_en, title_cyrl, content_uz, content_ru, content_en, content_cyrl, sort_order, is_active)
  SELECT 'page-trade-in', 'trade-in', 'Trade-In', 'Trade-In', 'Trade-In', 'Trade-In', 'Eski qurilmangizni yangisiga almashtiring: do''konda mutaxassis qurilmani baholaydi va uning narxi yangi xarid narxidan chegiriladi.

## Qanday ishlaydi
1. Qurilmani do''konga olib keling (yoki telefon orqali oldindan baho so''rang).
2. Mutaxassis holatini tekshiradi: korpus, ekran, batareya, ishlashi.
3. Baholangan summa yangi qurilma narxidan ayiriladi.

## Qabul qilamiz
Apple qurilmalari (iPhone, iPad, MacBook, iMac, Apple Watch) va noutbuklar. Qurilma ishlaydigan holatda, Activation Lock o''chirilgan bo''lishi kerak.', 'Обменяйте старое устройство на новое: специалист в магазине оценит устройство, и его стоимость будет вычтена из цены покупки.

## Как это работает
1. Принесите устройство в магазин (или запросите предварительную оценку по телефону).
2. Специалист проверит состояние: корпус, экран, батарею, работоспособность.
3. Оценённая сумма вычитается из цены нового устройства.

## Принимаем
Устройства Apple (iPhone, iPad, MacBook, iMac, Apple Watch) и ноутбуки. Устройство должно быть исправным, Activation Lock — отключён.', '', '', 40, 1
  WHERE NOT EXISTS (SELECT 1 FROM pages WHERE slug='trade-in');

UPDATE pages SET title_uz='Qaytarish va almashtirish', title_ru='Возврат и обмен', title_en='Qaytarish va almashtirish', title_cyrl='Qaytarish va almashtirish', content_uz='Iste''molchilar huquqlarini himoya qilish to''g''risidagi qonunga muvofiq ishlaymiz.

## Sifatli tovar
Sifatli tovarni xarid kunidan boshlab 10 kun ichida qaytarish yoki almashtirish mumkin, agar u ishlatilmagan, tovar ko''rinishi, plombalari, to''liq komplekti va qadoqlari saqlangan bo''lsa. Chek yoki xaridni tasdiqlovchi boshqa hujjat kerak.

Texnik jihatdan murakkab tovarlar (kompyuter, noutbuk, telefon, planshet, kamera va h.k.) sifatli bo''lsa, qonunga ko''ra faqat kelishuv asosida almashtiriladi.

## Nuqsonli tovar
Kafolat muddati ichida nuqson aniqlansa, tovar bepul ta''mirlanadi, almashtiriladi yoki puli qaytariladi. Buning uchun do''konga murojaat qiling, diagnostika natijasi yozma beriladi.

## Kafolat amal qilmaydigan holatlar
- Mexanik shikast, suyuqlik tushishi, noto''g''ri foydalanish.
- Rasmiy bo''lmagan ta''mir yoki dasturiy o''zgartirish.
- Sarflanadigan qismlarning tabiiy eskirishi.

## Murojaat
Telefon yoki Telegram orqali — kontaktlar [Kontakt](/page/kontakt) sahifasida.', content_ru='Работаем в соответствии с законом «О защите прав потребителей».

## Товар надлежащего качества
Товар надлежащего качества можно вернуть или обменять в течение 10 дней с даты покупки, если он не использовался, сохранены товарный вид, пломбы, комплектность и упаковка. Нужен чек или иной документ, подтверждающий покупку.

Технически сложные товары (компьютеры, ноутбуки, телефоны, планшеты, камеры и т. д.) надлежащего качества по закону обмениваются только по соглашению сторон.

## Товар с недостатком
Если в течение гарантийного срока выявлен недостаток, товар бесплатно ремонтируется, заменяется или возвращаются деньги. Обратитесь в магазин — результат диагностики выдаётся письменно.

## Гарантия не действует
- Механические повреждения, попадание жидкости, неправильная эксплуатация.
- Неофициальный ремонт или программное вмешательство.
- Естественный износ расходных частей.

## Обращение
По телефону или в Telegram — контакты на странице [Контакты](/page/kontakt).', content_en='', content_cyrl='', sort_order=50, is_active=1 WHERE slug='qaytarish';
INSERT INTO pages (id, slug, title_uz, title_ru, title_en, title_cyrl, content_uz, content_ru, content_en, content_cyrl, sort_order, is_active)
  SELECT 'page-qaytarish', 'qaytarish', 'Qaytarish va almashtirish', 'Возврат и обмен', 'Qaytarish va almashtirish', 'Qaytarish va almashtirish', 'Iste''molchilar huquqlarini himoya qilish to''g''risidagi qonunga muvofiq ishlaymiz.

## Sifatli tovar
Sifatli tovarni xarid kunidan boshlab 10 kun ichida qaytarish yoki almashtirish mumkin, agar u ishlatilmagan, tovar ko''rinishi, plombalari, to''liq komplekti va qadoqlari saqlangan bo''lsa. Chek yoki xaridni tasdiqlovchi boshqa hujjat kerak.

Texnik jihatdan murakkab tovarlar (kompyuter, noutbuk, telefon, planshet, kamera va h.k.) sifatli bo''lsa, qonunga ko''ra faqat kelishuv asosida almashtiriladi.

## Nuqsonli tovar
Kafolat muddati ichida nuqson aniqlansa, tovar bepul ta''mirlanadi, almashtiriladi yoki puli qaytariladi. Buning uchun do''konga murojaat qiling, diagnostika natijasi yozma beriladi.

## Kafolat amal qilmaydigan holatlar
- Mexanik shikast, suyuqlik tushishi, noto''g''ri foydalanish.
- Rasmiy bo''lmagan ta''mir yoki dasturiy o''zgartirish.
- Sarflanadigan qismlarning tabiiy eskirishi.

## Murojaat
Telefon yoki Telegram orqali — kontaktlar [Kontakt](/page/kontakt) sahifasida.', 'Работаем в соответствии с законом «О защите прав потребителей».

## Товар надлежащего качества
Товар надлежащего качества можно вернуть или обменять в течение 10 дней с даты покупки, если он не использовался, сохранены товарный вид, пломбы, комплектность и упаковка. Нужен чек или иной документ, подтверждающий покупку.

Технически сложные товары (компьютеры, ноутбуки, телефоны, планшеты, камеры и т. д.) надлежащего качества по закону обмениваются только по соглашению сторон.

## Товар с недостатком
Если в течение гарантийного срока выявлен недостаток, товар бесплатно ремонтируется, заменяется или возвращаются деньги. Обратитесь в магазин — результат диагностики выдаётся письменно.

## Гарантия не действует
- Механические повреждения, попадание жидкости, неправильная эксплуатация.
- Неофициальный ремонт или программное вмешательство.
- Естественный износ расходных частей.

## Обращение
По телефону или в Telegram — контакты на странице [Контакты](/page/kontakt).', '', '', 50, 1
  WHERE NOT EXISTS (SELECT 1 FROM pages WHERE slug='qaytarish');

UPDATE pages SET title_uz='Ommaviy oferta', title_ru='Публичная оферта', title_en='Ommaviy oferta', title_cyrl='Ommaviy oferta', content_uz='**Sotuvchi:** [MCHJ / YaTT nomi], STIR [STIR raqami], manzil: Toshkent shahar, Tong Yulduzi MFY, ko''prik ko''chasi, 30-uy (keyingi o''rinlarda — «Sotuvchi»).

## 1. Umumiy qoidalar
1.1. Ushbu hujjat Sotuvchining saytda ko''rsatilgan tovarlarni sotish bo''yicha ommaviy taklifi (ofertasi) hisoblanadi.
1.2. Saytda buyurtma berish (ism va telefon raqamini yuborish) xaridorning ushbu shartlarni qabul qilganini bildiradi.

## 2. Tovar va narx
2.1. Tovar nomi, tavsifi va narxi saytda ko''rsatiladi. Narxlar so''mda.
2.2. Sotuvchi narxni operator qo''ng''irog''ida yakuniy tasdiqlaydi; tasdiqlangan narx buyurtma bajarilguncha o''zgarmaydi.
2.3. Tovar mavjud bo''lmasa, Sotuvchi xaridorga muqobil taklif qiladi yoki buyurtmani bekor qiladi.

## 3. Buyurtma va to''lov
3.1. Buyurtma saytdagi forma orqali qabul qilinadi va operator tomonidan telefonda tasdiqlanadi.
3.2. To''lov naqd yoki karta orqali do''konda yoki yetkazib berishda, yuridik shaxslar uchun hisob-faktura asosida amalga oshiriladi.

## 4. Yetkazib berish
4.1. Toshkent bo''ylab 1 kun, viloyatlarga 2–4 kun. Yetkazib berish narxi buyurtma tasdiqlanganda kelishiladi.
4.2. Tovar qabul qilinganda xaridor uning tashqi ko''rinishi va komplektini tekshiradi.

## 5. Kafolat va qaytarish
5.1. Kafolat muddati ishlab chiqaruvchi shartlari bo''yicha 12–24 oy.
5.2. Qaytarish va almashtirish [Qaytarish va almashtirish](/page/qaytarish) sahifasida keltirilgan tartibda amalga oshiriladi.

## 6. Shaxsiy ma''lumotlar
6.1. Xaridorning ismi va telefon raqami faqat buyurtmani bajarish uchun ishlatiladi. Batafsil: [Maxfiylik siyosati](/page/maxfiylik).

## 7. Boshqa shartlar
7.1. Sotuvchi ushbu ofertaga o''zgartirish kiritishi mumkin; o''zgartirishlar saytda e''lon qilingan kundan kuchga kiradi.
7.2. Nizolar muzokara yo''li bilan, kelishilmasa O''zbekiston Respublikasi qonunchiligiga muvofiq hal qilinadi.', content_ru='**Продавец:** [название ООО / ИП], ИНН [номер], адрес: г. Ташкент, МФЙ Тонг Юлдузи, ул. Купрук, дом 30 (далее — «Продавец»).

## 1. Общие положения
1.1. Настоящий документ является публичным предложением (офертой) Продавца о продаже товаров, представленных на сайте.
1.2. Оформление заказа на сайте (отправка имени и номера телефона) означает принятие покупателем настоящих условий.

## 2. Товар и цена
2.1. Наименование, описание и цена товара указаны на сайте. Цены в сумах.
2.2. Продавец окончательно подтверждает цену при звонке оператора; подтверждённая цена не меняется до исполнения заказа.
2.3. При отсутствии товара Продавец предлагает замену или отменяет заказ.

## 3. Заказ и оплата
3.1. Заказ принимается через форму на сайте и подтверждается оператором по телефону.
3.2. Оплата — наличными или картой в магазине либо при доставке, для юридических лиц — по счёту.

## 4. Доставка
4.1. По Ташкенту — 1 день, в регионы — 2–4 дня. Стоимость доставки согласуется при подтверждении заказа.
4.2. При получении покупатель проверяет внешний вид и комплектность товара.

## 5. Гарантия и возврат
5.1. Гарантийный срок — 12–24 месяца по условиям производителя.
5.2. Возврат и обмен осуществляются в порядке, указанном на странице [Возврат и обмен](/page/qaytarish).

## 6. Персональные данные
6.1. Имя и номер телефона покупателя используются только для выполнения заказа. Подробнее: [Политика конфиденциальности](/page/maxfiylik).

## 7. Прочие условия
7.1. Продавец вправе изменять оферту; изменения вступают в силу с момента публикации на сайте.
7.2. Споры решаются путём переговоров, при недостижении согласия — в соответствии с законодательством Республики Узбекистан.', content_en='', content_cyrl='', sort_order=60, is_active=1 WHERE slug='oferta';
INSERT INTO pages (id, slug, title_uz, title_ru, title_en, title_cyrl, content_uz, content_ru, content_en, content_cyrl, sort_order, is_active)
  SELECT 'page-oferta', 'oferta', 'Ommaviy oferta', 'Публичная оферта', 'Ommaviy oferta', 'Ommaviy oferta', '**Sotuvchi:** [MCHJ / YaTT nomi], STIR [STIR raqami], manzil: Toshkent shahar, Tong Yulduzi MFY, ko''prik ko''chasi, 30-uy (keyingi o''rinlarda — «Sotuvchi»).

## 1. Umumiy qoidalar
1.1. Ushbu hujjat Sotuvchining saytda ko''rsatilgan tovarlarni sotish bo''yicha ommaviy taklifi (ofertasi) hisoblanadi.
1.2. Saytda buyurtma berish (ism va telefon raqamini yuborish) xaridorning ushbu shartlarni qabul qilganini bildiradi.

## 2. Tovar va narx
2.1. Tovar nomi, tavsifi va narxi saytda ko''rsatiladi. Narxlar so''mda.
2.2. Sotuvchi narxni operator qo''ng''irog''ida yakuniy tasdiqlaydi; tasdiqlangan narx buyurtma bajarilguncha o''zgarmaydi.
2.3. Tovar mavjud bo''lmasa, Sotuvchi xaridorga muqobil taklif qiladi yoki buyurtmani bekor qiladi.

## 3. Buyurtma va to''lov
3.1. Buyurtma saytdagi forma orqali qabul qilinadi va operator tomonidan telefonda tasdiqlanadi.
3.2. To''lov naqd yoki karta orqali do''konda yoki yetkazib berishda, yuridik shaxslar uchun hisob-faktura asosida amalga oshiriladi.

## 4. Yetkazib berish
4.1. Toshkent bo''ylab 1 kun, viloyatlarga 2–4 kun. Yetkazib berish narxi buyurtma tasdiqlanganda kelishiladi.
4.2. Tovar qabul qilinganda xaridor uning tashqi ko''rinishi va komplektini tekshiradi.

## 5. Kafolat va qaytarish
5.1. Kafolat muddati ishlab chiqaruvchi shartlari bo''yicha 12–24 oy.
5.2. Qaytarish va almashtirish [Qaytarish va almashtirish](/page/qaytarish) sahifasida keltirilgan tartibda amalga oshiriladi.

## 6. Shaxsiy ma''lumotlar
6.1. Xaridorning ismi va telefon raqami faqat buyurtmani bajarish uchun ishlatiladi. Batafsil: [Maxfiylik siyosati](/page/maxfiylik).

## 7. Boshqa shartlar
7.1. Sotuvchi ushbu ofertaga o''zgartirish kiritishi mumkin; o''zgartirishlar saytda e''lon qilingan kundan kuchga kiradi.
7.2. Nizolar muzokara yo''li bilan, kelishilmasa O''zbekiston Respublikasi qonunchiligiga muvofiq hal qilinadi.', '**Продавец:** [название ООО / ИП], ИНН [номер], адрес: г. Ташкент, МФЙ Тонг Юлдузи, ул. Купрук, дом 30 (далее — «Продавец»).

## 1. Общие положения
1.1. Настоящий документ является публичным предложением (офертой) Продавца о продаже товаров, представленных на сайте.
1.2. Оформление заказа на сайте (отправка имени и номера телефона) означает принятие покупателем настоящих условий.

## 2. Товар и цена
2.1. Наименование, описание и цена товара указаны на сайте. Цены в сумах.
2.2. Продавец окончательно подтверждает цену при звонке оператора; подтверждённая цена не меняется до исполнения заказа.
2.3. При отсутствии товара Продавец предлагает замену или отменяет заказ.

## 3. Заказ и оплата
3.1. Заказ принимается через форму на сайте и подтверждается оператором по телефону.
3.2. Оплата — наличными или картой в магазине либо при доставке, для юридических лиц — по счёту.

## 4. Доставка
4.1. По Ташкенту — 1 день, в регионы — 2–4 дня. Стоимость доставки согласуется при подтверждении заказа.
4.2. При получении покупатель проверяет внешний вид и комплектность товара.

## 5. Гарантия и возврат
5.1. Гарантийный срок — 12–24 месяца по условиям производителя.
5.2. Возврат и обмен осуществляются в порядке, указанном на странице [Возврат и обмен](/page/qaytarish).

## 6. Персональные данные
6.1. Имя и номер телефона покупателя используются только для выполнения заказа. Подробнее: [Политика конфиденциальности](/page/maxfiylik).

## 7. Прочие условия
7.1. Продавец вправе изменять оферту; изменения вступают в силу с момента публикации на сайте.
7.2. Споры решаются путём переговоров, при недостижении согласия — в соответствии с законодательством Республики Узбекистан.', '', '', 60, 1
  WHERE NOT EXISTS (SELECT 1 FROM pages WHERE slug='oferta');

UPDATE pages SET title_uz='Maxfiylik siyosati', title_ru='Политика конфиденциальности', title_en='Maxfiylik siyosati', title_cyrl='Maxfiylik siyosati', content_uz='## Qanday ma''lumot yig''amiz
- Buyurtma yoki konsultatsiya formasida kiritilgan ism va telefon raqami.
- Google yoki Telegram orqali kirganda — ism va o''sha xizmatdagi identifikator (ixtiyoriy, faqat siz kirsangiz).
- Saytdan foydalanish statistikasi (Yandex Metrica) — shaxsni aniqlamaydigan ko''rinishda.

## Nima uchun
Faqat buyurtmani bajarish, siz bilan bog''lanish va saytni yaxshilash uchun. Ma''lumotlar reklama uchun uchinchi shaxslarga berilmaydi.

## Saqlash
Ma''lumotlar Sotuvchining serverida saqlanadi. Buyurtma ma''lumotlari buxgalteriya talablari doirasida saqlanadi. So''rovingiz bo''yicha akkaunt ma''lumotlari o''chiriladi — [Kontakt](/page/kontakt) sahifasidagi aloqa kanallari orqali murojaat qiling.

## Cookie
Sayt tanlangan til va mavzuni eslab qolish hamda statistika uchun cookie''lardan foydalanadi. Ularni brauzer sozlamalarida o''chirish mumkin.

## Mas''ul shaxs
[MCHJ / YaTT nomi], Toshkent shahar, Tong Yulduzi MFY, ko''prik ko''chasi, 30-uy.', content_ru='## Какие данные мы собираем
- Имя и номер телефона, указанные в форме заказа или консультации.
- При входе через Google или Telegram — имя и идентификатор в этом сервисе (только если вы входите).
- Статистика использования сайта (Yandex Metrica) — в обезличенном виде.

## Зачем
Только для выполнения заказа, связи с вами и улучшения сайта. Данные не передаются третьим лицам для рекламы.

## Хранение
Данные хранятся на сервере Продавца. Данные заказов хранятся в пределах требований бухгалтерского учёта. По вашему запросу данные аккаунта удаляются — обратитесь через каналы на странице [Контакты](/page/kontakt).

## Cookie
Сайт использует cookie для запоминания языка и темы, а также для статистики. Их можно отключить в настройках браузера.

## Ответственное лицо
[название ООО / ИП], г. Ташкент, МФЙ Тонг Юлдузи, ул. Купрук, дом 30.', content_en='', content_cyrl='', sort_order=70, is_active=1 WHERE slug='maxfiylik';
INSERT INTO pages (id, slug, title_uz, title_ru, title_en, title_cyrl, content_uz, content_ru, content_en, content_cyrl, sort_order, is_active)
  SELECT 'page-maxfiylik', 'maxfiylik', 'Maxfiylik siyosati', 'Политика конфиденциальности', 'Maxfiylik siyosati', 'Maxfiylik siyosati', '## Qanday ma''lumot yig''amiz
- Buyurtma yoki konsultatsiya formasida kiritilgan ism va telefon raqami.
- Google yoki Telegram orqali kirganda — ism va o''sha xizmatdagi identifikator (ixtiyoriy, faqat siz kirsangiz).
- Saytdan foydalanish statistikasi (Yandex Metrica) — shaxsni aniqlamaydigan ko''rinishda.

## Nima uchun
Faqat buyurtmani bajarish, siz bilan bog''lanish va saytni yaxshilash uchun. Ma''lumotlar reklama uchun uchinchi shaxslarga berilmaydi.

## Saqlash
Ma''lumotlar Sotuvchining serverida saqlanadi. Buyurtma ma''lumotlari buxgalteriya talablari doirasida saqlanadi. So''rovingiz bo''yicha akkaunt ma''lumotlari o''chiriladi — [Kontakt](/page/kontakt) sahifasidagi aloqa kanallari orqali murojaat qiling.

## Cookie
Sayt tanlangan til va mavzuni eslab qolish hamda statistika uchun cookie''lardan foydalanadi. Ularni brauzer sozlamalarida o''chirish mumkin.

## Mas''ul shaxs
[MCHJ / YaTT nomi], Toshkent shahar, Tong Yulduzi MFY, ko''prik ko''chasi, 30-uy.', '## Какие данные мы собираем
- Имя и номер телефона, указанные в форме заказа или консультации.
- При входе через Google или Telegram — имя и идентификатор в этом сервисе (только если вы входите).
- Статистика использования сайта (Yandex Metrica) — в обезличенном виде.

## Зачем
Только для выполнения заказа, связи с вами и улучшения сайта. Данные не передаются третьим лицам для рекламы.

## Хранение
Данные хранятся на сервере Продавца. Данные заказов хранятся в пределах требований бухгалтерского учёта. По вашему запросу данные аккаунта удаляются — обратитесь через каналы на странице [Контакты](/page/kontakt).

## Cookie
Сайт использует cookie для запоминания языка и темы, а также для статистики. Их можно отключить в настройках браузера.

## Ответственное лицо
[название ООО / ИП], г. Ташкент, МФЙ Тонг Юлдузи, ул. Купрук, дом 30.', '', '', 70, 1
  WHERE NOT EXISTS (SELECT 1 FROM pages WHERE slug='maxfiylik');

UPDATE pages SET is_active = 0 WHERE slug = 'yangiliklar';
UPDATE pages SET sort_order = 35 WHERE slug = 'kontakt';

UPDATE products SET is_active = 0 WHERE billz_id IS NULL AND id IN ('iphone-17-pro', 'iphone-16', 'macbook-pro', 'macbook-air', 'ipad-pro', 'imac', 'mac-mini', 'iphone-15-used', 'macbook-air-used', 'focusrite-scarlett-18i8', 'rode-nt1-5th-gen', 'rodecaster-pro-ii', 'ua-apollo-twin-x', 'adam-audio-t7v', 'genelec-8030c', 'sennheiser-hd650', 'rode-podmic', 'workstation', 'asus-tuf-gaming-a15', 'asus-proart-studiobook-16', 'asus-zenbook-14-oled', 'razer-blade-16', 'nvidia-rtx-4090', 'nzxt-player-pc', 'asus-nuc-14-pro', 'dji-ronin-4d', 'dji-osmo-pocket-3', 'dji-rs-4-pro', 'dji-osmo-action-5-pro', 'atomos-ninja', 'atomos-shinobi', 'aputure-ls-600d', 'dji-mic-2');
