import type { Route } from './+types/api.admin.site-config';
import { json, rowToSiteConfig, type SiteConfigRow } from '../../functions/lib/db';
import { parseSiteConfigInput } from '../../functions/lib/validate';
import { requireAdmin, parseBody } from './api.admin.guard';

export async function loader({ request, context }: Route.LoaderArgs) {
  const env = context.env;
  const who = await requireAdmin(request, env);
  if (who instanceof Response) return who;
  const row = await env.DB.prepare('SELECT * FROM site_config WHERE id = 1').first<SiteConfigRow>();
  if (!row) return json({ error: 'not_found' }, { status: 404 });
  return json(rowToSiteConfig(row));
}

export async function action({ request, context }: Route.ActionArgs) {
  const env = context.env;
  const who = await requireAdmin(request, env);
  if (who instanceof Response) return who;
  if (request.method !== 'PUT') return json({ error: 'method_not_allowed' }, { status: 405 });

  const input = parseBody(await request.json().catch(() => null), parseSiteConfigInput);
  if (input instanceof Response) return input;
  // UPDATE (INSERT OR REPLACE emas) — customer_session_secret server tomonidan boshqariladi,
  // REPLACE uni o'chirib yuborardi (barcha mijoz sessiyalari bekor bo'lardi).
  await env.DB.prepare(
    'UPDATE site_config SET name=?, phone=?, phone_display=?, telegram=?, instagram=?, whatsapp=?, map_ll=?, map_label=?, seo_title_suffix=?, seo_description=?, og_image=?, payment_mode=?, telegram_bot_token=?, telegram_order_chat_id=?, google_client_id=?, google_client_secret=?, telegram_login_bot=?, yandex_metrica_id=? WHERE id=1',
  ).bind(input.name, input.phone, input.phoneDisplay, input.telegram, input.instagram, input.whatsapp,
    input.mapLl, input.mapLabel, input.seoTitleSuffix, input.seoDescription, input.ogImage, input.paymentMode,
    input.telegramBotToken, input.telegramOrderChatId,
    input.googleClientId, input.googleClientSecret, input.telegramLoginBot, input.yandexMetricaId).run();
  return json(input);
}
