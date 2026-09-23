-- Mijoz avatari (`bot-avatars`): shakl + yuz, bitta satrda — "clover.mouth".
-- NULL = avtomatik: shakl `id` dan hisoblanadi (shared/avatar.ts `autoAvatar`), shuning uchun
-- ro'yxatdan o'tish yo'llariga tegilmaydi va mavjud mijozlar ham darhol avatarli bo'ladi.
-- Yozuv faqat foydalanuvchi kabinetda o'zi tanlaganda paydo bo'ladi.
ALTER TABLE customers ADD COLUMN avatar TEXT;
