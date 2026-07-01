import type { Env } from '../env';
import { json, rowToSettings, type SettingsRow } from '../lib/db';

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const row = await env.DB.prepare('SELECT * FROM settings WHERE id = 1').first<SettingsRow>();
  if (!row) {
    return json({ error: 'settings_not_found' }, { status: 404 });
  }
  return json(rowToSettings(row), {
    headers: { 'cache-control': 'public, max-age=60' },
  });
};
