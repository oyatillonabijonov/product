import type { Route } from './+types/api.admin.site-config';
import { json, rowToSiteConfig, type SiteConfigRow } from '../../functions/lib/db';
import { parseSiteConfigInput } from '../../functions/lib/validate';
import type { ApiSiteConfig } from '../../shared/types';
import { requireAdmin, parseBody } from './api.admin.guard';

/**
 * Saqlangan tashqi sir o'rniga yuboriladigan belgi — sirning o'zi admin javobida chiqmaydi
 * (token yoki sessiya sizib ketsa ham kalitlar ular bilan birga ketmasin). `PUT` shu belgini
 * olsa bazadagi qiymatni saqlab qoladi. Admin formasidagi nusxasi: `src/admin/useSiteConfig.ts` `SECRET_SET`.
 */
const SECRET_SET = '__set__';

/** `customerSessionSecret` serverniki (admin uni o'zgartirmaydi) — doim bo'sh; tashqi sirlar — belgi. */
function masked(cfg: ApiSiteConfig): ApiSiteConfig {
  const mask = (v: string) => (v ? SECRET_SET : '');
  return {
    ...cfg,
    customerSessionSecret: '',
    telegramBotToken: mask(cfg.telegramBotToken),
    googleClientSecret: mask(cfg.googleClientSecret),
    billzSecretToken: mask(cfg.billzSecretToken),
  };
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const env = context.env;
  const who = await requireAdmin(request, env);
  if (who instanceof Response) return who;
  const row = await env.DB.prepare('SELECT * FROM site_config WHERE id = 1').first<SiteConfigRow>();
  if (!row) return json({ error: 'not_found' }, { status: 404 });
  return json(masked(rowToSiteConfig(row)));
}

export async function action({ request, context }: Route.ActionArgs) {
  const env = context.env;
  const who = await requireAdmin(request, env);
  if (who instanceof Response) return who;
  if (request.method !== 'PUT') return json({ error: 'method_not_allowed' }, { status: 405 });

  const input = parseBody(await request.json().catch(() => null), parseSiteConfigInput);
  if (input instanceof Response) return input;
  // Belgi qaytsa — sir o'zgarmagan, bazadagisi qoladi.
  const cur = await env.DB.prepare('SELECT telegram_bot_token, google_client_secret, billz_secret_token FROM site_config WHERE id = 1')
    .first<{ telegram_bot_token: string; google_client_secret: string; billz_secret_token: string }>();
  const keep = (v: string, old: string | undefined) => (v === SECRET_SET ? (old ?? '') : v);
  const cfg: ApiSiteConfig = {
    ...input,
    telegramBotToken: keep(input.telegramBotToken, cur?.telegram_bot_token),
    googleClientSecret: keep(input.googleClientSecret, cur?.google_client_secret),
    billzSecretToken: keep(input.billzSecretToken, cur?.billz_secret_token),
  };
  // UPDATE (INSERT OR REPLACE emas) — customer_session_secret server tomonidan boshqariladi,
  // REPLACE uni o'chirib yuborardi (barcha mijoz sessiyalari bekor bo'lardi).
  await env.DB.prepare(
    'UPDATE site_config SET name=?, phone=?, phone_display=?, telegram=?, instagram=?, whatsapp=?, map_ll=?, seo_title_suffix=?, seo_description=?, og_image=?, payment_mode=?, telegram_bot_token=?, telegram_order_chat_id=?, google_client_id=?, google_client_secret=?, telegram_login_bot=?, yandex_metrica_id=?, billz_secret_token=?, billz_shop_id=? WHERE id=1',
  ).bind(cfg.name, cfg.phone, cfg.phoneDisplay, cfg.telegram, cfg.instagram, cfg.whatsapp,
    cfg.mapLl, cfg.seoTitleSuffix, cfg.seoDescription, cfg.ogImage, cfg.paymentMode,
    cfg.telegramBotToken, cfg.telegramOrderChatId,
    cfg.googleClientId, cfg.googleClientSecret, cfg.telegramLoginBot, cfg.yandexMetricaId,
    cfg.billzSecretToken, cfg.billzShopId).run();
  return json(masked(cfg));
}
