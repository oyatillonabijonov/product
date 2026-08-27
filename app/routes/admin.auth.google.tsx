import type { Route } from './+types/admin.auth.google';
import { redirect } from 'react-router';
import { loadSiteConfig } from '../lib/loaders';
import { loadAdminAuth } from '../../functions/lib/db';
import { randomSecretHex } from '../../functions/lib/auth';

// Admin Google kirishi — faqat admin_google_email o'rnatilgan bo'lsa ishlaydi.
export async function loader({ request, context }: Route.LoaderArgs) {
  const env = context.env;
  const [cfg, auth] = await Promise.all([loadSiteConfig(env), loadAdminAuth(env)]);
  if (!cfg.googleClientId || !auth?.adminGoogleEmail) return redirect('/admin?e=google_off');
  const origin = new URL(request.url).origin;
  const state = randomSecretHex();
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: cfg.googleClientId,
    redirect_uri: `${origin}/admin/auth/google/callback`,
    scope: 'openid email profile',
    state,
    prompt: 'select_account',
  });
  return redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`, {
    headers: { 'set-cookie': `admin_oauth_state=${state}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=600` },
  });
}
