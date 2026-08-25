-- Blog: landingdagi 3 ta oxirgi post + /blog va /blog/:slug sahifalari.
-- Lokalizatsiya `categories` naqshi bo'yicha (uz + ru) — storefront faqat shu ikki
-- tilda ishlaydi, `pages`dagi en/cyrl ustunlari bu yerda keraksiz.
CREATE TABLE posts (
  id           TEXT PRIMARY KEY,
  slug         TEXT NOT NULL UNIQUE,
  title        TEXT NOT NULL,
  title_ru     TEXT NOT NULL DEFAULT '',
  excerpt      TEXT NOT NULL DEFAULT '',
  excerpt_ru   TEXT NOT NULL DEFAULT '',
  content      TEXT NOT NULL DEFAULT '',
  content_ru   TEXT NOT NULL DEFAULT '',
  cover_url    TEXT NOT NULL DEFAULT '',
  published_at TEXT NOT NULL DEFAULT '',
  sort_order   INTEGER NOT NULL DEFAULT 0,
  is_active    INTEGER NOT NULL DEFAULT 1
);

-- Landing va ro'yxat bir xil tartibda o'qiydi: yangi post birinchi.
CREATE INDEX idx_posts_feed ON posts (is_active, published_at DESC, sort_order ASC);
