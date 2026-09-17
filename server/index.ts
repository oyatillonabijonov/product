import { join } from 'node:path';
import express from 'express';
import compression from 'compression';
import { createRequestHandler } from '@react-router/express';
import type { ServerBuild } from 'react-router';
import { createEnv, IMAGES_DIR } from './env.ts';
import { createBillzSync } from './billz-sync.ts';
import { createUsdRate } from './usd-rate.ts';

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
app.set('trust proxy', 1);
// HTML/JS/JSON gzip — SSR sahifasi ~100 KB, siqilganda ~20 KB.
app.use(compression());
// Coolify/uptime tekshiruvi uchun.
app.get('/health', (_req, res) => { res.type('text/plain').send('ok'); });

// Minimal xavfsizlik sarlavhalari: MIME-sniffing va clickjacking'ga qarshi
// (ayniqsa cookie bilan autentifikatsiyalanadigan /admin uchun).
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  next();
});

// Storefront sahifalari uchun qisqa kesh + stale-while-revalidate. Keshlashni
// oldindagi proxy bajaradi; dinamik va shaxsiy sahifalar keshlanmaydi.
const NO_CACHE = ['/admin', '/api/', '/auth/', '/images/', '/assets/'];
const NO_CACHE_EXACT = ['/search', '/savat', '/kirish', '/kabinet'];
app.use((req, res, next) => {
  if (req.method !== 'GET') return next();
  const path = req.path;
  const skip = NO_CACHE.some((p) => path.startsWith(p))
    || NO_CACHE_EXACT.some((p) => path === p || path.endsWith(p));
  // USD tanlagan foydalanuvchi sahifasi boshqa narxda chiziladi — umumiy keshga tushmasin
  // (deploy/nginx.conf ham shu cookie bo'yicha bypass qiladi).
  const usd = /(?:^|;\s*)currency=USD(?:;|$)/.test(req.headers.cookie ?? '');
  if (!skip) res.setHeader('Cache-Control', usd ? 'private, no-store' : 'public, max-age=0, s-maxage=60, stale-while-revalidate=240');
  next();
});

// Yuklangan rasm va videolar diskdan to'g'ridan-to'g'ri: Range va ETag Express'dan (Safari `<video>` Range'siz
// o'ynamaydi). Fayl bo'lmasa keyingi qatlamga o'tadi — `images.$` route'i 404 beradi.
app.use('/images/products', express.static(join(IMAGES_DIR, 'products'), { immutable: true, maxAge: '1y', index: false, redirect: false }));

if (isProd) {
  // Hashlangan assetlar — uzoq muddatli kesh; qolgan statik fayllar qisqa.
  app.use('/assets', express.static('build/client/assets', { immutable: true, maxAge: '1y' }));
  // `redirect: false` — `public/blog/` kabi papka nomi marshrutga to'g'ri kelsa,
  // static qatlam uni /blog/ ga 301 qilib, sahifani o'g'irlab ketmasin.
  app.use(express.static('build/client', { maxAge: '1h', redirect: false, index: false }));
  // Build vaqtida yaratiladi — tsc uni ko'rmaydi, shu sabab tip aniqlanadi.
  const build = (await import('../build/server/index.js')) as unknown as ServerBuild;
  app.use(createRequestHandler({ build, getLoadContext: (req) => ({ env, billz, ip: req.ip ?? '' }) }));
} else {
  const vite = await import('vite');
  const devServer = await vite.createServer({ server: { middlewareMode: true } });
  app.use(devServer.middlewares);
  app.use(
    createRequestHandler({
      build: () => devServer.ssrLoadModule('virtual:react-router/server-build') as Promise<ServerBuild>,
      getLoadContext: (req) => ({ env, billz, ip: req.ip ?? '' }),
    }),
  );
}

app.listen(PORT, () => {
  console.log(`${isProd ? 'production' : 'dev'} → http://localhost:${PORT}`);
});
