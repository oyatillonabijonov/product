-- queryProducts filtr/sort ustunlari uchun indekslar: hozirgi katalog hajmida
-- shart emas, lekin o'sishda full-scan'ning oldini oladi (bepul, yozuvlar kam).
CREATE INDEX IF NOT EXISTS idx_products_active_category ON products (is_active, category_id);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products (created_at);
-- min-variant-price subquery uchun covering indeks (mavjud idx_variants_product faqat product_id).
CREATE INDEX IF NOT EXISTS idx_variants_product_stock_price ON product_variants (product_id, in_stock, cash_price_uzs);
