import Database from 'better-sqlite3';
import { mkdirSync, readdirSync, unlinkSync } from 'node:fs';
import path from 'node:path';

/**
 * SQLite zaxira nusxasi — `DATA_DIR/backups/store-YYYY-MM-DD.db`, oxirgi 7 tasi qoladi.
 * Ishlayotgan server bilan bir vaqtda xavfsiz (SQLite backup API, WAL bilan mos).
 * Coolify → Scheduled Tasks: `node server/backup.ts`, har kuni. Rasmlar (`images/`)
 * bu yerga kirmaydi: Billz rasmlari qayta yuklanadi, admin yuklaganlari kam — papkani
 * vaqti-vaqti bilan qo'lda nusxalang (deploy/README.md).
 * ponytail: bir diskda; tashqi joyga (S3/rclone) ko'chirish kerak bo'lsa shu papka yuboriladi.
 */
const dataDir = process.env.DATA_DIR ?? 'data';
const dbPath = process.env.DATABASE_PATH ?? path.join(dataDir, 'store.db');
const outDir = path.join(dataDir, 'backups');
const KEEP = 7;

mkdirSync(outDir, { recursive: true });
const name = `store-${new Date().toISOString().slice(0, 10)}.db`;
const db = new Database(dbPath, { readonly: true });
await db.backup(path.join(outDir, name));
db.close();

const old = readdirSync(outDir).filter((f) => /^store-\d{4}-\d{2}-\d{2}\.db$/.test(f)).sort().slice(0, -KEEP);
for (const f of old) unlinkSync(path.join(outDir, f));
console.log(`backup → ${path.join(outDir, name)}${old.length ? ` (eski ${old.length} ta o'chirildi)` : ''}`);
