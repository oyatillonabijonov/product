/**
 * OAuth oqimining sof qismi. Endpoint'larning o'zini `@modelcontextprotocol/sdk`
 * ichidagi `mcpAuthRouter` chizadi (metadata, /register, /authorize, /token, /revoke)
 * va PKCE `S256` tekshiruvini ham o'zi bajaradi — bizdan faqat saqlash va rozilik
 * sahifasi talab qilinadi (`server/oauth-provider.ts`, `server/oauth-consent.ts`).
 */

/** Access token — 30 kun. Refresh bekor qilinmaguncha yashaydi. */
export const ACCESS_TTL = 30 * 24 * 60 * 60;
/** Authorization code — 10 daqiqa, bir martalik. */
export const CODE_TTL = 10 * 60;

/**
 * `redirect_uri` ro'yxatdagi manzil bilan **aynan** mos kelishi shart. Prefiks
 * taqqoslash ochiq redirect beradi (`…/cb.evil` `…/cb` bilan boshlanadi).
 */
export function redirectUriAllowed(requested: string, registered: string[]): boolean {
  return registered.includes(requested);
}

export function buildRedirect(redirectUri: string, params: { code: string; state?: string }): string {
  const url = new URL(redirectUri);
  url.searchParams.set('code', params.code);
  url.searchParams.delete('state');
  if (params.state) url.searchParams.set('state', params.state);
  return url.toString();
}

export interface ConsentForm {
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
  state: string | null;
  label: string;
  username: string;
  password: string;
}

function str(body: Record<string, unknown>, key: string): string {
  const v = body[key];
  return typeof v === 'string' ? v.trim() : '';
}

/**
 * Rozilik formasidan kelgan maydonlar. Yashirin maydonlar (`client_id`, `redirect_uri`,
 * `code_challenge`) mijoz tomonidan kelgani uchun **ishonchsiz** — chaqiruvchi ularni
 * bazadagi klient bilan qayta solishtirishi shart (`redirectUriAllowed`).
 */
export function parseConsentForm(body: Record<string, unknown>): ConsentForm {
  const clientId = str(body, 'client_id');
  const redirectUri = str(body, 'redirect_uri');
  const codeChallenge = str(body, 'code_challenge');
  const username = str(body, 'username');
  const password = typeof body.password === 'string' ? body.password : '';
  if (!clientId || !redirectUri || !codeChallenge) throw new Error('invalid_request');
  if (!username || !password) throw new Error('missing_credentials');
  const state = str(body, 'state');
  const label = str(body, 'label').slice(0, 60);
  return {
    clientId, redirectUri, codeChallenge,
    state: state === '' ? null : state,
    label: label === '' ? 'Konnektor' : label,
    username, password,
  };
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * Rozilik + kirish sahifasi HTML'i. Admin paneli React SPA, bu esa oddiy server HTML —
 * OAuth oqimi to'liq server tomonida kechadi va sahifa bitta forma, shuning uchun
 * bundle'ga qo'shish shart emas. POST qabul qiluvchisi `app/routes/oauth.consent.tsx`da.
 */
export function consentPage(p: {
  clientName: string; clientId: string; redirectUri: string; codeChallenge: string; state?: string; error?: string;
}): string {
  return `<!doctype html>
<html lang="uz"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>Ruxsat berish</title>
<style>
 :root{color-scheme:light}
 body{margin:0;background:#F4F5F7;font:17px/1.5 -apple-system,BlinkMacSystemFont,"SF Pro Text",system-ui,sans-serif;color:#1D1D1F;
   display:flex;min-height:100vh;align-items:center;justify-content:center;padding:16px}
 form{background:#fff;border-radius:20px;padding:32px;width:100%;max-width:420px}
 h1{font-size:24px;margin:0 0 8px}
 p{color:#6E6E73;font-size:15px;margin:0 0 24px}
 label{display:block;font-size:14px;font-weight:600;margin:16px 0 6px}
 input{width:100%;box-sizing:border-box;height:44px;padding:0 12px;font-size:16px;border:1px solid #D2D2D7;border-radius:8px;background:#fff;color:inherit}
 button{width:100%;height:52px;margin-top:24px;border:0;border-radius:980px;background:#1D1D1F;color:#fff;font-size:17px;cursor:pointer}
 .err{background:#FDECEC;color:#B3261E;border-radius:8px;padding:10px 12px;font-size:14px;margin-bottom:16px}
 .hint{font-size:13px;color:#86868B;margin-top:8px}
</style></head><body>
<form method="post" action="/oauth/consent">
 <h1>Ruxsat berish</h1>
 <p><strong>${esc(p.clientName)}</strong> do'kon admin paneliga <strong>to'liq kirish</strong> so'rayapti: tovar qo'shish, tahrirlash va rasm yuklash.</p>
 ${p.error ? `<div class="err">${esc(p.error)}</div>` : ''}
 <input type="hidden" name="client_id" value="${esc(p.clientId)}">
 <input type="hidden" name="redirect_uri" value="${esc(p.redirectUri)}">
 <input type="hidden" name="code_challenge" value="${esc(p.codeChallenge)}">
 <input type="hidden" name="state" value="${esc(p.state ?? '')}">
 <label for="label">Bu ulanish nomi</label>
 <input id="label" name="label" placeholder="Masalan: Javlonning telefoni" autocomplete="off">
 <div class="hint">Jurnalda shu nom ko'rinadi. Keyin admin'dan bekor qilish mumkin.</div>
 <label for="username">Admin login</label>
 <input id="username" name="username" autocomplete="username" required>
 <label for="password">Parol</label>
 <input id="password" name="password" type="password" autocomplete="current-password" required>
 <button type="submit">Ruxsat berish</button>
</form></body></html>`;
}
