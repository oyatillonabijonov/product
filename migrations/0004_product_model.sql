CREATE TABLE brands (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  slug       TEXT NOT NULL UNIQUE,
  logo_url   TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0
);

ALTER TABLE products ADD COLUMN brand_id TEXT;   -- nullable, brands.id
ALTER TABLE products ADD COLUMN slug TEXT;        -- unique index quyida

CREATE UNIQUE INDEX idx_products_slug ON products(slug) WHERE slug IS NOT NULL;
CREATE INDEX idx_products_brand ON products(brand_id);

CREATE TABLE product_options (
  id         TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  name       TEXT NOT NULL,            -- "Rang", "Xotira", "SIM"
  sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_product_options_product ON product_options(product_id);

CREATE TABLE product_option_values (
  id         TEXT PRIMARY KEY,
  option_id  TEXT NOT NULL,
  value      TEXT NOT NULL,            -- "Qora", "256GB"
  sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_option_values_option ON product_option_values(option_id);

CREATE TABLE product_variants (
  id            TEXT PRIMARY KEY,
  product_id    TEXT NOT NULL,
  sku           TEXT,                  -- ixtiyoriy
  cash_price_uzs INTEGER NOT NULL,
  old_price_uzs INTEGER,
  image_url     TEXT,                  -- bo'sh bo'lsa mahsulot rasmi
  in_stock      INTEGER NOT NULL DEFAULT 1,
  sort_order    INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_variants_product ON product_variants(product_id);

CREATE TABLE variant_option_values (
  variant_id      TEXT NOT NULL,
  option_value_id TEXT NOT NULL,
  PRIMARY KEY (variant_id, option_value_id)
);

-- Seed: brendlar + mavjud mahsulotlarga brand/slug
INSERT INTO brands (id, name, slug, logo_url, sort_order) VALUES
  ('apple', 'Apple', 'apple', '', 10),
  ('samsung', 'Samsung', 'samsung', '', 20),
  ('xiaomi', 'Xiaomi', 'xiaomi', '', 30);
UPDATE products SET brand_id = 'apple' WHERE category IN ('iphone','mac','ipad');
UPDATE products SET slug = id;   -- mavjud id'lar allaqachon slug-shaklida
