import type { Route } from './+types/api.admin.settings';
import { json } from '../../functions/lib/db';
import { parseSettingsInput, ValidationError } from '../../functions/lib/validate';
import { requireAdmin } from './api.admin.guard';

export async function action({ request, context }: Route.ActionArgs) {
  const env = context.cloudflare.env;
  const who = await requireAdmin(request, env);
  if (who instanceof Response) return who;

  let input;
  try {
    input = parseSettingsInput(await request.json().catch(() => null));
  } catch (e) {
    if (e instanceof ValidationError) return json({ error: e.message }, { status: 400 });
    throw e;
  }
  await env.DB.prepare(
    'UPDATE settings SET down_payment_percent=?, usd_to_uzs=?, terms=? WHERE id=1',
  )
    .bind(input.downPaymentPercent, input.usdToUzs, JSON.stringify(input.terms))
    .run();
  return json(input);
}
