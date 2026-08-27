import type { Route } from './+types/api.admin.models.$id';
import { json, rowToDeviceModel, type DeviceModelRow } from '../../functions/lib/db';
import { parseDeviceModelInput } from '../../functions/lib/validate';
import { requireAdmin, parseBody } from './api.admin.guard';

export async function action({ request, context, params }: Route.ActionArgs) {
  const env = context.env;
  const who = await requireAdmin(request, env);
  if (who instanceof Response) return who;
  const id = String(params.id);

  if (request.method === 'PUT') {
    const input = parseBody({ ...((await request.json().catch(() => null)) ?? {}) as object, id }, parseDeviceModelInput);
    if (input instanceof Response) return input;
    try {
      await env.DB.prepare(
        `UPDATE device_models
         SET name=?, brand_id=?, category_id=?, legacy_category=?, chip=?, ram=?, camera=?, display=?, sort_order=?
         WHERE id=?`,
      )
        .bind(
          input.name,
          input.brandId,
          input.categoryId,
          input.legacyCategory,
          input.chip,
          input.ram,
          input.camera,
          input.display,
          input.sortOrder,
          id,
        )
        .run();
    } catch {
      return json({ error: 'id_taken' }, { status: 400 });
    }
    const row = await env.DB.prepare('SELECT * FROM device_models WHERE id = ?').bind(id).first<DeviceModelRow>();
    if (!row) return json({ error: 'not_found' }, { status: 404 });
    return json(rowToDeviceModel(row));
  }

  if (request.method === 'DELETE') {
    await env.DB.prepare('DELETE FROM device_models WHERE id = ?').bind(id).run();
    return json({ ok: true });
  }

  return json({ error: 'method_not_allowed' }, { status: 405 });
}
