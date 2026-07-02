import type { Route } from './+types/api.settings';
import { json, rowToSettings, type SettingsRow } from '../../functions/lib/db';

export async function loader({ context }: Route.LoaderArgs) {
  const row = await context.cloudflare.env.DB.prepare('SELECT * FROM settings WHERE id = 1').first<SettingsRow>();
  if (!row) return json({ error: 'settings_not_found' }, { status: 404 });
  return json(rowToSettings(row), { headers: { 'cache-control': 'public, max-age=60' } });
}
