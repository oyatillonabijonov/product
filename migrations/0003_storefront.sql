CREATE TABLE categories (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  icon_url   TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE product_images (
  id         TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  image_url  TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_product_images_product ON product_images(product_id);

CREATE TABLE product_specs (
  id         TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  label      TEXT NOT NULL,
  value      TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_product_specs_product ON product_specs(product_id);

ALTER TABLE products ADD COLUMN category_id TEXT;
ALTER TABLE products ADD COLUMN old_price_uzs INTEGER;
ALTER TABLE products ADD COLUMN description TEXT;

INSERT INTO categories (id, name, icon_url, sort_order) VALUES
  ('telefonlar',  'Telefonlar',  '', 10),
  ('noutbuklar',  'Noutbuklar',  '', 20),
  ('planshetlar', 'Planshetlar', '', 30),
  ('kompyuterlar','Kompyuterlar','', 40),
  ('aksessuarlar','Aksessuarlar','', 50);

UPDATE products SET category_id = 'telefonlar'  WHERE category = 'iphone';
UPDATE products SET category_id = 'noutbuklar'  WHERE category = 'mac' AND id LIKE '%macbook%';
UPDATE products SET category_id = 'planshetlar' WHERE category = 'ipad';
UPDATE products SET category_id = 'kompyuterlar' WHERE category = 'pc' OR (category = 'mac' AND id NOT LIKE '%macbook%');
