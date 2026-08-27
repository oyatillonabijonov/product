/**
 * Server muhitining shartnomasi — baza va rasm ombori.
 *
 * `shared/` ikkala tsconfig (`app`/`src` va `functions`) ko'radigan yagona joy,
 * shu sabab interfeyslar shu yerda turadi; ularning amalga oshirilishi
 * `server/` ichida (SQLite + disk). Boshqa bazaga o'tilsa shu shartnoma
 * saqlanadi va route'lar tegilmaydi.
 */
export interface SqlResult {
  success: true;
  /** INSERT'dan keyin yangi qator id'si (`upsertCustomer*` shuni o'qiydi). */
  meta: { last_row_id: number; changes: number };
}

export interface SqlStatement {
  bind(...values: unknown[]): SqlStatement;
  all<T = unknown>(): Promise<{ results: T[] }>;
  first<T = unknown>(): Promise<T | null>;
  run(): Promise<SqlResult>;
}

export interface SqlDatabase {
  prepare(sql: string): SqlStatement;
  /** Atomik: bittasi yiqilsa hammasi qaytariladi. */
  batch(statements: SqlStatement[]): Promise<SqlResult[]>;
}

export interface StoredObject {
  body: ReadableStream;
  httpEtag: string;
  writeHttpMetadata(headers: Headers): void;
}

export interface ImageStore {
  get(key: string): Promise<StoredObject | null>;
  put(key: string, data: ArrayBuffer, options?: { httpMetadata?: { contentType?: string } }): Promise<void>;
}

export interface Env {
  DB: SqlDatabase;
  IMAGES: ImageStore;
}
