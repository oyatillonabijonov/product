-- 0019: email/parol bilan mijoz autentifikatsiyasi (Google/Telegram yonida)
-- password_hash NULL bo'lsa — mijoz faqat OAuth orqali kirgan (parol o'rnatmagan).
ALTER TABLE customers ADD COLUMN password_hash TEXT;
ALTER TABLE customers ADD COLUMN password_salt TEXT;
