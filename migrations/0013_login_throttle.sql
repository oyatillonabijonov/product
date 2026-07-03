-- Login brute-force himoyasi: ketma-ket muvaffaqiyatsiz urinishlar soni va
-- qulflash muddati (unix soniya). Siyosat functions/lib/auth.ts (lockDelaySeconds) da.
ALTER TABLE admin_auth ADD COLUMN failed_attempts INTEGER NOT NULL DEFAULT 0;
ALTER TABLE admin_auth ADD COLUMN lock_until INTEGER NOT NULL DEFAULT 0;
