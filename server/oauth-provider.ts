import type { Response } from 'express';
import { InvalidGrantError } from '@modelcontextprotocol/sdk/server/auth/errors.js';
import type { OAuthServerProvider, AuthorizationParams } from '@modelcontextprotocol/sdk/server/auth/provider.js';
import type { OAuthRegisteredClientsStore } from '@modelcontextprotocol/sdk/server/auth/clients.js';
import type { OAuthClientInformationFull, OAuthTokens, OAuthTokenRevocationRequest } from '@modelcontextprotocol/sdk/shared/auth.js';
import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js';
import type { Env } from '../shared/runtime';
import { hashToken, newToken } from '../shared/mcp-auth.ts';
import { ACCESS_TTL, consentPage } from '../shared/oauth.ts';
import { createTokenVerifier } from './mcp-auth.ts';

/**
 * OAuth 2.1 avtorizatsiya serveri — `mcpAuthRouter` uchun.
 *
 * SDK o'zi bajaradi: klient va `redirect_uri` tekshiruvi, PKCE `S256` solishtirish
 * (`challengeForAuthorizationCode` + `pkce-challenge`), metadata, `/register`.
 * Bizda qolgani — saqlash, rozilik sahifasi va token yasash.
 *
 * **Ochiq cheklov (spec §5):** bizda bitta admin identifikatori bor, shuning uchun
 * OAuth odamni tanimaydi — rozilik ekranidagi nom o'zi aytgan nom, haqiqiy gate esa
 * admin paroli. Ko'p haqiqiy hisob kerak bo'lsa — `admin_users`, alohida ish.
 */
