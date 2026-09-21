import express, { type Express } from 'express';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { requireBearerAuth } from '@modelcontextprotocol/sdk/server/auth/middleware/bearerAuth.js';
import { mcpAuthRouter } from '@modelcontextprotocol/sdk/server/auth/router.js';
import type { Env } from '../shared/runtime';
import { AdminClient } from '../shared/mcp-client.ts';
import { registerSharedTools } from '../shared/mcp-register.ts';
import { createTokenVerifier } from './mcp-auth.ts';
import { createOAuthProvider } from './oauth-provider.ts';
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

/** `PUBLIC_URL`ning tozalangan qiymati (oxiridagi `/` kesilgan) — sozlanmagan bo'lsa `undefined`. */
function configuredOrigin(): string | undefined {
  const configured = process.env.PUBLIC_URL?.trim();
  return configured ? configured.replace(/\/+$/, '') : undefined;
}

/**
 * So'rovdan o'z manzilimiz — tool'lar shu manzilga qaytib `/api/admin/*` chaqiradi.
 * `PUBLIC_URL` sozlangan bo'lsa o'shani ishlatamiz (`x-forwarded-*`/`host` Express
 * tomonidan `trust proxy` bilan tasdiqlanmaydi); bo'lmasa so'rovdan chiqarib olinadi.
 */
function originOf(req: express.Request): string {
  const configured = configuredOrigin();
  if (configured) return configured;
  const proto = (req.headers['x-forwarded-proto'] as string | undefined)?.split(',')[0].trim() ?? req.protocol;
  return `${proto}://${req.get('host')}`;
}

export function mountMcp(app: Express, env: Env): void {
  const verifier = createTokenVerifier(env);
  // `originOf(req)` bilan bir xil tozalangan qiymat: oxiridagi `/` saqlanib qolsa
  // `resource_metadata` manzili qo'sh chiziq bilan chiqib (`…//.well-known/…`) 404 berardi.
  // Sozlanmagan bo'lsa sarlavhaga nisbiy (mutlaq bo'lmagan) URL qo'shmaymiz — u RFC 9728
  // bo'yicha yaroqsiz.
  const publicOrigin = configuredOrigin();

  app.all('/mcp', (req, res, next) => {
    if (allowMcp(req.ip ?? '')) return next();
    res.status(429).json({ error: 'too_many_requests' });
  });

  app.all('/mcp', requireBearerAuth({
    verifier,
    requiredScopes: ['admin'],
    ...(publicOrigin ? { resourceMetadataUrl: `${publicOrigin}/.well-known/oauth-protected-resource/mcp` } : {}),
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

/**
 * OAuth 2.1 avtorizatsiya serveri — claude.ai konnektori uchun.
 *
 * `mcpAuthRouter` ilova **ildiziga** o'rnatilishi shart (SDK talabi): u
 * `/.well-known/oauth-authorization-server`, `/.well-known/oauth-protected-resource/mcp`,
 * `/authorize`, `/token`, `/register`, `/revoke` yo'llarini oladi. Shuning uchun
 * React Router handler'idan **oldin** ulanadi. Rozilik formasining POST'i
 * (`/oauth/consent`) esa bu router ro'yxatida yo'q — u React Router route'i
 * (`app/routes/oauth.consent.tsx`) bo'lib qoladi va shu qatordan pastga tushib boradi.
 *
 * `PUBLIC_URL` kerak: metadata ichidagi manzillar mutlaq bo'lishi shart va ularni
 * so'rovdan taxmin qilib bo'lmaydi (klient metadatani boshqa yo'ldan o'qishi mumkin).
 */
export function mountOAuth(app: Express, env: Env): boolean {
  const publicUrl = process.env.PUBLIC_URL;
  if (!publicUrl) return false;

  // `new URL(...)` istisno tashlashi mumkin (masalan "not-a-url") — bu boot vaqtida,
  // request handler'lar ulanishidan OLDIN chaqiriladi, shuning uchun tutilmagan xato
  // butun serverni yiqitadi. Sxemasiz qiymat ("localhost:3000") esa istisno tashlamaydi —
  // `URL` uni "localhost:" sxemasi deb noto'g'ri o'qiydi — shuning uchun protokol ham
  // tekshiriladi.
  let issuerUrl: URL;
  try {
    issuerUrl = new URL(publicUrl);
  } catch {
    console.log(`PUBLIC_URL yaroqsiz manzil (${publicUrl}) — OAuth ulanmadi; /mcp faqat bearer token bilan ishlaydi.`);
    return false;
  }
  // SDK'ning `mcpAuthRouter`i ichida `checkIssuerUrl` xuddi shu uch qoidani yana
  // tekshiradi va mos kelmasa istisno tashlaydi — pastdagi try/catch uni baribir
  // tutadi, lekin shu yerda oldindan aniqroq xabar bilan rad etamiz (eng ko'p
  // uchraydigan xato — `http://` bilan yozilgan manzil).
  const isLocal = issuerUrl.hostname === 'localhost' || issuerUrl.hostname === '127.0.0.1';
  if (issuerUrl.protocol !== 'https:' && !isLocal) {
    console.log(`PUBLIC_URL https:// bilan boshlanishi shart (localhost bundan mustasno), olindi: ${publicUrl} — OAuth ulanmadi; /mcp faqat bearer token bilan ishlaydi.`);
    return false;
  }
  if (issuerUrl.search) {
    console.log(`PUBLIC_URL so'rov satrini (?...) o'z ichiga olmasligi kerak: ${publicUrl} — OAuth ulanmadi; /mcp faqat bearer token bilan ishlaydi.`);
    return false;
  }
  if (issuerUrl.hash) {
    console.log(`PUBLIC_URL fragmentni (#...) o'z ichiga olmasligi kerak: ${publicUrl} — OAuth ulanmadi; /mcp faqat bearer token bilan ishlaydi.`);
    return false;
  }

  try {
    app.use(mcpAuthRouter({
      provider: createOAuthProvider(env),
      issuerUrl,
      resourceServerUrl: new URL('/mcp', issuerUrl),
      scopesSupported: ['admin'],
      resourceName: 'ProDuct admin',
    }));
  } catch (e) {
    // `mcpAuthRouter` boot vaqtida (hali `app.listen`gacha) chaqiriladi — yuqoridagi
    // tekshiruv qamramagan holat (SDK ichidagi qoida qattiqroq bo'lsa) shu yerda
    // tutilmasa, butun sayt ko'tarilmay qoladi.
    const reason = e instanceof Error ? e.message : String(e);
    console.log(`PUBLIC_URL (${publicUrl}) OAuth uchun yaroqsiz: ${reason} — OAuth ulanmadi; /mcp faqat bearer token bilan ishlaydi.`);
    return false;
  }
  return true;
}
