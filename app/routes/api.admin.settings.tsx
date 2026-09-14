import type { Route } from './+types/api.admin.settings';
import { json, rowToSettings, type SettingsRow } from '../../functions/lib/db';
import { parseSettingsInput } from '../../functions/lib/validate';
import { requireAdmin, parseBody } from './api.admin.guard';
import { storeRate } from '../../shared/usd-rate';

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
  // Ustama bor va MB kursi ma'lum — kursni server hisoblaydi; aks holda qo'lda kiritilgani.
  const cur = await env.DB.prepare('SELECT usd_cbu_rate FROM settings WHERE id = 1').first<{ usd_cbu_rate: number | null }>();
  const cbu = cur?.usd_cbu_rate ?? null;
  const usdToUzs = input.usdMarkupPercent !== null && cbu !== null ? storeRate(cbu, input.usdMarkupPercent) : input.usdToUzs;
  await env.DB.prepare(
    'UPDATE settings SET down_payment_percent=?, down_payment_max_percent=?, usd_to_uzs=?, usd_markup_percent=?, terms=? WHERE id=1',
  )
    .bind(input.downPaymentPercent, input.downPaymentMaxPercent, usdToUzs, input.usdMarkupPercent, JSON.stringify(input.terms))
    .run();
  const saved = await env.DB.prepare('SELECT * FROM settings WHERE id = 1').first<SettingsRow>();
  return json(saved ? rowToSettings(saved) : input);
}
