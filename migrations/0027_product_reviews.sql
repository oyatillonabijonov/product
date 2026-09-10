-- Mahsulot sharhlari. Sayt o'z sharh tizimini yuritmaydi degan qaror 0026'da
-- edi (reyting qo'lda kiritilardi); endi sharhlarning o'zi ham saqlanadi,
-- `products.rating_avg` va `review_count` esa ular ustidan hisoblangan qiymat
-- sifatida qoladi (admin qo'lda ham to'g'rilashi mumkin).
CREATE TABLE product_reviews (
  id         TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  author     TEXT NOT NULL,
  rating     INTEGER NOT NULL,          -- 1..5
  body       TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX idx_reviews_product ON product_reviews(product_id, created_at DESC);
