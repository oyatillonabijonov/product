import type { Route } from './+types/admin.auth.google.callback';
import { redirect } from 'react-router';
import { loadSiteConfig } from '../lib/loaders';
import { loadAdminAuth } from '../../functions/lib/db';
import { getCookie, createSession, sessionCookie } from '../../functions/lib/auth';

const TTL = 60 * 60 * 24 * 7; // 7 kun

function decodeJwtPayload(jwt: string): { email?: string; email_verified?: boolean } {
  const part = jwt.split('.')[1] ?? '';
  const b64 = part.replace(/-/g, '+').replace(/_/g, '/');
  const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
  return JSON.parse(atob(padded));
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const env = context.cloudflare.env;
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const cookieState = getCookie(request, 'admin_oauth_state');
  if (!code || !state || !cookieState || state !== cookieState) return redirect('/admin?e=state');

  const [cfg, auth] = await Promise.all([loadSiteConfig(env), loadAdminAuth(env)]);
  if (!auth?.adminGoogleEmail || !cfg.googleClientId) return redirect('/admin?e=google_off');

  const redirectUri = `${url.origin}/admin/auth/google/callback`;
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: cfg.googleClientId,
      client_secret: cfg.googleClientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }).toString(),
  });
  if (!tokenRes.ok) return redirect('/admin?e=google');
  const tok = (await tokenRes.json()) as { id_token?: string };
  if (!tok.id_token) return redirect('/admin?e=google');

  const payload = decodeJwtPayload(tok.id_token);
  const email = (payload.email ?? '').trim().toLowerCase();
  // Faqat tasdiqlangan va allowlist'dagi aynan shu email admin bo'la oladi.
  if (!email || payload.email_verified === false || email !== auth.adminGoogleEmail.trim().toLowerCase()) {
    return redirect('/admin?e=google_denied');
  }

  const now = Math.floor(Date.now() / 1000);
  const token = await createSession(auth.username, auth.sessionSecret, TTL, now);
  const headers = new Headers();
  headers.append('set-cookie', sessionCookie(token, TTL));
  headers.append('set-cookie', 'admin_oauth_state=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0');
  return redirect('/admin', { headers });
}
