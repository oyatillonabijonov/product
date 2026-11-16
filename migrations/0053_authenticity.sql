-- Asllik belgisi: narx ustidagi «Original» endi har tovarda tanlanadi (egasining talabi).
-- 'original' (sukut — hozirgi holat) · 'replica' · 'none' (belgi chiqmaydi: no-name tovar).
ALTER TABLE products ADD COLUMN authenticity TEXT NOT NULL DEFAULT 'original';
