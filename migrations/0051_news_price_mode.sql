-- Yangiliklar kartasidagi narx endi matndagi `{narx}` belgisi bilan emas, alohida tanlov bilan:
-- 'none' — narx yo'q, 'product' — tugma olib boradigan tovarning joriy narxi, 'manual' — `price_uzs`.
-- Karta narxni o'zi yozadi («… so'm dan» / «От … сум»), admin matnga hech narsa qo'shmaydi.
ALTER TABLE news ADD COLUMN price_mode TEXT NOT NULL DEFAULT 'none';
ALTER TABLE news ADD COLUMN price_uzs INTEGER;

-- Belgi bilan yozilgan kartalar yangi ko'rinishga: «{narx} dan. » (11 belgi) va «От {narx}. » (10 belgi) matn boshidan olinadi.
UPDATE news SET price_mode = 'product', text = trim(substr(text, 12))
WHERE text LIKE '{narx} dan.%' AND link_url LIKE '/product/%';
UPDATE news SET text_ru = trim(substr(text_ru, 11))
WHERE price_mode = 'product' AND text_ru LIKE 'От {narx}.%';
