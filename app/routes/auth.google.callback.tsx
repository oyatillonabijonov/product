import type { Route } from './+types/auth.google.callback';
import { redirect } from 'react-router';
import { loadSiteConfig } from '../lib/loaders';
import { upsertCustomerByGoogle } from '../../functions/lib/db';
import { customerCookie } from '../../functions/lib/customer-auth';
import { getCookie } from '../../functions/lib/auth';

function decodeJwtPayload(jwt: string): { sub?: string; email?: string; name?: string } {
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
  const cookieState = getCookie(request, 'oauth_state');
  // CSRF: qaytgan state cookie'dagi bilan mos kelishi shart.
  if (!code || !state || !cookieState || state !== cookieState) return redirect('/kirish?e=state');

  const cfg = await loadSiteConfig(env);
  const redirectUri = `${url.origin}/auth/google/callback`;
  // Code → token (server-to-server, TLS). id_token to'g'ridan Google'dan kelgani uchun
  // imzosini qayta tekshirmasdan ishonamiz (code-flow standart amaliyoti).
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
  if (!tokenRes.ok) return redirect('/kirish?e=google');
  const tok = (await tokenRes.json()) as { id_token?: string };
  if (!tok.id_token) return redirect('/kirish?e=google');

  const payload = decodeJwtPayload(tok.id_token);
  if (!payload.sub) return redirect('/kirish?e=google');
  const id = await upsertCustomerByGoogle(env, payload.sub, payload.email ?? '', payload.name ?? '');

  const headers = new Headers();
  headers.append('set-cookie', await customerCookie(env, id));
  headers.append('set-cookie', 'oauth_state=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0');
  return redirect('/kabinet', { headers });
}
