import type { Env } from '../../env';
import { json } from '../../lib/db';
import { parseSettingsInput, ValidationError } from '../../lib/validate';

export const onRequestPut: PagesFunction<Env> = async ({ request, env }) => {
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
};
