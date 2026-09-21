import { InvalidTokenError } from '@modelcontextprotocol/sdk/server/auth/errors.js';
import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js';
import type { Env } from '../shared/runtime';
import { hashToken } from '../shared/mcp-auth.ts';

/**
 * `admin_tokens` ustidagi `OAuthTokenVerifier`. Bitta tekshiruvchi ikkala turdagi
 * tokenga xizmat qiladi: admin'da qo'lda yaratilgani (`kind='manual'`) va OAuth
 * bergani (`kind='oauth'`) — bekor qilish ham, muddat ham bitta joyda.
 *
 * `kind='refresh'` **qasddan rad etiladi**: refresh token faqat `/token` endpoint'ida
 * yangi access tokenga almashish uchun; u bilan admin API'ga kirib bo'lmasligi kerak.
 */
export function createTokenVerifier(env: Env): { verifyAccessToken(token: string): Promise<AuthInfo> } {
  return {
    async verifyAccessToken(token: string): Promise<AuthInfo> {
      const row = await env.DB.prepare(
        "SELECT label, kind, client_id, expires_at FROM admin_tokens WHERE token_hash = ? AND revoked_at IS NULL AND kind != 'refresh'",
      )
        .bind(await hashToken(token))
        .first<{ label: string; kind: string; client_id: string | null; expires_at: number | null }>();
      const now = Math.floor(Date.now() / 1000);
      if (!row) throw new InvalidTokenError('Token yaroqsiz yoki bekor qilingan');
      if (row.expires_at !== null && row.expires_at < now) throw new InvalidTokenError('Token muddati tugagan');
      return {
        token,
        clientId: row.client_id ?? row.label,
        scopes: ['admin'],
        // `requireBearerAuth` `expiresAt` ni **majburiy son** deb talab qiladi (yo'q bo'lsa
        // «Token has no expiration time» bilan 401 beradi). Muddatsiz token uchun har
        // so'rovda bir soat oldinga suriladi — ya'ni amalda tugamaydi, haqiqiy nazorat
        // esa `revoked_at` ustunida qoladi.
        expiresAt: row.expires_at ?? now + 3600,
      };
    },
  };
}
