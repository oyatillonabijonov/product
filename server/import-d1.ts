import Database from 'better-sqlite3';
import { copyFileSync, existsSync, readFileSync, mkdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

/**
 * Cloudflare D1 dump'ini SQLite bazasiga ko'chiradi.
 *
 *   npx wrangler d1 export taqsit-store-db --remote --output=d1-dump.sql
 *   node server/import-d1.ts d1-dump.sql
 *
 * Dump ichida sxema ham, ma'lumot ham bor, shuning uchun import **toza** bazaga
 * qilinadi: mavjud fayl `.backup-<vaqt>` nomi bilan chetga olinadi. Dump'dagi
 * `d1_migrations` jadvali qaysi migratsiyalar D1'da qo'llanganini aytadi —
 * o'shalar bizning `_migrations` jadvaliga yoziladi, qolganini `npm run migrate`
 * qo'llaydi (masalan D1'da bo'lmagan yangi migratsiyalar).
 */
const dumpPath = process.argv[2];
if (!dumpPath || !existsSync(dumpPath)) {
  console.error('Foydalanish: node server/import-d1.ts <d1-dump.sql>');
  process.exit(1);
}

const target = process.env.DATABASE_PATH ?? `${process.env.DATA_DIR ?? 'data'}/store.db`;
mkdirSync(dirname(target), { recursive: true });

// Import vaqtinchalik faylga qilinadi va faqat muvaffaqiyatda o'rniga qo'yiladi —
// yarim ko'chirilgan baza ishlab turgan saytga tushib qolmasin.
const staging = `${target}.importing`;
// WAL yon fayllari ham tozalanadi: eskisi yangi baza yoniga qolib ketsa, SQLite
// uni ochilishda "tiklanmagan tranzaksiya" deb qo'llaydi va sahifalarni
// aralashtirib yuboradi (baza buziladi).
for (const suffix of ['', '-wal', '-shm']) rmSync(`${staging}${suffix}`, { force: true });

const db = new Database(staging);
const sql = readFileSync(dumpPath, 'utf8');
try {
  // Dump o'z tranzaksiyasini olib kelishi mumkin, shu sabab tashqaridan o'ralmaydi.
  db.exec(sql);
} catch (err) {
  db.close();
  rmSync(staging, { force: true });
  console.error('Dump qo\'llanmadi — mavjud baza tegilmadi.');
  throw err;
}

// D1 qaysi migratsiyalarni qo'llagan bo'lsa, biznikida ham belgilanadi.
db.exec('CREATE TABLE IF NOT EXISTS _migrations (name TEXT PRIMARY KEY, applied_at TEXT NOT NULL)');
let carried = 0;
try {
  const rows = db.prepare('SELECT name FROM d1_migrations').all() as { name: string }[];
  const mark = db.prepare('INSERT OR IGNORE INTO _migrations (name, applied_at) VALUES (?, ?)');
  const now = new Date().toISOString();
  for (const row of rows) {
    mark.run(row.name, now);
    carried += 1;
  }
} catch {
  console.warn('Dump\'da `d1_migrations` yo\'q — migratsiyalar belgilanmadi.');
}

// Qaysi rasmlar R2'dan ko'chirilishi kerakligi — `/images/...` bilan boshlanganlari.
// Qolganlari `public/` dagi statik fayllar, ular repo bilan keladi.
const imageUrls = (sql: string): string[] => {
  try {
    return (db.prepare(sql).all() as Record<string, unknown>[])
      .map((row) => String(Object.values(row)[0] ?? ''))
      .filter((url) => url.startsWith('/images/'));
  } catch {
    return [];
  }
};
const keys = [
  ...imageUrls('SELECT image_url FROM products'),
  ...imageUrls('SELECT url FROM product_images'),
  ...imageUrls('SELECT image_url FROM product_variants'),
  ...imageUrls('SELECT cover_url FROM posts'),
  ...imageUrls('SELECT cover_url FROM categories'),
  ...imageUrls('SELECT image_url FROM banners'),
  ...imageUrls('SELECT logo_url FROM brands'),
].map((url) => url.replace(/^\/images\//, ''));
const unique = [...new Set(keys)];

const counts = ['products', 'categories', 'orders', 'customers', 'posts', 'brands', 'product_variants']
  .map((table) => {
    try {
      const row = db.prepare(`SELECT COUNT(*) AS c FROM ${table}`).get() as { c: number };
      return `${table}: ${row.c}`;
    } catch {
      return `${table}: —`;
    }
  });

db.close();

if (existsSync(target)) {
  // WAL'dagi yozuvlar asosiy faylga tushirilmasa, nusxa chala bo'ladi.
  const old = new Database(target);
  old.pragma('wal_checkpoint(TRUNCATE)');
  old.close();
  const backup = `${target}.backup-${new Date().toISOString().replace(/[:.]/g, '-')}`;
  copyFileSync(target, backup);
  console.log(`Eski baza saqlandi → ${backup}`);
}
// Avval eski WAL/SHM olib tashlanadi, keyin yangi fayl o'rniga qo'yiladi.
for (const suffix of ['', '-wal', '-shm']) rmSync(`${target}${suffix}`, { force: true });
renameSync(staging, target);

console.log(`Import tugadi → ${target}`);
console.log(`Migratsiya belgilandi: ${carried}`);
console.log(counts.join(' · '));

if (unique.length === 0) {
  console.log('R2 dan ko\'chiriladigan rasm yo\'q — hamma rasm `public/` dagi statik fayllar.');
} else {
  const list = `${dirname(target)}/images-to-copy.txt`;
  writeFileSync(list, `${unique.join('\n')}\n`);
  console.log(`R2 dan ${unique.length} ta rasm kerak — ro'yxat: ${list}`);
}
console.log('Endi: npm run migrate  (D1\'da bo\'lmagan migratsiyalar qo\'llanadi)');
