-- Tovar turi — yo'nalish ichidagi bo'linish (iPhone, GPU, Mikrofon ...).
-- Ro'yxatning o'zi kodda: shared/product-types.ts. Bu yerda faqat ustun va
-- mavjud mahsulotlarning bir martalik taqsimoti.
ALTER TABLE products ADD COLUMN type TEXT;

-- Apple
UPDATE products SET type = 'iphone'   WHERE category_id = 'apple' AND name LIKE 'iPhone%';
UPDATE products SET type = 'ipad'     WHERE category_id = 'apple' AND name LIKE 'iPad%';
UPDATE products SET type = 'macbook'  WHERE category_id = 'apple' AND name LIKE 'MacBook%';
UPDATE products SET type = 'imac'     WHERE category_id = 'apple' AND name LIKE 'iMac%';
UPDATE products SET type = 'mac-mini' WHERE category_id = 'apple' AND name LIKE 'Mac Mini%';

-- PC
UPDATE products SET type = 'noutbuk'   WHERE category_id = 'pc' AND (
  name LIKE '%TUF%' OR name LIKE '%Studiobook%' OR name LIKE '%Zenbook%' OR name LIKE '%Blade%');
UPDATE products SET type = 'gpu'       WHERE category_id = 'pc' AND name LIKE '%GeForce%';
UPDATE products SET type = 'tayyor-pc' WHERE category_id = 'pc' AND type IS NULL AND (
  name LIKE '%PC%' OR name LIKE '%NUC%');

-- Audio
UPDATE products SET type = 'mikrofon'       WHERE category_id = 'audio' AND (name LIKE '%NT1%' OR name LIKE '%PodMic%');
UPDATE products SET type = 'studio-monitor' WHERE category_id = 'audio' AND (name LIKE '%T7V%' OR name LIKE '%8030%');
UPDATE products SET type = 'naushnik'       WHERE category_id = 'audio' AND name LIKE '%HD 650%';
UPDATE products SET type = 'interfeys'      WHERE category_id = 'audio' AND (name LIKE '%Scarlett%' OR name LIKE '%Apollo%');
UPDATE products SET type = 'mikser'         WHERE category_id = 'audio' AND name LIKE '%RODECaster%';

-- Video
UPDATE products SET type = 'kamera'           WHERE category_id = 'video' AND (
  name LIKE '%Ronin 4D%' OR name LIKE '%Osmo Pocket%' OR name LIKE '%Osmo Action%');
UPDATE products SET type = 'stabilizator'     WHERE category_id = 'video' AND name LIKE '%RS 4%';
UPDATE products SET type = 'yoruglik'         WHERE category_id = 'video' AND name LIKE '%Aputure%';
UPDATE products SET type = 'monitor-rekorder' WHERE category_id = 'video' AND name LIKE '%Atomos%';
UPDATE products SET type = 'mikrofon'         WHERE category_id = 'video' AND name LIKE '%Mic 2%';
