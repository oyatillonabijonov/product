import Database from 'better-sqlite3';
import { readFileSync, readdirSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';

/**
 * Migratsiyalarni qo'llaydi — `wrangler d1 migrations apply` o'rnida.
 *
 * `migrations/` ichidagi `.sql` fayllar nomi bo'yicha tartiblanadi va bir marta
 * qo'llanadi; qo'llanganlari `_migrations` jadvalida turadi. Fayl ichidagi bir
 * nechta so'rov `exec` bilan bitta tranzaksiyada bajariladi.
 */
const file = process.env.DATABASE_PATH ?? `${process.env.DATA_DIR ?? 'data'}/store.db`;
mkdirSync(dirname(file), { recursive: true });
const db = new Database(file);
db.pragma('journal_mode = WAL');
db.exec('CREATE TABLE IF NOT EXISTS _migrations (name TEXT PRIMARY KEY, applied_at TEXT NOT NULL)');

const applied = new Set(
  (db.prepare('SELECT name FROM _migrations').all() as { name: string }[]).map((r) => r.name),
);
const dir = 'migrations';
const pending = readdirSync(dir).filter((f) => f.endsWith('.sql') && !applied.has(f)).sort();

if (pending.length === 0) {
  console.log('Migratsiya yo\'q — baza yangi.');
} else {
  for (const name of pending) {
    const sql = readFileSync(join(dir, name), 'utf8');
    db.exec('BEGIN');
    try {
      db.exec(sql);
      db.prepare('INSERT INTO _migrations (name, applied_at) VALUES (?, ?)').run(name, new Date().toISOString());
      db.exec('COMMIT');
      console.log(`✓ ${name}`);
    } catch (err) {
      db.exec('ROLLBACK');
      console.error(`✗ ${name}`);
      throw err;
    }
  }
  console.log(`${pending.length} ta migratsiya qo'llandi → ${file}`);
}
db.close();
