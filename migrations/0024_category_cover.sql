-- Kategoriya sahifasidagi cover — har bir kategoriyaning o'z rasmi va bir qatorli izohi.
--
-- Bungacha cover landing uchun kodda qotirilgan 4 ta HERO_COLUMNS'dan olinardi,
-- shuning uchun 5 ta kategoriyaga 4 ta rasm zo'rma-zo'raki taqsimlanib, "Noutbuklar"
-- sahifasida yig'ma kompyuter fotosi va matni chiqardi. Endi cover — admin
-- boshqaradigan ma'lumot; bo'sh bo'lsa sahifa oddiy sarlavha bilan ochiladi.
ALTER TABLE categories ADD COLUMN cover_url TEXT NOT NULL DEFAULT '';
ALTER TABLE categories ADD COLUMN cover_lede TEXT NOT NULL DEFAULT '';
ALTER TABLE categories ADD COLUMN cover_lede_ru TEXT NOT NULL DEFAULT '';
