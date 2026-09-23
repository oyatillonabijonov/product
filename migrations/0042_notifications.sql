-- Mijoz bildirishnomalari.
--
-- Ikki tur bitta jadvalda:
--   `order_status` — matn saqlanmaydi, faqat `order_id` va yangi `status`; yozuv
--     ko'rsatish paytida `locales.ts` dan chiziladi, shuning uchun so'zlashni keyin
--     o'zgartirsangiz eski bildirishnomalar ham yangilanadi va tarjima bitta joyda qoladi.
--   `announce` — admin yozgan e'lon, matni saqlanadi (uni locales'dan chiqarib bo'lmaydi).
CREATE TABLE notifications (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER NOT NULL,
  kind        TEXT NOT NULL,
  order_id    INTEGER,
  status      TEXT,
  title_uz    TEXT NOT NULL DEFAULT '',
  title_ru    TEXT NOT NULL DEFAULT '',
  body_uz     TEXT NOT NULL DEFAULT '',
  body_ru     TEXT NOT NULL DEFAULT '',
  link        TEXT NOT NULL DEFAULT '',
  read_at     INTEGER,
  created_at  INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX idx_notifications_customer ON notifications (customer_id, id DESC);
CREATE INDEX idx_notifications_unread ON notifications (customer_id) WHERE read_at IS NULL;
