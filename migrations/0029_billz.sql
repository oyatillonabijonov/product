-- Billz (billz.io) integratsiyasi — faqat o'qish sinxronizatsiyasi.
-- Sozlamalar site_config'da (token SIR, publicSiteConfig bo'shatadi), tovar
-- bog'lanishi products.billz_id. Ro'yxat va qoidalar: shared/billz.ts.
ALTER TABLE site_config ADD COLUMN billz_secret_token TEXT NOT NULL DEFAULT '';
ALTER TABLE site_config ADD COLUMN billz_shop_id      TEXT NOT NULL DEFAULT '';
ALTER TABLE site_config ADD COLUMN billz_last_sync    TEXT NOT NULL DEFAULT '';
ALTER TABLE products ADD COLUMN billz_id    TEXT;
ALTER TABLE products ADD COLUMN billz_stock INTEGER;
CREATE UNIQUE INDEX idx_products_billz_id ON products(billz_id) WHERE billz_id IS NOT NULL;
