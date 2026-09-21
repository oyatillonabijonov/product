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
