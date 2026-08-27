import type { Route } from './+types/api.admin.login-options';
import { json, loadAdminAuth } from '../../functions/lib/db';
import { loadSiteConfig } from '../lib/loaders';

// Login sahifasi Google tugmasini ko'rsatish kerakmi — bilish uchun (guard yo'q, sir chiqmaydi).
export async function loader({ context }: Route.LoaderArgs) {
  const env = context.env;
  const [cfg, auth] = await Promise.all([loadSiteConfig(env), loadAdminAuth(env)]);
  return json({ google: Boolean(cfg.googleClientId && auth?.adminGoogleEmail) });
}
