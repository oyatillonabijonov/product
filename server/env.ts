import { openDatabase } from './sqlite.ts';
import { openImageStore } from './images.ts';
import type { Env } from '../shared/runtime';

const DATA_DIR = process.env.DATA_DIR ?? 'data';

/** Yuklangan rasm va videolar papkasi — `createEnv` va `server/index.ts`dagi statik `/images/products` shu yerdan. */
export const IMAGES_DIR = process.env.IMAGES_DIR ?? `${DATA_DIR}/images`;

/**
 * Ilova muhiti — loaderlarga `context.env` sifatida uzatiladi.
 *
 * Bindinglar o'rniga oddiy sozlamalar: baza fayli va rasm papkasi. Ikkalasi ham
 * `DATA_DIR` ostida, ya'ni zaxira nusxa olish bitta papkani nusxalash demak.
 */
export function createEnv(): Env {
  return {
    DB: openDatabase(process.env.DATABASE_PATH ?? `${DATA_DIR}/store.db`),
    IMAGES: openImageStore(IMAGES_DIR),
  };
}
