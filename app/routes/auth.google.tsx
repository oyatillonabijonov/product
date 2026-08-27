import type { Route } from './+types/auth.google';
import { redirect } from 'react-router';
import { loadSiteConfig } from '../lib/loaders';
import { randomSecretHex } from '../../functions/lib/auth';

// Google OAuth 2.0 (authorization code flow) — boshlanishi.
export async function loader({ request, context }: Route.LoaderArgs) {
  const env = context.env;
  const cfg = await loadSiteConfig(env);
  if (!cfg.googleClientId) return redirect('/kirish?e=google');
  const origin = new URL(request.url).origin;
  const state = randomSecretHex();
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: cfg.googleClientId,
    redirect_uri: `${origin}/auth/google/callback`,
    scope: 'openid email profile',
    state,
    prompt: 'select_account',
  });
  return redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`, {
    headers: { 'set-cookie': `oauth_state=${state}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=600` },
  });
}
