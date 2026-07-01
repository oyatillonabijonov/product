CREATE TABLE products (
  id             TEXT PRIMARY KEY,
  name           TEXT NOT NULL,
  category       TEXT NOT NULL,
  condition      TEXT NOT NULL,
  condition_note TEXT,
  cash_price_uzs INTEGER NOT NULL,
  image_url      TEXT NOT NULL DEFAULT '',
  sort_order     INTEGER NOT NULL DEFAULT 0,
  is_active      INTEGER NOT NULL DEFAULT 1,
  created_at     INTEGER NOT NULL
);

CREATE TABLE settings (
  id                   INTEGER PRIMARY KEY CHECK (id = 1),
  down_payment_percent REAL NOT NULL,
  usd_to_uzs           INTEGER NOT NULL,
  terms                TEXT NOT NULL
);
