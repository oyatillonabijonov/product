-- 0020: admin Google sign-in — faqat shu email admin sifatida kira oladi.
-- Bo'sh ('') bo'lsa Google admin kirishi butunlay o'chiq (default). Parol kirishi doim ishlaydi.
ALTER TABLE admin_auth ADD COLUMN admin_google_email TEXT NOT NULL DEFAULT '';
