import type { Route } from './+types/api.admin.settings';
import { json, rowToSettings, type SettingsRow } from '../../functions/lib/db';
import { parseSettingsInput } from '../../functions/lib/validate';
import { requireAdmin, parseBody } from './api.admin.guard';

/** Sozlamalar formasi uchun joriy qiymatlar (kalkulyator + dollar kursi). */
export async function loader({ request, context }: Route.LoaderArgs) {
  const env = context.env;
  const who = await requireAdmin(request, env);
  if (who instanceof Response) return who;
  const row = await env.DB.prepare('SELECT * FROM settings WHERE id = 1').first<SettingsRow>();
  if (!row) return json({ error: 'not_initialized' }, { status: 500 });
  return json(rowToSettings(row));
}

export async function action({ request, context }: Route.ActionArgs) {
  const env = context.env;
  const who = await requireAdmin(request, env);
  if (who instanceof Response) return who;

  const input = parseBody(await request.json().catch(() => null), parseSettingsInput);
  if (input instanceof Response) return input;
  await env.DB.prepare(
    'UPDATE settings SET down_payment_percent=?, down_payment_max_percent=?, usd_to_uzs=?, terms=? WHERE id=1',
  )
    .bind(input.downPaymentPercent, input.downPaymentMaxPercent, input.usdToUzs, JSON.stringify(input.terms))
    .run();
  return json(input);
}
