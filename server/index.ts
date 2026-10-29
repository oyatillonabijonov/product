import { createHmac, timingSafeEqual } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import express from 'express';
import compression from 'compression';
import { createRequestHandler } from '@react-router/express';
import type { ServerBuild } from 'react-router';
import { createEnv, IMAGES_DIR } from './env.ts';
import { createBillzSync } from './billz-sync.ts';
import { createUsdRate } from './usd-rate.ts';
import { mountMcp, mountOAuth } from './mcp.ts';
import { canonicalOrigin, isMaintenanceOpen, parseTrustProxy, storefrontCacheControl } from '../shared/http-policy.ts';

/**
 * Ilova serveri — dev va production uchun bitta fayl.
 *
 * Dev'da Vite middleware rejimida ulanadi (HMR ishlaydi), production'da
 * `build/` dagi tayyor server-build yuklanadi va statik fayllar shu yerdan
 * beriladi. Reverse proxy (nginx/Caddy) oldida turishi mumkin, lekin shart
 * emas — server o'zi ham yetarli.
 */
const PORT = Number(process.env.PORT ?? 3000);
const isProd = process.env.NODE_ENV === 'production';
const env = createEnv();
// Billz sinxronizatsiyasi — bitta runner: rejalashtirgich shu yerda, admin tugmasi
// route orqali (`context.billz`). Token kiritilmagan bo'lsa tick'lar bo'sh o'tadi.
const billz = createBillzSync(env);
billz.start();
// Dollar kursi — cbu.uz'dan har 6 soatda (ustama kiritilgan bo'lsa do'kon kursini ham yangilaydi).
createUsdRate(env).start();

const app = express();
app.disable('x-powered-by');
// Oldinda reverse proxy (Coolify/Traefik yoki nginx) — `req.ip` haqiqiy mijoz manzili bo'lsin (rate limit uchun).
// Hop'lar soni `TRUST_PROXY`dan (sukut 1 — bitta Traefik); proxy'siz ishlatilsa `false`.
app.set('trust proxy', parseTrustProxy(process.env.TRUST_PROXY));

// Saytning manzili `PUBLIC_URL`dan, so'rovdagi `Host`/`X-Forwarded-Host`dan emas: sitemap, canonical,
// OAuth redirect_uri va `Secure` cookie qarori shu manzilga qaraydi, javob esa umumiy keshga tushadi —
// soxta sarlavha bilan kelgan bitta so'rov hammaga begona domenni ko'rsatmasin. `PUBLIC_URL` yo'q (dev) — tegilmaydi.
const canonical = canonicalOrigin(process.env.PUBLIC_URL);
if (canonical) {
  app.use((req, _res, next) => {
    req.headers.host = canonical.host;
    delete req.headers['x-forwarded-host'];
    req.headers['x-forwarded-proto'] = canonical.proto;
    next();
  });
}
// HTML/JS/JSON gzip — SSR sahifasi ~100 KB, siqilganda ~20 KB.
app.use(compression());
// Coolify/uptime tekshiruvi uchun.
app.get('/health', (_req, res) => { res.type('text/plain').send('ok'); });

// Minimal xavfsizlik sarlavhalari: MIME-sniffing va clickjacking'ga qarshi
// (ayniqsa cookie bilan autentifikatsiyalanadigan /admin uchun). CSP'da `script-src` ataylab yo'q —
// inline skriptlar (mavzu, Metrica) va tashqi widget'lar (Lydya, Telegram) ishlashi kerak.
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  res.setHeader('Content-Security-Policy', "frame-ancestors 'none'; object-src 'none'; base-uri 'self'");
  if (req.secure) res.setHeader('Strict-Transport-Security', 'max-age=31536000');
  next();
});

// Storefront sahifalari uchun qisqa kesh + stale-while-revalidate. Keshlashni
// oldindagi proxy bajaradi; dinamik va shaxsiy sahifalar keshlanmaydi. Yo'l React Router kabi
// normallashtiriladi (`/Kabinet`, `/kabinet.data`), sessiya yoki USD cookie'li javob — `private, no-store`
// (deploy/nginx.conf ham USD cookie bo'yicha bypass qiladi).
app.use((req, res, next) => {
  const cacheControl = storefrontCacheControl(req.method, req.originalUrl, req.headers.cookie);
  if (cacheControl) res.setHeader('Cache-Control', cacheControl);
  next();
});

// Yuklangan rasm va videolar diskdan to'g'ridan-to'g'ri: Range va ETag Express'dan (Safari `<video>` Range'siz
// o'ynamaydi). Fayl bo'lmasa keyingi qatlamga o'tadi — `images.$` route'i 404 beradi.
app.use('/images/products', express.static(join(IMAGES_DIR, 'products'), { immutable: true, maxAge: '1y', index: false, redirect: false }));

