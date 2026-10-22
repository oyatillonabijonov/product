-- Mahsulot tavsifining ruscha matni. Bo'sh (NULL) bo'lsa /ru sahifasida o'zbekcha `description` ko'rsatiladi.
-- Billz sinxronizatsiyasi bu ustunga tegmaydi.
ALTER TABLE products ADD COLUMN description_ru TEXT;
