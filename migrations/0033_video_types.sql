-- Turlar registri (shared/product-types.ts) yangilandi: Video'da "Monitor / rekorder"
-- o'rniga "Post-production", "Dron" olib tashlandi; "Action kamera", "Shtativ",
-- "Xotira kartasi" qo'shildi. Registrda yo'q tur admin formada `type_invalid` berardi.
-- Billz tovarlari keyingi sinxronizatsiyada o'zi qayta taqsimlanadi — bu faqat qo'lda
-- kiritilganlar (namuna mahsulotlar) uchun.
UPDATE products SET type = NULL            WHERE category_id = 'video' AND type IN ('monitor-rekorder', 'dron');
UPDATE products SET type = 'action-kamera' WHERE category_id = 'video' AND name LIKE '%Osmo Action%';
