-- Mijozga ko'rsatish uchun: iPhone 18 Pro ($1 499 dan) va iPhone Duo (pre-order) —
-- Apple'ning rasmiy renderlari (public/products/iphone/), landing Yangiliklar'ida ham.
-- Narxlar $ × 12 600 (settings.usd_to_uzs); admin'da tahrirlanadi.

-- Pre-order belgisi: sahifada "Yangi" o'rniga "Pre-order" yorlig'i, qoldiq yozuvi va tugma matni.
ALTER TABLE products ADD COLUMN preorder INTEGER NOT NULL DEFAULT 0;

-- iPhone 18 Pro
INSERT INTO products (id, name, category, condition, condition_note, cash_price_uzs, image_url, sort_order, is_active, created_at, category_id, description, brand_id, slug, type) VALUES ('iphone-18-pro', 'iPhone 18 Pro', 'iphone', 'yangi', NULL, 18887400, '/products/iphone/18-pro.webp', -20, 1, strftime('%s','now'), 'apple', 'iPhone 18 Pro — Apple''ning 2026-yilgi flagmani: professional kamera tizimi, yangi A20 Pro chipi va kun bo''yi yetadigan batareya bitta ixcham korpusda.

Ekran. 6.3 dyuymli Super Retina XDR, ProMotion texnologiyasi bilan 120 Gts gacha — aylantirish, o''yin va video silliq. Always-On rejimi va yuqori yorqinlik tufayli quyosh ostida ham aniq o''qiladi.

Unumdorlik. A20 Pro chipi og''ir ilovalar, 4K video montaj va Apple Intelligence funksiyalarini qurilmaning o''zida tez bajaradi; energiya tejamkorligi batareyani uzoqroq ushlab turadi.

Kamera. Uch kamerali Pro tizim: asosiy, ultra-keng va telefoto. ProRAW va ProRes formatlari, tungi rejim va kinematografik video — professional kontent uchun tayyor.

Korpus va ulanish. Mustahkam korpus, suv va changdan himoya, USB-C port, Nano-SIM + eSIM.

Ranglar: Black, Silver, Glacier Blue, Burgundy. Xotira: 256GB dan 2TB gacha.

Rasmiy import va Apple kafolati. Xariddan keyin qurilmani mutaxassisimiz bepul sozlab beradi.', 'apple', 'iphone-18-pro', 'iphone');
INSERT INTO product_images (id, product_id, image_url, sort_order) VALUES
  ('iphone-18-pro-img-0', 'iphone-18-pro', '/products/iphone/18-pro.webp', 0),
  ('iphone-18-pro-img-1', 'iphone-18-pro', '/products/iphone/18-pro-qora.webp', 1),
  ('iphone-18-pro-img-2', 'iphone-18-pro', '/products/iphone/18-pro-kumush.webp', 2),
  ('iphone-18-pro-img-3', 'iphone-18-pro', '/products/iphone/18-pro-kok.webp', 3),
  ('iphone-18-pro-img-4', 'iphone-18-pro', '/products/iphone/18-pro-qizil.webp', 4);
INSERT INTO product_specs (id, product_id, label, value, sort_order) VALUES
  ('iphone-18-pro-spec-0', 'iphone-18-pro', 'Ekran', '6.3" Super Retina XDR, 120 Gts', 0),
  ('iphone-18-pro-spec-1', 'iphone-18-pro', 'Protsessor', 'Apple A20 Pro', 1),
  ('iphone-18-pro-spec-2', 'iphone-18-pro', 'Kamera', '3 ta orqa kamera (Pro tizim)', 2),
  ('iphone-18-pro-spec-3', 'iphone-18-pro', 'SIM', 'Nano-SIM + eSIM', 3),
  ('iphone-18-pro-spec-4', 'iphone-18-pro', 'Port', 'USB-C', 4);
INSERT INTO product_options (id, product_id, name, sort_order) VALUES ('iphone-18-pro-xotira', 'iphone-18-pro', 'Xotira', 0), ('iphone-18-pro-rang', 'iphone-18-pro', 'Rang', 1);
INSERT INTO product_option_values (id, option_id, value, sort_order) VALUES
  ('iphone-18-pro-x0', 'iphone-18-pro-xotira', '256GB', 0),
  ('iphone-18-pro-x1', 'iphone-18-pro-xotira', '512GB', 1),
  ('iphone-18-pro-x2', 'iphone-18-pro-xotira', '1TB', 2),
  ('iphone-18-pro-x3', 'iphone-18-pro-xotira', '2TB', 3),
  ('iphone-18-pro-r0', 'iphone-18-pro-rang', 'Black', 0),
  ('iphone-18-pro-r1', 'iphone-18-pro-rang', 'Silver', 1),
  ('iphone-18-pro-r2', 'iphone-18-pro-rang', 'Glacier Blue', 2),
  ('iphone-18-pro-r3', 'iphone-18-pro-rang', 'Burgundy', 3);
INSERT INTO product_variants (id, product_id, cash_price_uzs, image_url, in_stock, sort_order) VALUES
  ('iphone-18-pro-v00', 'iphone-18-pro', 18887400, '/products/iphone/18-pro-qora.webp', 1, 0),
  ('iphone-18-pro-v01', 'iphone-18-pro', 18887400, '/products/iphone/18-pro-kumush.webp', 1, 1),
  ('iphone-18-pro-v02', 'iphone-18-pro', 18887400, '/products/iphone/18-pro-kok.webp', 1, 2),
  ('iphone-18-pro-v03', 'iphone-18-pro', 18887400, '/products/iphone/18-pro-qizil.webp', 1, 3),
  ('iphone-18-pro-v10', 'iphone-18-pro', 21407400, '/products/iphone/18-pro-qora.webp', 1, 10),
  ('iphone-18-pro-v11', 'iphone-18-pro', 21407400, '/products/iphone/18-pro-kumush.webp', 1, 11),
  ('iphone-18-pro-v12', 'iphone-18-pro', 21407400, '/products/iphone/18-pro-kok.webp', 1, 12),
  ('iphone-18-pro-v13', 'iphone-18-pro', 21407400, '/products/iphone/18-pro-qizil.webp', 1, 13),
  ('iphone-18-pro-v20', 'iphone-18-pro', 23927400, '/products/iphone/18-pro-qora.webp', 1, 20),
  ('iphone-18-pro-v21', 'iphone-18-pro', 23927400, '/products/iphone/18-pro-kumush.webp', 1, 21),
  ('iphone-18-pro-v22', 'iphone-18-pro', 23927400, '/products/iphone/18-pro-kok.webp', 1, 22),
  ('iphone-18-pro-v23', 'iphone-18-pro', 23927400, '/products/iphone/18-pro-qizil.webp', 1, 23),
  ('iphone-18-pro-v30', 'iphone-18-pro', 28967400, '/products/iphone/18-pro-qora.webp', 1, 30),
  ('iphone-18-pro-v31', 'iphone-18-pro', 28967400, '/products/iphone/18-pro-kumush.webp', 1, 31),
  ('iphone-18-pro-v32', 'iphone-18-pro', 28967400, '/products/iphone/18-pro-kok.webp', 1, 32),
  ('iphone-18-pro-v33', 'iphone-18-pro', 28967400, '/products/iphone/18-pro-qizil.webp', 1, 33);
INSERT INTO variant_option_values (variant_id, option_value_id) VALUES
  ('iphone-18-pro-v00', 'iphone-18-pro-x0'), ('iphone-18-pro-v00', 'iphone-18-pro-r0'),
  ('iphone-18-pro-v01', 'iphone-18-pro-x0'), ('iphone-18-pro-v01', 'iphone-18-pro-r1'),
  ('iphone-18-pro-v02', 'iphone-18-pro-x0'), ('iphone-18-pro-v02', 'iphone-18-pro-r2'),
  ('iphone-18-pro-v03', 'iphone-18-pro-x0'), ('iphone-18-pro-v03', 'iphone-18-pro-r3'),
  ('iphone-18-pro-v10', 'iphone-18-pro-x1'), ('iphone-18-pro-v10', 'iphone-18-pro-r0'),
  ('iphone-18-pro-v11', 'iphone-18-pro-x1'), ('iphone-18-pro-v11', 'iphone-18-pro-r1'),
  ('iphone-18-pro-v12', 'iphone-18-pro-x1'), ('iphone-18-pro-v12', 'iphone-18-pro-r2'),
  ('iphone-18-pro-v13', 'iphone-18-pro-x1'), ('iphone-18-pro-v13', 'iphone-18-pro-r3'),
  ('iphone-18-pro-v20', 'iphone-18-pro-x2'), ('iphone-18-pro-v20', 'iphone-18-pro-r0'),
  ('iphone-18-pro-v21', 'iphone-18-pro-x2'), ('iphone-18-pro-v21', 'iphone-18-pro-r1'),
  ('iphone-18-pro-v22', 'iphone-18-pro-x2'), ('iphone-18-pro-v22', 'iphone-18-pro-r2'),
  ('iphone-18-pro-v23', 'iphone-18-pro-x2'), ('iphone-18-pro-v23', 'iphone-18-pro-r3'),
  ('iphone-18-pro-v30', 'iphone-18-pro-x3'), ('iphone-18-pro-v30', 'iphone-18-pro-r0'),
  ('iphone-18-pro-v31', 'iphone-18-pro-x3'), ('iphone-18-pro-v31', 'iphone-18-pro-r1'),
  ('iphone-18-pro-v32', 'iphone-18-pro-x3'), ('iphone-18-pro-v32', 'iphone-18-pro-r2'),
  ('iphone-18-pro-v33', 'iphone-18-pro-x3'), ('iphone-18-pro-v33', 'iphone-18-pro-r3');

-- iPhone Duo
INSERT INTO products (id, name, category, condition, condition_note, cash_price_uzs, image_url, sort_order, is_active, created_at, category_id, description, brand_id, slug, type, preorder) VALUES ('iphone-duo', 'iPhone Duo', 'iphone', 'yangi', NULL, 30227400, '/products/iphone/duo.webp', -30, 1, strftime('%s','now'), 'apple', 'iPhone Duo — Apple''ning birinchi katlanuvchi iPhone''i. Yopiq holatda cho''ntakka sig''adigan odatiy telefon, ochilganda esa kitob, jadval va video uchun katta ekran.

Ikki ekran. Tashqi ekran kundalik ishlar uchun, ichki katlanuvchi ekran — ikki ilova bilan bir vaqtda ishlash, hujjat va suratlarni tahrirlash uchun. iOS ochilish va yopilishga moslashadi: ilova kichik ekrandan kattasiga uzilmasdan o''tadi.

Kamera. Ikki kamerali orqa tizim — kundalik surat va video uchun Apple''ning to''liq kamera imkoniyatlari.

Ulanish. eSIM, USB-C.

Ranglar: Night Sky, Star White. Xotira: 256GB, 512GB, 1TB.

Pre-order. iPhone Duo hozir oldindan buyurtmada. Buyurtma qoldiring — rasmiy sotuv boshlanishi bilan birinchilar qatorida yetkazamiz; narx va muddatni operator qo''ng''iroq qilib tasdiqlaydi.', 'apple', 'iphone-duo', 'iphone', 1);
INSERT INTO product_images (id, product_id, image_url, sort_order) VALUES
  ('iphone-duo-img-0', 'iphone-duo', '/products/iphone/duo.webp', 0),
  ('iphone-duo-img-1', 'iphone-duo', '/products/iphone/duo-ochiq.webp', 1),
  ('iphone-duo-img-2', 'iphone-duo', '/products/iphone/duo-osmon.webp', 2),
  ('iphone-duo-img-3', 'iphone-duo', '/products/iphone/duo-oq.webp', 3),
  ('iphone-duo-img-4', 'iphone-duo', '/products/iphone/duo-yon.webp', 4),
  ('iphone-duo-img-5', 'iphone-duo', '/products/iphone/duo-qolda.webp', 5);
INSERT INTO product_specs (id, product_id, label, value, sort_order) VALUES
  ('iphone-duo-spec-0', 'iphone-duo', 'Tur', 'Katlanuvchi smartfon', 0),
  ('iphone-duo-spec-1', 'iphone-duo', 'Ekran', 'Ichki katlanuvchi + tashqi ekran', 1),
  ('iphone-duo-spec-2', 'iphone-duo', 'Kamera', '2 ta orqa kamera', 2),
  ('iphone-duo-spec-3', 'iphone-duo', 'SIM', 'eSIM', 3),
  ('iphone-duo-spec-4', 'iphone-duo', 'Port', 'USB-C', 4);
INSERT INTO product_options (id, product_id, name, sort_order) VALUES ('iphone-duo-xotira', 'iphone-duo', 'Xotira', 0), ('iphone-duo-rang', 'iphone-duo', 'Rang', 1);
INSERT INTO product_option_values (id, option_id, value, sort_order) VALUES
  ('iphone-duo-x0', 'iphone-duo-xotira', '256GB', 0),
  ('iphone-duo-x1', 'iphone-duo-xotira', '512GB', 1),
  ('iphone-duo-x2', 'iphone-duo-xotira', '1TB', 2),
  ('iphone-duo-r0', 'iphone-duo-rang', 'Night Sky', 0),
  ('iphone-duo-r1', 'iphone-duo-rang', 'Star White', 1);
INSERT INTO product_variants (id, product_id, cash_price_uzs, image_url, in_stock, sort_order) VALUES
  ('iphone-duo-v00', 'iphone-duo', 30227400, '/products/iphone/duo-osmon.webp', 1, 0),
  ('iphone-duo-v01', 'iphone-duo', 30227400, '/products/iphone/duo-oq.webp', 1, 1),
  ('iphone-duo-v10', 'iphone-duo', 32747400, '/products/iphone/duo-osmon.webp', 1, 10),
  ('iphone-duo-v11', 'iphone-duo', 32747400, '/products/iphone/duo-oq.webp', 1, 11),
  ('iphone-duo-v20', 'iphone-duo', 35267400, '/products/iphone/duo-osmon.webp', 1, 20),
  ('iphone-duo-v21', 'iphone-duo', 35267400, '/products/iphone/duo-oq.webp', 1, 21);
INSERT INTO variant_option_values (variant_id, option_value_id) VALUES
  ('iphone-duo-v00', 'iphone-duo-x0'), ('iphone-duo-v00', 'iphone-duo-r0'),
  ('iphone-duo-v01', 'iphone-duo-x0'), ('iphone-duo-v01', 'iphone-duo-r1'),
  ('iphone-duo-v10', 'iphone-duo-x1'), ('iphone-duo-v10', 'iphone-duo-r0'),
  ('iphone-duo-v11', 'iphone-duo-x1'), ('iphone-duo-v11', 'iphone-duo-r1'),
  ('iphone-duo-v20', 'iphone-duo-x2'), ('iphone-duo-v20', 'iphone-duo-r0'),
  ('iphone-duo-v21', 'iphone-duo-x2'), ('iphone-duo-v21', 'iphone-duo-r1');

-- Landing Yangiliklar: ikkalasi boshga (birinchi 3 tasi chiqadi).
INSERT INTO news (id, badge, badge_ru, tag, tag_ru, title, title_ru, text, text_ru, cta, cta_ru, link_url, image_url, sort_order, is_active) VALUES
  ('iphone-duo', 'Yangi', 'Новинка', 'Pre-order', 'Предзаказ', 'iPhone Duo', 'iPhone Duo', 'Birinchi katlanuvchi iPhone. Oldindan buyurtma qabul qilinmoqda.', 'Первый складной iPhone. Принимаем предзаказы.', 'Pre-order', 'Предзаказать', '/product/iphone-duo', '/products/iphone/duo.webp', -20, 1),
  ('iphone-18-pro', 'Yangi', 'Новинка', 'Sotuvda', 'В продаже', 'iPhone 18 Pro', 'iPhone 18 Pro', '$1 499 dan. To''rt rangda, 2TB gacha.', 'От $1 499. Четыре цвета, до 2 ТБ.', 'Xarid qilish', 'Купить', '/product/iphone-18-pro', '/products/iphone/18-pro.webp', -10, 1);
