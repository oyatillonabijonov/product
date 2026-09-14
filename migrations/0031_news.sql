-- Landing "Yangiliklar" bo'limi (Blog bo'limi o'rnida) — apple.com uslubidagi promo
-- tile'lar: to'q sariq yorliq + yashil teg, sarlavha, qisqa matn, ko'k tugma, rasm.
-- uz/ru juftliklari `posts` naqshida; landing tartib bo'yicha birinchi 3 tasini
-- ko'rsatadi (1-si katta, qolgan ikkitasi yonida ustma-ust).
CREATE TABLE news (
  id         TEXT PRIMARY KEY,
  badge      TEXT NOT NULL DEFAULT '',
  badge_ru   TEXT NOT NULL DEFAULT '',
  tag        TEXT NOT NULL DEFAULT '',
  tag_ru     TEXT NOT NULL DEFAULT '',
  title      TEXT NOT NULL,
  title_ru   TEXT NOT NULL DEFAULT '',
  text       TEXT NOT NULL DEFAULT '',
  text_ru    TEXT NOT NULL DEFAULT '',
  cta        TEXT NOT NULL DEFAULT '',
  cta_ru     TEXT NOT NULL DEFAULT '',
  link_url   TEXT NOT NULL DEFAULT '',
  image_url  TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active  INTEGER NOT NULL DEFAULT 1
);
