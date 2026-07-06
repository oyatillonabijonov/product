-- Bosqich 3: mijoz autentifikatsiyasi (Google + Telegram OAuth) + akkaunt
ALTER TABLE orders ADD COLUMN customer_id INTEGER;

ALTER TABLE site_config ADD COLUMN google_client_id       TEXT NOT NULL DEFAULT '';
ALTER TABLE site_config ADD COLUMN google_client_secret   TEXT NOT NULL DEFAULT '';
ALTER TABLE site_config ADD COLUMN telegram_login_bot     TEXT NOT NULL DEFAULT '';
ALTER TABLE site_config ADD COLUMN customer_session_secret TEXT NOT NULL DEFAULT '';

CREATE TABLE customers (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at  INTEGER NOT NULL DEFAULT (unixepoch()),
  name        TEXT NOT NULL DEFAULT '',
  phone       TEXT,
  email       TEXT,
  google_sub  TEXT UNIQUE,
  telegram_id TEXT UNIQUE
);
