import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { TooManyRequestsError } from '@modelcontextprotocol/sdk/server/auth/errors.js';
import type { OAuthClientInformationFull } from '@modelcontextprotocol/sdk/shared/auth.js';
import { openDatabase } from '../server/sqlite.ts';
import { createOAuthProvider } from '../server/oauth-provider.ts';
import type { Env } from './runtime';

const DAY = 24 * 3600;
const now = () => Math.floor(Date.now() / 1000);

let env: Env;

async function migrate(file: string) {
  const sql = readFileSync(new URL(`../migrations/${file}`, import.meta.url), 'utf8')
    .split('\n').filter((l) => !l.trim().startsWith('--')).join('\n');
  for (const stmt of sql.split(';').map((s) => s.trim()).filter(Boolean)) await env.DB.prepare(stmt).run();
}

/** SDK `/register` handler'i registerClient'ga beradigan narsa (confidential so'rov). */
const sdkInput = (): OAuthClientInformationFull => ({
  client_id: 'sdk-generated',
  client_id_issued_at: now(),
  client_secret: 'f'.repeat(64),
  client_secret_expires_at: now() + 30 * DAY,
  token_endpoint_auth_method: 'client_secret_post',
  redirect_uris: ['https://claude.ai/api/mcp/auth_callback'],
  client_name: 'Claude',
});

const register = () => createOAuthProvider(env).clientsStore.registerClient!(sdkInput());
const insertClient = (id: string, createdAt: number) =>
  env.DB.prepare('INSERT INTO oauth_clients (client_id, client_name, redirect_uris, created_at) VALUES (?, ?, ?, ?)')
    .bind(id, 'x', '[]', createdAt).run();
const ids = async () =>
  (await env.DB.prepare('SELECT client_id FROM oauth_clients ORDER BY client_id').all<{ client_id: string }>()).results.map((r) => r.client_id);

beforeEach(async () => {
  env = { DB: openDatabase(':memory:') } as unknown as Env;
  await migrate('0039_mcp_tokens.sql');
  await migrate('0040_oauth.sql');
});

describe('registerClient', () => {
  it("saqlangan public klientni qaytaradi — sir va client_secret_post yo'q", async () => {
    const c = await register();
    expect(c.token_endpoint_auth_method).toBe('none');
    expect(c).not.toHaveProperty('client_secret');
    expect(c).not.toHaveProperty('client_secret_expires_at');
    expect(c.client_id).not.toBe('sdk-generated');
    expect(await createOAuthProvider(env).clientsStore.getClient(c.client_id)).toEqual(c);
  });

  it("so'nggi soatda 50 ta yoki jami 500 ta bo'lsa rad etadi", async () => {
    for (let i = 0; i < 50; i++) await insertClient(`r${i}`, now() - 60);
    await expect(register()).rejects.toBeInstanceOf(TooManyRequestsError);

    env = { DB: openDatabase(':memory:') } as unknown as Env;
    await migrate('0039_mcp_tokens.sql');
    await migrate('0040_oauth.sql');
    for (let i = 0; i < 500; i++) await insertClient(`old${i}`, now() - 2 * DAY);
    await expect(register()).rejects.toBeInstanceOf(TooManyRequestsError);
  });

  it("30 kundan eski, kodi va tokeni yo'q klientni o'chiradi; ishlatilganini qoldiradi", async () => {
    const old = now() - 31 * DAY;
    await insertClient('stale', old);
    await insertClient('with-token', old);
    await insertClient('with-revoked', old);
    await insertClient('with-code', old);
    await insertClient('fresh', now() - DAY);
    await env.DB.prepare("INSERT INTO admin_tokens (label, token_hash, kind, client_id) VALUES ('a', 'h1', 'refresh', 'with-token')").run();
    await env.DB.prepare("INSERT INTO admin_tokens (label, token_hash, kind, client_id, revoked_at) VALUES ('a', 'h2', 'oauth', 'with-revoked', 1)").run();
    await env.DB.prepare("INSERT INTO oauth_codes (code_hash, client_id, redirect_uri, code_challenge, label, expires_at) VALUES ('c', 'with-code', 'u', 'x', 'l', 0)").run();

    const c = await register();
    expect(await ids()).toEqual([c.client_id, 'fresh', 'with-code', 'with-revoked', 'with-token'].sort());
  });
});
