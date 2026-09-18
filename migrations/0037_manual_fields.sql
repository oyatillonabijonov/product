-- Billz tovarining qo'lda tahrirlangan maydonlari.
-- Billz'da tavsif/xususiyat ko'pincha to'liq emas — egasi ularni admin'da yozadi va
-- shu ro'yxatdagi ustunlarga sinxronizatsiya boshqa tegmaydi (qolgani avvalgidek oqadi:
-- nom, qoldiq, ko'rinish, rasm, brend, tur). Qiymat — vergul bilan: price, specs, description.
ALTER TABLE products ADD COLUMN manual_fields TEXT NOT NULL DEFAULT '';
