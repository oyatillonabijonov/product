import type { Route } from './+types/auth.telegram';
import { redirect } from 'react-router';
import { loadSiteConfig } from '../lib/loaders';
import { upsertCustomerByTelegram } from '../../functions/lib/db';
import { customerCookie } from '../../functions/lib/customer-auth';

// Telegram Login Widget callback — imzo bot-token bilan tekshiriladi (Telegram spetsifikatsiyasi).
export async function loader({ request, context }: Route.LoaderArgs) {
  const env = context.cloudflare.env;
  const cfg = await loadSiteConfig(env);
  if (!cfg.telegramBotToken) return redirect('/kirish?e=telegram');

  const params = new URL(request.url).searchParams;
  const hash = params.get('hash');
  const tgId = params.get('id');
  const authDate = Number(params.get('auth_date') ?? '0');
  const now = Math.floor(Date.now() / 1000);
  if (!hash || !tgId || !authDate || now - authDate > 86400) return redirect('/kirish?e=telegram');

  // data_check_string: hash'dan boshqa maydonlar, kalit bo'yicha tartiblab "k=v" \n bilan.
  const pairs: string[] = [];
  params.forEach((v, k) => {
    if (k !== 'hash') pairs.push(`${k}=${v}`);
  });
  pairs.sort();
  const enc = new TextEncoder();
  const secretKey = await crypto.subtle.digest('SHA-256', enc.encode(cfg.telegramBotToken));
  const key = await crypto.subtle.importKey('raw', secretKey, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(pairs.join('\n')));
  const computed = Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('');
  if (computed !== hash) return redirect('/kirish?e=telegram');

  const name =
    [params.get('first_name'), params.get('last_name')].filter(Boolean).join(' ') ||
    params.get('username') ||
    'Telegram';
  const id = await upsertCustomerByTelegram(env, tgId, name);
  return redirect('/kabinet', { headers: { 'set-cookie': await customerCookie(env, id) } });
}
