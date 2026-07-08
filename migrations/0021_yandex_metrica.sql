-- Yandex Metrica hisoblagich id (raqam, ommaviy) — analitika har do'kon uchun admin
-- "Sayt ma'lumotlari"dan kiritiladi. Bo'sh = analitika o'chiq (skript umuman yuklanmaydi).
ALTER TABLE site_config ADD COLUMN yandex_metrica_id TEXT NOT NULL DEFAULT '';
