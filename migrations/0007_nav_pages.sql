-- Navbar content pages: Trade-In and Yangiliklar (news). Placeholder NAMUNA text — edit via admin.
INSERT INTO pages (id, slug, title_uz, title_ru, title_en, title_cyrl, content_uz, content_ru, content_en, content_cyrl, sort_order, is_active) VALUES
('page-trade-in', 'trade-in',
 'Trade-In', 'Trade-In', 'Trade-In', 'Trade-In',
 '## Eski qurilmangizni yangisiga almashtiring' || char(10) || 'Eski telefoningizni olib kelib, narxini yangi qurilma to''loviga hisobga qo''shamiz. (NAMUNA matn — admin orqali almashtiring.)',
 '## Обменяйте старое устройство на новое' || char(10) || 'Принесите старый телефон — его стоимость зачтём в оплату нового устройства. (ОБРАЗЕЦ — замените в админке.)',
 '## Trade in your old device for a new one' || char(10) || 'Bring your old phone and we will credit its value toward a new device. (SAMPLE — replace via admin.)',
 '## Эски қурилмангизни янгисига алмаштиринг' || char(10) || 'Эски телефонингизни олиб келинг — нархини янги қурилма тўловига қўшамиз. (НАМУНА — админ орқали алмаштиринг.)',
 3, 1),
('page-yangiliklar', 'yangiliklar',
 'Yangiliklar', 'Новости', 'News', 'Янгиликлар',
 '## So''nggi yangiliklar' || char(10) || 'Aksiyalar, yangi mahsulotlar va do''kon yangiliklari shu yerda e''lon qilinadi. (NAMUNA matn — admin orqali almashtiring.)',
 '## Последние новости' || char(10) || 'Акции, новинки и новости магазина публикуются здесь. (ОБРАЗЕЦ — замените в админке.)',
 '## Latest news' || char(10) || 'Promotions, new arrivals and store updates are posted here. (SAMPLE — replace via admin.)',
 '## Сўнгги янгиликлар' || char(10) || 'Акциялар, янги маҳсулотлар ва дўкон янгиликлари шу ерда эълон қилинади. (НАМУНА — админ орқали алмаштиринг.)',
 4, 1);
