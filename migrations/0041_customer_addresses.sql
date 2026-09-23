-- Mijoz manzillari (kabinet → Manzillar) va buyurtmadagi manzil nusxasi.
--
-- `orders.address_text` — FK emas, **matn nusxasi**: mijoz manzilini keyin tahrirlasa
-- yoki o'chirsa ham buyurtma o'sha paytdagi manzilni saqlab qolishi kerak (`items_json`
-- tovar nomi/narxini shu sababdan nusxa qilgani bilan bir xil mantiq).
CREATE TABLE customer_addresses (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER NOT NULL,
  region      TEXT NOT NULL,
  district    TEXT NOT NULL,
  street      TEXT NOT NULL DEFAULT '',
  house       TEXT NOT NULL DEFAULT '',
  apartment   TEXT NOT NULL DEFAULT '',
  entrance    TEXT NOT NULL DEFAULT '',
  floor       TEXT NOT NULL DEFAULT '',
  is_default  INTEGER NOT NULL DEFAULT 0,
  created_at  INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX idx_customer_addresses ON customer_addresses (customer_id, is_default DESC, id DESC);

ALTER TABLE orders ADD COLUMN address_text TEXT;
