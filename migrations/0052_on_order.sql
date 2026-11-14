-- «Buyurtma asosida» rejimi: tovar tugagan, lekin saytda turadi — narx yashiriladi, tugma «Oldindan buyurtma»,
-- xaridor taxminiy narxni o'zi ochib ko'radi (aniq narxni operator aytadi).
-- Billz tovarida rejim qoldiqdan chiqadi (billz_stock = 0), qo'lda kiritilgan tovarda — `on_order` belgisi.
ALTER TABLE products ADD COLUMN on_order INTEGER NOT NULL DEFAULT 0;
-- Admin kiritgan taxminiy narx; NULL — tovarning odatdagi narxi ko'rsatiladi.
-- Billz qoldig'i qaytganda sinxronizatsiya uni tozalaydi.
ALTER TABLE products ADD COLUMN approx_price_uzs INTEGER;
