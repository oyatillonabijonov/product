-- Kategoriyalar do'konning 4 yo'nalishiga aylandi.
--
-- Bungacha ular qurilma turi edi (Telefonlar, Noutbuklar, Planshetlar,
-- Kompyuterlar, Aksessuarlar) — do'konning haqiqiy tuzilishi esa boshqa:
-- Apple / PC (Windows segmenti) / professional Audio / professional Video.
-- Landingdagi 4 ta yo'nalish kartasi shu sabab Audio va Video uchun sahifasiz
-- qolib, /katalog'ga tushardi va cover'siz ochilardi.
--
-- Cover rasmi kodda (src/store/hero-columns.ts) — kategoriya id'si yo'nalish
-- id'si bilan bir xil bo'lgani uchun har sahifa o'z rasmi bilan ochiladi;
-- admin xohlasa `cover_url` orqali o'z rasmini yuklab ustidan yozadi.
INSERT INTO categories (id, name, name_ru, icon_url, icon, cover_url, cover_lede, cover_lede_ru, sort_order) VALUES
  ('apple', 'Apple',  'Apple',  '', 'smartphone', '', '', '', 10),
  ('pc',    'PC',     'PC',     '', 'monitor',    '', '', '', 20),
  ('audio', 'Audio',  'Audio',  '', 'headphones', '', '', '', 30),
  ('video', 'Video',  'Video',  '', 'camera',     '', '', '', 40);

-- Mahsulotlarni ko'chirish: avval Apple brendi, keyin qolgan kompyuter/noutbuk
-- PC'ga. Qaysi yo'nalishga tegishli ekani noaniqlari bo'sh qoladi — adminda
-- qo'lda biriktiriladi (yo'nalish tanlash brend/tur bo'yicha avtomatlashmaydi).
UPDATE products SET category_id = 'apple' WHERE brand_id = 'apple';
UPDATE products SET category_id = 'pc'
  WHERE category_id IN ('kompyuterlar', 'noutbuklar') AND (brand_id IS NULL OR brand_id <> 'apple');
UPDATE products SET category_id = NULL
  WHERE category_id IN ('telefonlar', 'noutbuklar', 'planshetlar', 'kompyuterlar', 'aksessuarlar');

DELETE FROM categories WHERE id IN ('telefonlar', 'noutbuklar', 'planshetlar', 'kompyuterlar', 'aksessuarlar');
