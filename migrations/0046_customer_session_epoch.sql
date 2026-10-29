-- Mijoz sessiyasini serverda bekor qilish: cookie imzosidagi mavzu `"<id>:<davr>"`,
-- chiqishda davr oshadi va shu mijozning hamma chiqarilgan tokenlari o'ladi.
-- Davrsiz eski cookie'lar (`"<id>"`) qabul qilinmaydi — mijozlar bir marta qayta kiradi.
ALTER TABLE customers ADD COLUMN session_epoch INTEGER NOT NULL DEFAULT 0;
