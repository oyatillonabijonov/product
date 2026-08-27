import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import type { SqlDatabase, SqlResult, SqlStatement } from '../shared/runtime';

/**
 * SQLite ustidan D1 API'si.
 *
 * Loyihaning barcha SQL'i D1 uchun yozilgan (`prepare().bind().all()/first()/run()`
 * va `batch()`), D1'ning o'zi esa SQLite. Shu sabab bazani almashtirganda
 * so'rovlarni qayta yozish shart emas — shu yupqa qatlam yetadi. Boshqa bazaga
 * (masalan Postgres) o'tilsa, almashtiriladigan yagona joy ham aynan shu fayl.
 */
interface Bound {
  sql: string;
  values: unknown[];
}

/** `batch()` bog'langan so'rovni ko'ra olishi uchun ichki maydon. */
interface BoundStatement extends SqlStatement {
  readonly bound: Bound;
}

export function openDatabase(file: string): SqlDatabase {
  mkdirSync(dirname(file), { recursive: true });
  const db = new Database(file);
  db.pragma('journal_mode = WAL'); // o'qish yozishni bloklamasin
  db.pragma('foreign_keys = ON');

  const make = (bound: Bound): BoundStatement => ({
    bound,
    bind: (...values: unknown[]) => make({ sql: bound.sql, values }),
    all: async <T,>() => ({ results: db.prepare(bound.sql).all(...bound.values) as T[] }),
    first: async <T,>() => (db.prepare(bound.sql).get(...bound.values) as T | undefined) ?? null,
    run: async (): Promise<SqlResult> => {
      const info = db.prepare(bound.sql).run(...bound.values);
      return { success: true, meta: { last_row_id: Number(info.lastInsertRowid), changes: info.changes } };
    },
  });

  // D1'dagidek atomik: bittasi yiqilsa hammasi qaytariladi.
  const runBatch = db.transaction((items: Bound[]): SqlResult[] =>
    items.map((item) => {
      const info = db.prepare(item.sql).run(...item.values);
      return { success: true as const, meta: { last_row_id: Number(info.lastInsertRowid), changes: info.changes } };
    }),
  );

  return {
    prepare: (sql: string) => make({ sql, values: [] }),
    batch: async (statements: SqlStatement[]): Promise<SqlResult[]> => {
      const infos = runBatch(statements.map((s) => (s as BoundStatement).bound));
      return infos;
    },
  };
}
