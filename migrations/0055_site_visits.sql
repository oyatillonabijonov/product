-- Sayt tashriflari — admin bosh sahifasidagi grafiklar uchun (`server/visits.ts` yozadi).
--
-- `day` — Toshkent sanasi `YYYY-MM-DD` (UTC+5, yozgi vaqt yo'q). Faqat kunlik yig'indi saqlanadi:
-- IP va brauzer ma'lumoti bazaga tushmaydi, noyob mehmonlar xotirada sanaladi.
CREATE TABLE site_visits (
  day      TEXT PRIMARY KEY,
  views    INTEGER NOT NULL DEFAULT 0,
  visitors INTEGER NOT NULL DEFAULT 0
);

-- Mahsulot sahifasi ochilishlari, kun bo'yicha — «eng ko'p ko'rilgan» ro'yxati shundan.
CREATE TABLE product_views (
  product_id TEXT NOT NULL,
  day        TEXT NOT NULL,
  views      INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (product_id, day)
);
CREATE INDEX idx_product_views_day ON product_views (day);
