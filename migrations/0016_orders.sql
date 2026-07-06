-- Bosqich 2: one-click buyurtma — orders jadvali + Telegram bot konfiguratsiyasi
ALTER TABLE site_config ADD COLUMN telegram_bot_token TEXT NOT NULL DEFAULT '';
ALTER TABLE site_config ADD COLUMN telegram_order_chat_id TEXT NOT NULL DEFAULT '';

CREATE TABLE orders (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at       INTEGER NOT NULL DEFAULT (unixepoch()),
  name             TEXT NOT NULL,
  phone            TEXT NOT NULL,
  note             TEXT NOT NULL DEFAULT '',
  payment_kind     TEXT NOT NULL,            -- 'cash' | 'installment'
  term_months      INTEGER,
  down_payment_uzs INTEGER,
  monthly_uzs      INTEGER,
  total_uzs        INTEGER,
  items_json       TEXT NOT NULL,            -- [{productId,name,variantLabel,qty,priceUzs}]
  source           TEXT NOT NULL,            -- 'product' | 'cart'
  status           TEXT NOT NULL DEFAULT 'new', -- 'new'|'contacted'|'done'
  telegram_sent    INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_orders_created ON orders (created_at DESC);
