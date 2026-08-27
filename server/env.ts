import { openDatabase } from './sqlite.ts';
import { openImageStore } from './images.ts';
import type { Env } from '../shared/runtime';

/**
 * Ilova muhiti — loaderlarga `context.env` sifatida uzatiladi.
 *
 * Bindinglar o'rniga oddiy sozlamalar: baza fayli va rasm papkasi. Ikkalasi ham
 * `DATA_DIR` ostida, ya'ni zaxira nusxa olish bitta papkani nusxalash demak.
 */
export function createEnv(): Env {
  const dataDir = process.env.DATA_DIR ?? 'data';
  return {
    DB: openDatabase(process.env.DATABASE_PATH ?? `${dataDir}/store.db`),
    IMAGES: openImageStore(process.env.IMAGES_DIR ?? `${dataDir}/images`),
  };
}
