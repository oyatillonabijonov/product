import express, { type Express } from 'express';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { requireBearerAuth } from '@modelcontextprotocol/sdk/server/auth/middleware/bearerAuth.js';
import type { Env } from '../shared/runtime';
import { AdminClient } from '../shared/mcp-client.ts';
import { registerSharedTools } from '../shared/mcp-register.ts';
import { createTokenVerifier } from './mcp-auth.ts';
import { createLimiter } from '../shared/rate-limit.ts';

/**
 * Remote MCP — claude.ai va istalgan qurilma uchun.
 *
 * **Stateless:** har so'rovda yangi `McpServer` + transport yig'iladi va so'rov
 * tugagach yopiladi. Sessiya saqlanmasa qayta deploy ham, bir nechta instansiya ham
 * muammo bo'lmaydi; bizning tool'larimiz holatsiz (har biri HTTP chaqiruv).
 *
 * Tool'lar o'z saytimizning `/api/admin/*` endpoint'larini **so'rovchining tokeni**
 * bilan chaqiradi — ya'ni validatsiya, slug va atomik batch joyidan qimirlamaydi va
 * jurnalda (`admin_audit`) o'sha tokenning nomi ko'rinadi.
 *
 * `image_upload_from_path` bu yerda ro'yxatga qo'shilmaydi — serverda odamning
 * fayllari yo'q (spec §3).
 */
const allowMcp = createLimiter(60, 60 * 1000);

/**
 * So'rovdan o'z manzilimiz — tool'lar shu manzilga qaytib `/api/admin/*` chaqiradi.
 * `PUBLIC_URL` sozlangan bo'lsa o'shani ishlatamiz (`x-forwarded-*`/`host` Express
 * tomonidan `trust proxy` bilan tasdiqlanmaydi); bo'lmasa so'rovdan chiqarib olinadi.
 */
function originOf(req: express.Request): string {
  const configured = process.env.PUBLIC_URL?.trim();
  if (configured) return configured.replace(/\/+$/, '');
  const proto = (req.headers['x-forwarded-proto'] as string | undefined)?.split(',')[0].trim() ?? req.protocol;
  return `${proto}://${req.get('host')}`;
}

export function mountMcp(app: Express, env: Env): void {
  const verifier = createTokenVerifier(env);

  app.all('/mcp', (req, res, next) => {
    if (allowMcp(req.ip ?? '')) return next();
    res.status(429).json({ error: 'too_many_requests' });
  });

  app.all('/mcp', requireBearerAuth({
    verifier,
    requiredScopes: ['admin'],
    resourceMetadataUrl: `${process.env.PUBLIC_URL ?? ''}/.well-known/oauth-protected-resource/mcp`,
  }));

  app.all('/mcp', async (req, res) => {
    const token = req.auth?.token;
    if (!token) { res.status(401).json({ error: 'unauthorized' }); return; }

    const server = new McpServer({ name: 'product-admin', version: '1.0.0' });
    const origin = originOf(req);
    registerSharedTools(server, new AdminClient(origin, token), { adminUrl: origin });

    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    res.on('close', () => { void transport.close(); void server.close(); });
    await server.connect(transport);
    await transport.handleRequest(req, res);
  });
}
