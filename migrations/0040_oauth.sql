-- OAuth 2.1 avtorizatsiya serveri (remote MCP uchun). claude.ai konnektori shu
-- oqimni talab qiladi: dinamik klient ro'yxati + PKCE + authorization code.
--
-- Berilgan access/refresh tokenlar alohida jadvalda emas, `admin_tokens` da
-- (`kind` = 'oauth' / 'refresh') — bekor qilish, jurnal va ro'yxat bitta joyda.
CREATE TABLE IF NOT EXISTS oauth_clients (
  client_id TEXT PRIMARY KEY,
  client_name TEXT NOT NULL,
  -- JSON massiv: ["https://claude.ai/api/mcp/auth_callback"]
  redirect_uris TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Authorization code: 10 daqiqa yashaydi va bir marta ishlatiladi (almashganda o'chadi).
-- Kodning o'zi saqlanmaydi — faqat SHA-256 hash, tokenlardagi qoida bilan bir xil.
CREATE TABLE IF NOT EXISTS oauth_codes (
  code_hash TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  redirect_uri TEXT NOT NULL,
  code_challenge TEXT NOT NULL,
  label TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_oauth_codes_expires ON oauth_codes(expires_at);
