import type { Route } from './+types/api.admin.models';
import { json, rowToDeviceModel, type DeviceModelRow } from '../../functions/lib/db';
import { parseDeviceModelInput, ValidationError } from '../../functions/lib/validate';
import { requireAdmin } from './api.admin.guard';

export async function loader({ request, context }: Route.LoaderArgs) {
  const env = context.cloudflare.env;
  const who = await requireAdmin(request, env);
  if (who instanceof Response) return who;
  const { results } = await env.DB.prepare(
    'SELECT * FROM device_models ORDER BY sort_order ASC, name ASC',
  ).all<DeviceModelRow>();
  return json(results.map(rowToDeviceModel));
}

export async function action({ request, context }: Route.ActionArgs) {
  const env = context.cloudflare.env;
  const who = await requireAdmin(request, env);
  if (who instanceof Response) return who;

  let input;
  try {
    input = parseDeviceModelInput(await request.json().catch(() => null));
  } catch (e) {
    if (e instanceof ValidationError) return json({ error: e.message }, { status: 400 });
    throw e;
  }
  try {
    await env.DB.prepare(
      `INSERT INTO device_models
        (id, name, brand_id, category_id, legacy_category, chip, ram, camera, display, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        input.id,
        input.name,
        input.brandId,
        input.categoryId,
        input.legacyCategory,
        input.chip,
        input.ram,
        input.camera,
        input.display,
        input.sortOrder,
      )
      .run();
  } catch {
    return json({ error: 'id_taken' }, { status: 400 });
  }
  const row = await env.DB.prepare('SELECT * FROM device_models WHERE id = ?')
    .bind(input.id)
    .first<DeviceModelRow>();
  return json(row ? rowToDeviceModel(row) : { error: 'insert_failed' }, { status: row ? 201 : 500 });
}
