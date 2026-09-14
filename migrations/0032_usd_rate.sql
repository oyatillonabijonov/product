-- Dollar kursi Markaziy bankdan (cbu.uz) + do'kon ustamasi (server/usd-rate.ts).
-- usd_markup_percent NULL = avtomatik kurs o'chiq: usd_to_uzs qo'lda qoladi — deploy'da
-- Billz tovarlarining so'm narxlari o'zidan o'zgarib ketmasin.
ALTER TABLE settings ADD COLUMN usd_markup_percent REAL;
ALTER TABLE settings ADD COLUMN usd_cbu_rate REAL;
ALTER TABLE settings ADD COLUMN usd_rate_date TEXT NOT NULL DEFAULT '';
