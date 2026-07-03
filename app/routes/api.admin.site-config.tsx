import type { Route } from './+types/api.admin.site-config';
import { json, rowToSiteConfig, type SiteConfigRow } from '../../functions/lib/db';
import { parseSiteConfigInput, ValidationError } from '../../functions/lib/validate';
import { requireAdmin } from './api.admin.guard';

export async function loader({ request, context }: Route.LoaderArgs) {
  const env = context.cloudflare.env;
  const who = await requireAdmin(request, env);
  if (who instanceof Response) return who;
  const row = await env.DB.prepare('SELECT * FROM site_config WHERE id = 1').first<SiteConfigRow>();
  if (!row) return json({ error: 'not_found' }, { status: 404 });
  return json(rowToSiteConfig(row));
}

export async function action({ request, context }: Route.ActionArgs) {
  const env = context.cloudflare.env;
  const who = await requireAdmin(request, env);
  if (who instanceof Response) return who;
  if (request.method !== 'PUT') return json({ error: 'method_not_allowed' }, { status: 405 });

  let input;
  try {
    input = parseSiteConfigInput(await request.json().catch(() => null));
  } catch (e) {
    if (e instanceof ValidationError) return json({ error: e.message }, { status: 400 });
    throw e;
  }
  await env.DB.prepare(
    'INSERT OR REPLACE INTO site_config (id, name, phone, phone_display, telegram, instagram, whatsapp, map_ll, map_label, seo_title_suffix, seo_description, og_image) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
  ).bind(input.name, input.phone, input.phoneDisplay, input.telegram, input.instagram, input.whatsapp,
    input.mapLl, input.mapLabel, input.seoTitleSuffix, input.seoDescription, input.ogImage).run();
  return json(input);
}