// Remote MCP va OAuth — React Router handler'idan oldin, aks holda `*` route'i ularni 404 qiladi.
mountMcp(app, env);
if (!mountOAuth(app, env)) {
  console.log('PUBLIC_URL yo\'q — OAuth ulanmadi; /mcp faqat bearer token bilan ishlaydi.');
}

// ponytail: e'longacha sayt yopiq — ochish uchun `false` qilib deploy qilinadi. 503 + Retry-After:
// Google buni vaqtincha deb tushunadi (bir necha kun xavfsiz). Admin panel, uning API'si va rasmlar ochiq;
// admin panelga kirgan odam saytni odatdagidek ko'radi (tovar joylab tekshirish uchun).
const MAINTENANCE = true;
const MAINTENANCE_OPEN = ['/admin', '/api/admin', '/images/', '/yuklash'];
const MAINTENANCE_HTML = readFileSync(new URL('./maintenance.html', import.meta.url), 'utf8');

/**
 * Admin `session` cookie'si haqiqiymi — `functions/lib/auth.ts` `verifySession` bilan bir format
 * (`base64url(json).base64url(hmac)`). U yerdan import qilinmaydi: Docker `functions/`ni tashimaydi.
 */
async function isAdmin(cookie: string | undefined): Promise<boolean> {
  const parts = /(?:^|;\s*)session=([^;]+)/.exec(cookie ?? '')?.[1].split('.') ?? [];
  if (parts.length !== 2) return false;
  const [payload, sig] = parts;
  if (!payload || !sig) return false;
  const row = await env.DB.prepare('SELECT session_secret FROM admin_auth WHERE id = 1').first<{ session_secret: string }>();
  if (!row) return false;
  const expected = Buffer.from(createHmac('sha256', row.session_secret).update(payload).digest('base64url'));
  // Bayt uzunligi — ko'p baytli belgi bilan teng satr uzunligi `timingSafeEqual`da RangeError (500) bermasin.
  const given = Buffer.from(sig);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return false;
  try {
    const { exp } = JSON.parse(Buffer.from(payload, 'base64url').toString()) as { exp: unknown };
    return typeof exp === 'number' && exp > Date.now() / 1000;
  } catch {
    return false;
  }
}

const maintenance: express.RequestHandler = async (req, res, next) => {
  // Qaror React Router marshrutlaydigan yo'lda va segment chegarasida (`/admin/../katalog` ochiq emas).
  if (!MAINTENANCE || isMaintenanceOpen(req.originalUrl, MAINTENANCE_OPEN)) return next();
  // Adminga ko'rsatilgan haqiqiy sahifa umumiy keshga tushmasin — aks holda hammaga chiqib ketadi.
  if (await isAdmin(req.headers.cookie)) { res.setHeader('Cache-Control', 'private, no-store'); return next(); }
  res.status(503).set({ 'Retry-After': '86400', 'Cache-Control': 'no-store' }).type('html').send(MAINTENANCE_HTML);
};

if (isProd) {
  // Hashlangan assetlar — uzoq muddatli kesh; qolgan statik fayllar qisqa.
  app.use('/assets', express.static('build/client/assets', { immutable: true, maxAge: '1y' }));
  // `redirect: false` — `public/blog/` kabi papka nomi marshrutga to'g'ri kelsa,
  // static qatlam uni /blog/ ga 301 qilib, sahifani o'g'irlab ketmasin.
  app.use(express.static('build/client', { maxAge: '1h', redirect: false, index: false }));
  // Build vaqtida yaratiladi — tsc uni ko'rmaydi, shu sabab tip aniqlanadi.
  const build = (await import('../build/server/index.js')) as unknown as ServerBuild;
  app.use(maintenance);
  app.use(createRequestHandler({ build, getLoadContext: (req) => ({ env, billz, ip: req.ip ?? '' }) }));
} else {
  const vite = await import('vite');
  const devServer = await vite.createServer({ server: { middlewareMode: true } });
  app.use(devServer.middlewares);
  app.use(maintenance);
  app.use(
    createRequestHandler({
      build: () => devServer.ssrLoadModule('virtual:react-router/server-build') as Promise<ServerBuild>,
      getLoadContext: (req) => ({ env, billz, ip: req.ip ?? '' }),
    }),
  );
}

// Dev server faqat shu kompyuterdan ochiladi (Vite `data/` papkasini ham bera oladi); production konteynerda
// hamma interfeysda. `HOST` ikkalasini ham almashtiradi.
const HOST = process.env.HOST || (isProd ? undefined : '127.0.0.1');
const onListen = () => {
  console.log(`${isProd ? 'production' : 'dev'} → http://${HOST ?? 'localhost'}:${PORT}`);
};
if (HOST) app.listen(PORT, HOST, onListen);
else app.listen(PORT, onListen);
