-- Billz'dagi nom alohida saqlanadi (2026-09-24). Sinxronizatsiya tovarni shu nom bo'yicha topadi,
-- saytdagi `name` esa endi qo'lda qulflanadi (`manual_fields` ichida `name`). Busiz qayta nomlangan
-- tovar Billz'dagi boshqa bir xil nomli tovar bilan adashib, uning narx va qoldig'ini olib qo'yardi.
-- To'ldirish aniq: shu kungacha saytdagi nom har run'da Billz nomi bilan qayta yozilardi.
ALTER TABLE products ADD COLUMN billz_name TEXT;
UPDATE products SET billz_name = name WHERE billz_id IS NOT NULL;
