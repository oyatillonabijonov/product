-- MCP tokenlari: Claude orqali admin API'ga kiradigan nomli kalitlar.
-- Token qiymati bazada saqlanmaydi — faqat SHA-256 hash, shuning uchun bazani o'qigan
-- odam ham token bilan kira olmaydi. Bekor qilish — `revoked_at`.
-- `kind`: 'manual' — admin'da qo'lda yaratilgan; 'oauth' — konnektor bergan (migratsiya 0040).
CREATE TABLE IF NOT EXISTS admin_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  label TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  kind TEXT NOT NULL DEFAULT 'manual',
  client_id TEXT,
  expires_at INTEGER,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  last_used_at INTEGER,
  revoked_at INTEGER
);

-- Yozuv amallari jurnali: tokenlar to'liq admin huquqiga ega, shuning uchun
-- kim (token nomi) qaysi tool bilan nimani o'zgartirgani yozilib turadi.
CREATE TABLE IF NOT EXISTS admin_audit (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  at INTEGER NOT NULL DEFAULT (unixepoch()),
  token_label TEXT NOT NULL,
  tool TEXT NOT NULL,
  target_id TEXT
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_at ON admin_audit(at DESC);
