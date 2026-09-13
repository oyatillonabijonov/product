import type { Env, SqlStatement } from './runtime';

/**
 * Mahsulotning rasm va xususiyat qatorlari — replace-all builder'lar.
 * `shared/`da turadi: admin route'lar (`functions/`) ham, Billz sinxronizatsiyasi
 * (`server/`, Docker'da `functions/` yo'q) ham bitta SQL'ni ishlatadi.
 */
export function specsStatements(env: Env, productId: string, specs: { label: string; value: string }[]): SqlStatement[] {
  const stmts: SqlStatement[] = [env.DB.prepare('DELETE FROM product_specs WHERE product_id = ?').bind(productId)];
  for (let i = 0; i < specs.length; i++) {
    stmts.push(
      env.DB.prepare('INSERT INTO product_specs (id, product_id, label, value, sort_order) VALUES (?, ?, ?, ?, ?)')
        .bind(crypto.randomUUID(), productId, specs[i].label, specs[i].value, i),
    );
  }
  return stmts;
}

export function imagesStatements(env: Env, productId: string, images: string[]): SqlStatement[] {
  const stmts: SqlStatement[] = [env.DB.prepare('DELETE FROM product_images WHERE product_id = ?').bind(productId)];
  for (let i = 0; i < images.length; i++) {
    stmts.push(
      env.DB.prepare('INSERT INTO product_images (id, product_id, image_url, sort_order) VALUES (?, ?, ?, ?)')
        .bind(crypto.randomUUID(), productId, images[i], i),
    );
  }
  return stmts;
}

export function imagesAndSpecsStatements(
  env: Env,
  productId: string,
  images: string[],
  specs: { label: string; value: string }[],
): SqlStatement[] {
  return [...imagesStatements(env, productId, images), ...specsStatements(env, productId, specs)];
}
