-- Admin credentials moved into D1 so they can be changed from the admin panel.
-- Password is PBKDF2-SHA256 (100000 iters) with a per-account salt. Default login: admin / admin.
-- session_secret signs the HMAC session cookie; auto-generated here so no manual secret setup is needed.
CREATE TABLE admin_auth (
  id             INTEGER PRIMARY KEY CHECK (id = 1),
  username       TEXT NOT NULL,
  password_hash  TEXT NOT NULL,
  password_salt  TEXT NOT NULL,
  session_secret TEXT NOT NULL
);

INSERT INTO admin_auth (id, username, password_hash, password_salt, session_secret) VALUES
(1, 'admin',
 '233386f5a68e973db2a0e4d07a708b9a288b41f72019fce33f9b27a5aa6f1c02',
 '7261e66997e73992ec2f5bb435d7e55d',
 lower(hex(randomblob(32))));
