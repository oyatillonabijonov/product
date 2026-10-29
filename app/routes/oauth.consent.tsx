import type { Route } from './+types/oauth.consent';
import { json, loadAdminAuth, reserveLoginAttempt, updateLoginThrottle } from '../../functions/lib/db';
import { verifyPassword } from '../../functions/lib/auth';
import { readText } from '../../functions/lib/body';
import { hashToken, newToken } from '../../shared/mcp-auth';
import { buildRedirect, CODE_TTL, consentPage, parseConsentForm, redirectUriAllowed } from '../../shared/oauth';

/** Rozilik formasi — bir necha maydon; autentifikatsiyasiz endpoint katta tanani xotiraga yig'masin. */
const MAX_BODY = 8 * 1024;

function html(status: number, body: string): Response {
  return new Response(body, { status, headers: { 'content-type': 'text/html; charset=utf-8' } });
}

/**
 * Rozilik formasining POST'i. Bu **bizning** endpoint — SDK faqat `/authorize` ni
 * chizadi va `provider.authorize` ga topshiradi (`server/oauth-provider.ts`).
 *
 * Yashirin maydonlar mijozdan keladi, shuning uchun `redirect_uri` bazadagi klient
 * ro'yxati bilan **qayta** solishtiriladi — aks holda istalgan odam o'z manziliga
 * kod yuboradigan forma yasay olardi.
 */
export async function action({ request, context }: Route.ActionArgs) {
  const env = context.env;
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, { status: 405 });

  // `formData()` o'rniga chegaralangan matn: forma `application/x-www-form-urlencoded`
  // (`consentPage`), uni `URLSearchParams` o'zi tahlil qiladi.
  const text = await readText(request, MAX_BODY);
  if (text instanceof Response) return text;
  let form;
  try {
    const body: Record<string, unknown> = Object.fromEntries(new URLSearchParams(text));
    form = parseConsentForm(body);
  } catch {
    return new Response("So'rov to'liq emas", { status: 400, headers: { 'content-type': 'text/plain; charset=utf-8' } });
  }

  const client = await env.DB.prepare('SELECT client_name, redirect_uris FROM oauth_clients WHERE client_id = ?')
    .bind(form.clientId)
    .first<{ client_name: string; redirect_uris: string }>();
  if (!client || !redirectUriAllowed(form.redirectUri, JSON.parse(client.redirect_uris) as string[])) {
    return new Response('Klient yoki qaytish manzili notanish', { status: 400, headers: { 'content-type': 'text/plain; charset=utf-8' } });
  }

  const page = (error: string) => consentPage({
    clientName: client.client_name, clientId: form.clientId, redirectUri: form.redirectUri,
    codeChallenge: form.codeChallenge, state: form.state ?? undefined, error,
  });

  const auth = await loadAdminAuth(env);
  if (!auth) return new Response('Admin sozlanmagan', { status: 500, headers: { 'content-type': 'text/plain; charset=utf-8' } });

  const now = Math.floor(Date.now() / 1000);
  // Login bilan bitta hisoblagich — urinish parol tekshiruvidan oldin atomik band qilinadi.
  const slot = await reserveLoginAttempt(env, now);
  if (!slot.ok) {
    return html(429, page(`Juda ko'p urinish. ${slot.retryAfter} soniyadan keyin qayta urining.`));
  }
  // Parol tekshiruvi login bilan bir xil: noto'g'ri loginda ham sekin hisob bajariladi.
  const passwordOk = await verifyPassword(form.password, auth.passwordSalt, auth.passwordHash);
  if (form.username !== auth.username || !passwordOk) {
    return html(401, page("Login yoki parol noto'g'ri"));
  }
  await updateLoginThrottle(env, 0, 0);

  const code = newToken();
  await env.DB.prepare(
    'INSERT INTO oauth_codes (code_hash, client_id, redirect_uri, code_challenge, label, expires_at) VALUES (?, ?, ?, ?, ?, ?)',
  ).bind(await hashToken(code), form.clientId, form.redirectUri, form.codeChallenge, form.label, now + CODE_TTL).run();
  // Tozalash uchun alohida jarayon yo'q (jadval kichik, kod 10 daqiqada tugaydi) —
  // har muvaffaqiyatli rozilikda tashlab ketilgan eski kodlar arzon supurib ketiladi.
  await env.DB.prepare('DELETE FROM oauth_codes WHERE expires_at < ?').bind(now).run();

  return new Response(null, {
    status: 302,
    headers: {
      location: buildRedirect(form.redirectUri, { code, state: form.state ?? undefined }),
      // Kod URL'da — bu javob va oraliq keshlar/tarix hech qayerda saqlanmasin.
      'cache-control': 'no-store',
    },
  });
}