export function createOAuthProvider(env: Env): OAuthServerProvider {
  const verifier = createTokenVerifier(env);

  const clientsStore: OAuthRegisteredClientsStore = {
    async getClient(clientId: string): Promise<OAuthClientInformationFull | undefined> {
      const row = await env.DB.prepare('SELECT client_id, client_name, redirect_uris, created_at FROM oauth_clients WHERE client_id = ?')
        .bind(clientId)
        .first<{ client_id: string; client_name: string; redirect_uris: string; created_at: number }>();
      if (!row) return undefined;
      return {
        client_id: row.client_id,
        client_name: row.client_name,
        redirect_uris: JSON.parse(row.redirect_uris) as string[],
        client_id_issued_at: row.created_at,
        token_endpoint_auth_method: 'none',
        grant_types: ['authorization_code', 'refresh_token'],
        response_types: ['code'],
      };
    },
    async registerClient(client): Promise<OAuthClientInformationFull> {
      // Public klient + PKCE — sir berilmaydi (spec §5).
      const clientId = crypto.randomUUID();
      const issuedAt = Math.floor(Date.now() / 1000);
      await env.DB.prepare('INSERT INTO oauth_clients (client_id, client_name, redirect_uris, created_at) VALUES (?, ?, ?, ?)')
        .bind(clientId, client.client_name ?? 'Konnektor', JSON.stringify(client.redirect_uris), issuedAt)
        .run();
      return { ...client, client_id: clientId, client_id_issued_at: issuedAt };
    },
  };

  /** Access (+ixtiyoriy refresh) tokenni `admin_tokens` ga yozadi. */
  async function issueTokens(clientId: string, label: string, withRefresh: boolean): Promise<OAuthTokens> {
    const now = Math.floor(Date.now() / 1000);
    const access = newToken();
    await env.DB.prepare(
      "INSERT INTO admin_tokens (label, token_hash, kind, client_id, expires_at, created_at) VALUES (?, ?, 'oauth', ?, ?, ?)",
    ).bind(label, await hashToken(access), clientId, now + ACCESS_TTL, now).run();

    let refresh: string | undefined;
    if (withRefresh) {
      refresh = newToken();
      await env.DB.prepare(
        "INSERT INTO admin_tokens (label, token_hash, kind, client_id, expires_at, created_at) VALUES (?, ?, 'refresh', ?, NULL, ?)",
      ).bind(label, await hashToken(refresh), clientId, now).run();
    }
    return { access_token: access, token_type: 'Bearer', expires_in: ACCESS_TTL, scope: 'admin', refresh_token: refresh };
  }

  return {
    get clientsStore() { return clientsStore; },

    async authorize(client: OAuthClientInformationFull, params: AuthorizationParams, res: Response): Promise<void> {
      // SDK `client_id`, `redirect_uri` va `code_challenge_method=S256` ni allaqachon
      // tekshirdi. Bizning ishimiz — odamdan parol va nom so'rash.
      res.type('html').send(consentPage({
        clientName: client.client_name ?? 'Konnektor',
        clientId: client.client_id,
        redirectUri: params.redirectUri,
        codeChallenge: params.codeChallenge,
        state: params.state,
      }));
    },

    async challengeForAuthorizationCode(client: OAuthClientInformationFull, authorizationCode: string): Promise<string> {
      const row = await env.DB.prepare('SELECT client_id, code_challenge, expires_at FROM oauth_codes WHERE code_hash = ?')
        .bind(await hashToken(authorizationCode))
        .first<{ client_id: string; code_challenge: string; expires_at: number }>();
      if (!row || row.client_id !== client.client_id) throw new InvalidGrantError('Kod topilmadi');
      if (row.expires_at < Math.floor(Date.now() / 1000)) throw new InvalidGrantError('Kod muddati tugagan');
      return row.code_challenge;
    },

    async exchangeAuthorizationCode(
      client: OAuthClientInformationFull,
      authorizationCode: string,
      _codeVerifier?: string,
      redirectUri?: string,
    ): Promise<OAuthTokens> {
      const hash = await hashToken(authorizationCode);
      const row = await env.DB.prepare('SELECT client_id, redirect_uri, label, expires_at FROM oauth_codes WHERE code_hash = ?')
        .bind(hash)
        .first<{ client_id: string; redirect_uri: string; label: string; expires_at: number }>();
      // Kod bir martalik: topilgan zahoti o'chiriladi, keyin tekshiriladi.
      await env.DB.prepare('DELETE FROM oauth_codes WHERE code_hash = ?').bind(hash).run();
      if (!row || row.client_id !== client.client_id) throw new InvalidGrantError('Kod topilmadi');
      if (row.expires_at < Math.floor(Date.now() / 1000)) throw new InvalidGrantError('Kod muddati tugagan');
      if (redirectUri !== undefined && redirectUri !== row.redirect_uri) throw new InvalidGrantError('redirect_uri mos emas');
      return issueTokens(client.client_id, row.label, true);
    },

    async exchangeRefreshToken(client: OAuthClientInformationFull, refreshToken: string): Promise<OAuthTokens> {
      const row = await env.DB.prepare(
        "SELECT label, client_id FROM admin_tokens WHERE token_hash = ? AND kind = 'refresh' AND revoked_at IS NULL",
      )
        .bind(await hashToken(refreshToken))
        .first<{ label: string; client_id: string | null }>();
      if (!row || row.client_id !== client.client_id) throw new InvalidGrantError('Refresh token yaroqsiz');
      // Eski access tokenlar (shu client_id'ning 'oauth' qatorlari) yangisi kelganda
      // bekor qilinadi — aks holda har refresh'da admin ro'yxati o'lik qator bilan
      // to'lib boraveradi (refresh tokenning o'zi shu qatorda emas — u qoladi).
      await env.DB.prepare("UPDATE admin_tokens SET revoked_at = unixepoch() WHERE client_id = ? AND kind = 'oauth' AND revoked_at IS NULL")
        .bind(client.client_id)
        .run();
      return issueTokens(client.client_id, row.label, false);
    },

    async verifyAccessToken(token: string): Promise<AuthInfo> {
      return verifier.verifyAccessToken(token);
    },

    async revokeToken(client: OAuthClientInformationFull, request: OAuthTokenRevocationRequest): Promise<void> {
      await env.DB.prepare('UPDATE admin_tokens SET revoked_at = unixepoch() WHERE token_hash = ? AND client_id = ? AND revoked_at IS NULL')
        .bind(await hashToken(request.token), client.client_id)
        .run();
    },
  };
}
