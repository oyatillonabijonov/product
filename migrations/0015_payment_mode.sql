-- Bosqich 1: sozlanadigan to'lov rejimi + boshlang'ich to'lov maksimumi (slider)
ALTER TABLE settings ADD COLUMN down_payment_max_percent REAL NOT NULL DEFAULT 90;
ALTER TABLE site_config ADD COLUMN payment_mode TEXT NOT NULL DEFAULT 'both';
