# Admin MCP — dizayn (2026-09-21)

Do'kon egasi va u ruxsat bergan odamlar Claude bilan gaplashib saytga tovar qo'shishi, mavjud
tovarlarning yetishmayotgan ma'lumotini to'ldirishi va katalog holatini so'rashi uchun MCP server.

## 1. Ssenariylar (egasining so'zlari bilan)

1. **Rasm + izoh + narx bilan tovar qo'shish.** «Claude, manashu rasmlarni shu izoh, shu rang va shu
   narx bilan saytga joyla» — rasmlar odamning kompyuteridagi papkada yoki https havolada.
2. **Yetishmayotganini to'ldirish.** «Billz'da nechta tovarda rasm yoki izoh yo'q?» → «12 ta» →
   «Nomlarini ketma-ket yubor, men har biriga rasm va izoh beraman» → Claude joylaydi.
3. Yon ssenariy: «Bugun nechta yangi buyurtma bor?», «Falon tovar saytda ko'rinyaptimi?»

## 2. Maqsad emas (YAGNI)

- Tovar **o'chirish**, sozlamalar, akkaunt, Billz kaliti, to'lov shartlari — MCP tool'lari yo'q.
- Billz'ga yozish — hech qachon (bugungi qoida o'zgarmaydi).
- Server tomonda rasm qayta ishlash (`sharp` qo'shilmaydi): 5 MB dan katta fayl rad etiladi.
- Matn yozish/tarjima, SEO maslahati, narx strategiyasi — bular Claude'ning o'z ishi, tool emas.
- Mijoz (storefront) tomoniga hech qanday ta'sir yo'q.

## 3. Arxitektura

**MCP server — mavjud admin HTTP API ustidagi ingichka qobiq.** Hech qanday SQL yozmaydi va
validatsiyani takrorlamaydi: har bir tool `POST/PUT /api/admin/*` ni `Authorization: Bearer` bilan
chaqiradi, ya'ni `parseProductInput`, `ensureUniqueSlug`, `typeExists`, atomik `env.DB.batch()` va
`errText` kodlari — hammasi o'sha joyda qoladi.

Ikki transport, **bitta tool to'plami**:

| | Transport | Kim uchun | Rasm manbai |
|---|---|---|---|
| Lokal | stdio (`mcp/stdio.ts`) | O'z kompyuterida Claude Code / Desktop ishlatadigan odam | papka yoki fayl yo'li **va** https havola |
| Remote | Streamable HTTP, `/mcp` (`server/mcp.ts`) | claude.ai, telefon, istalgan qurilma | faqat https havola |

Farq faqat bitta tool'da: `image_upload_from_path` remote transportda ro'yxatga qo'shilmaydi
(serverda odamning fayllari yo'q).

Stdio server manzilni sozlamadan oladi (`PRODUCT_URL`, `PRODUCT_TOKEN`), shuning uchun platformaning
boshqa do'kon nusxasiga ham o'zgarishsiz ulanadi.

Yagona yangi dependency: `@modelcontextprotocol/sdk` (va uning `zod` talabi). `mcp/` papkasi Docker
image'ga **tushmaydi** — remote transport uchun kerak bo'lgan qism `server/mcp.ts` va `shared/mcp-tools.ts`.

## 4. Identifikatsiya: nomli tokenlar

- Migratsiya `0039`: `admin_tokens(id, label, token_hash, kind, client_id, expires_at, created_at,
  last_used_at, revoked_at)`.
  - `kind`: `manual` (admin'da qo'lda yaratilgan) yoki `oauth` (konnektor orqali berilgan).
  - `token_hash` — SHA-256 hex. Token qiymatining o'zi bazada saqlanmaydi.
- Token ko'rinishi `prod_` + 32 bayt hex (`randomSecretHex`). Yaratilganda **bir marta** ko'rsatiladi.
- `requireAdmin` (`app/routes/api.admin.guard.ts`) cookie'dan tashqari `Authorization: Bearer <token>`
  ni ham qabul qiladi: hash bo'yicha qidiradi, `revoked_at IS NULL` va `expires_at` tekshiriladi,
  `last_used_at` yangilanadi, natijada `label` qaytadi (bugungi `username` o'rniga).
- **Huquq darajasi — to'liq admin** (egasining qarori 2026-09-21). Ya'ni token `curl` bilan ham
  admin API'ning hammasini ocha oladi; cheklov MCP tool ro'yxatida, tokenning o'zida emas.
- Admin UI: Sozlamalar → Integratsiyalar → «MCP tokenlari» kartasi — nom kiritib yaratish, ro'yxat
  (nom, turi, oxirgi ishlatilgan sana), bekor qilish. Bekor qilish darhol kuchga kiradi.

### Jurnal

Migratsiya `0039` ikkinchi jadval: `admin_audit(id, at, token_label, tool, target_id, summary)`.
Har bir **yozuv** tool'i bitta qator qo'shadi. O'qish tool'lari yozilmaydi (shovqin). Admin'da
alohida ekran yo'q — kerak bo'lganda SQL bilan o'qiladi (YAGNI; ekran keyin qo'shiladi).

## 5. OAuth (remote transport uchun)

claude.ai konnektori MCP spetsifikatsiyasidagi OAuth 2.1 oqimini talab qiladi. Bizda
**avtorizatsiya serveri ham shu Express ilovasi** bo'ladi.

Endpoint'lar (`app/routes.ts`ga qo'shiladi):

- `GET /.well-known/oauth-protected-resource` — resurs metadatasi (RFC 9728): `resource`,
  `authorization_servers`, `scopes_supported: ["admin"]`.
- `GET /.well-known/oauth-authorization-server` — AS metadatasi (RFC 8414): `issuer`,
  `authorization_endpoint`, `token_endpoint`, `registration_endpoint`,
  `code_challenge_methods_supported: ["S256"]`, `grant_types_supported: ["authorization_code",
  "refresh_token"]`.
- `POST /oauth/register` — dinamik klient ro'yxati (RFC 7591): `client_name`, `redirect_uris`.
  Javob: `client_id` (+ `client_id_issued_at`). **Klient siri yo'q** — public client + PKCE.
- `GET /oauth/authorize` — admin login formasi (o'sha `admin_auth` paroli va throttle qoidasi) +
  rozilik ekrani: «<client_name> do'kon admin paneliga to'liq kirish so'rayapti» + **nom maydoni**
  (token jurnalda shu nom bilan ko'rinadi). Tasdiqlansa `code` bilan `redirect_uri` ga qaytaradi.
- `POST /oauth/token` — `authorization_code` (PKCE `S256` tekshiruvi bilan) va `refresh_token`
  grant'lari. Access token 30 kun, refresh token bekor qilinmaguncha.
- `/mcp` avtorizatsiyasiz so'rovga `401` + `WWW-Authenticate: Bearer resource_metadata="<url>"`.

Jadvallar — **alohida migratsiya `0040`** (1–2-bosqichda ularga ehtiyoj yo'q, oldindan yaratilmaydi):
`oauth_clients(client_id, client_name, redirect_uris, created_at)` va
`oauth_codes(code_hash, client_id, redirect_uri, code_challenge, label, expires_at)` — kod 10 daqiqa
yashaydi, bir marta ishlatiladi.

OAuth bergan access/refresh tokenlar **o'sha `admin_tokens` jadvaliga** `kind='oauth'` bilan
tushadi — ya'ni bekor qilish, jurnal va ro'yxat ikkala turdagi token uchun bitta joyda.

**Ochiq cheklov:** bizda admin identifikatori bitta (`admin_auth` — bitta qator). Shuning uchun
OAuth odamni **tanib olmaydi**: rozilik ekranida kiritilgan nom — o'zi aytgan nom, haqiqiy gate esa
admin paroli. Ko'p haqiqiy hisob kerak bo'lsa, bu alohida ish (`admin_users` jadvali) va bu specga
kirmaydi.

## 6. Tool'lar

Har bir tool javobi **qisqa** bo'ladi — model kontekstiga butun katalog tushmaydi.

### O'qish

| Tool | Kirish | Chiqish |
|---|---|---|
| `catalog_stats` | — | jami tovar, faol, yashirin, rasmi yo'q, tavsifi yo'q, qoldiq 0, Billz/qo'lda soni |
| `products_incomplete` | `missing: 'image' \| 'description' \| 'any'`, `limit` (sukut 20), `offset` | `{ id, name, missing: [...] }` ro'yxati + `nextOffset` |
| `product_get` | `id` yoki `q` (nom bo'yicha qidiruv) | bitta tovarning to'liq ma'lumoti + admin havolasi |
| `types_list` | `categoryId?` | `{ id, label, categoryId }` |
| `categories_list` | — | `{ id, name }` |
| `brands_list` | — | `{ id, name, productCount }` |

`catalog_stats` va `products_incomplete` `GET /api/admin/products` javobini (hamma tovar) MCP
server ichida filtrlaydi — admin SPA bugun aynan shunday qiladi (`quickFilter`). Modelga faqat
natija boradi.

### Yozish

| Tool | Kirish | Xulq |
|---|---|---|
| `image_upload_from_path` | `paths: string[]` (fayl yoki papka) | **faqat stdio**. Papka bo'lsa ichidagi `.jpg/.jpeg/.png/.webp` fayllar **nom bo'yicha** tartiblanadi. Har fayl ≤ 5 MB. `POST /api/admin/upload` → `{ imageUrl }` ro'yxati |
| `image_upload_from_url` | `urls: string[]` | faqat `https`, `image/*`, ≤ 5 MB, `redirect: 'manual'` (Billz rasm yuklovchisidagi qoidalar) |
| `product_create` | `name`, `categoryId`, `type`, `cashPriceUzs`, `description?`, `specs?`, `imageUrls?`, `condition?`, `brandId?` | `isActive: false` bilan yaratadi (egasi admin'da ko'rib chiqadi), javobda `id` va `/admin/products/<id>` havolasi |
| `product_update` | `id` + o'zgartiriladigan maydonlar | Billz tovari bo'lsa tegilgan maydon uchun `manual_fields` qulfini **avtomatik yoqadi** va javobda shuni aytadi |
| `product_set_images` | `id`, `imageUrls[]` | birinchisi asosiy rasm, qolgani galereya |

`product_create` va `product_update` `type`ni tekshirmaydi — server `type_invalid` bilan rad etadi
va tool xatoni o'zbekcha qaytaradi (`errText` xaritasi). Model avval `types_list` chaqiradi.

### Ataylab yo'q

`product_delete`, `settings_*`, `site_config_*`, `account_*`, `billz_sync`. Sabab: chat orqali
qaytarib bo'lmaydigan amal qilinmaydi; Billz sinxronizatsiyasi admin'dagi tugma bilan qoladi.

## 7. Rasm oqimi (aniq)

1. Odam papkani aytadi: `/Users/javlon/Desktop/iphone-17/`.
2. `image_upload_from_path` fayllarni o'qiydi, `POST /api/admin/upload` ga `multipart/form-data`
   bilan yuboradi (bugungi route: `image/jpeg|png|webp` ≤ 5 MB, `video/mp4` ≤ 40 MB).
3. Javobdagi `/images/products/<uuid>.<ext>` havolalari `product_create` yoki
   `product_set_images` ga uzatiladi.

**Klient tomonda normalizatsiya yo'q.** Admin'dagi `normalizeImage` brauzer `canvas`iga bog'langan,
MCP'da yo'q. Ya'ni MCP orqali yuklangan rasm chekkasi kesilmaydi va o'lchami o'zgarmaydi — kattaroq
fayl saytda ham kattaroq yuklanadi. 5 MB chegarasidan oshsa aniq xato qaytadi.

## 8. Billz bilan kelishuv

- Yangi tovar `billz_id IS NULL` bo'lib yaratiladi — sinxronizatsiya unga hech qachon tegmaydi.
- Billz tovariga tavsif/narx/xususiyat yozilsa, `product_update` `manual_fields` ga mos kalitni
  (`description`/`price`/`specs`) qo'shadi, aks holda 30 daqiqadan keyin Billz qiymati qaytadi.
- Rasm: Billz'da rasm bo'lmasa admin (va MCP) yuklagani qoladi — bugungi qoida o'zgarmaydi.
- `name`, `billz_stock`, `is_active`, `brand`, `type` Billz tovarida baribir Billz'niki; MCP ularni
  yozishga urinmaydi va tool tavsifida shu yozilgan.

## 9. Xavfsizlik

- `/mcp` — bearer majburiy; noto'g'ri token `401` + `WWW-Authenticate`.
- IP bo'yicha rate limit (`functions/lib/rate-limit.ts` naqshi): 60 so'rov / daqiqa / IP.
- Token hash holida saqlanadi, bir marta ko'rsatiladi, bekor qilinadi, `last_used_at` yoziladi.
- OAuth: PKCE `S256` majburiy, `redirect_uri` ro'yxatdan aniq mos kelishi shart, kod 10 daqiqa va
  bir martalik.
- Sirlar hech qachon tool javobiga tushmaydi — MCP `site_config`ni umuman o'qimaydi.
- `admin_audit` har yozuv amalini kim qilganini saqlaydi.

## 10. Test

Sof mantiq (vitest), bugungi qoidaga mos — komponent va route testlari yo'q:

- `shared/mcp-tools.ts`: tool kirish sxemalari va `product_create` payload yig'ish
  (`toProductInput`) — majburiy maydon yo'q bo'lsa xato, `isActive` doim `false`.
- `manualFieldsFor(patch)` — qaysi maydon tegilsa qaysi qulf yoqiladi.
- `imagesFromPaths` uchun sof qism: papka ro'yxatini tartiblash va kengaytma bo'yicha filtr
  (fayl tizimi funksiyasi injeksiya qilinadi).
- `pkceVerify(codeVerifier, codeChallenge)` va `parseRegisterInput` (redirect_uri validatsiyasi).
- Token: `hashToken`, `tokenFromHeader` (`Bearer` ajratish, bo'sh/noto'g'ri holatlar).

Qo'lda tekshiriladi: Claude Code'ga stdio server ulanib, papkadan tovar qo'shish; claude.ai'dan
konnektor ulash va `catalog_stats` chaqirish.

## 11. Bosqichlar

1. **Token + guard** — migratsiya `0039`, `requireAdmin` bearer, admin UI kartasi, jurnal.
2. **Tool'lar va stdio** — `shared/mcp-tools.ts`, `mcp/client.ts`, `mcp/stdio.ts`, README bilan
   o'rnatish yo'riqnomasi. Shu bosqichdan keyin 1- va 2-ssenariy kompyuterda ishlaydi.
3. **Remote `/mcp`** — Streamable HTTP transport, bearer bilan (Claude Code/Desktop konfiguratsiyasi).
4. **OAuth** — metadata, dinamik registratsiya, authorize/consent, token, refresh; claude.ai
   konnektori sifatida ulanadi.

Har bosqich mustaqil ishlaydigan holatda tugaydi.

## 12. Fayl xaritasi

- Yangi: `migrations/0039_mcp_tokens.sql`, `shared/mcp-tools.ts` (+test), `shared/mcp-auth.ts`
  (hash, PKCE — +test), `mcp/client.ts`, `mcp/stdio.ts`, `mcp/README.md`, `server/mcp.ts`,
  `app/routes/oauth.authorize.tsx`, `app/routes/oauth.token.tsx`, `app/routes/oauth.register.tsx`,
  `app/routes/well-known.oauth-protected-resource.tsx`,
  `app/routes/well-known.oauth-authorization-server.tsx` (URL `app/routes.ts`da yoziladi:
  `route('.well-known/oauth-protected-resource', …)` — `sitemap.xml` bilan bir naqsh),
  `src/admin/screens/SettingsIntegrations.tsx` ichida «MCP tokenlari» kartasi,
  `app/routes/api.admin.tokens.tsx` (+`$id` bekor qilish uchun).
- O'zgaradi: `app/routes/api.admin.guard.ts` (bearer), `app/routes.ts`, `server/index.ts`
  (`/mcp` ulash), `package.json` (`@modelcontextprotocol/sdk`), `CLAUDE.md`.

## 13. Qarorlar (2026-09-21, reja yozishdan oldin)

1. Tokenlar **bitta ro'yxatda** ko'rsatiladi, `kind` ustuni bilan (`Qo'lda` / `Konnektor`) —
   alohida bo'lim yasalmaydi. Bekor qilish ikkalasiga bir xil ishlaydi.
2. `product_create` **doim yashirin** yaratadi va parametr bilan buni o'zgartirib bo'lmaydi:
   chat orqali kelgan tovar saytga egasi ko'rmasdan chiqmaydi, admin'dagi toggle bir bosish.
3. `admin_audit` uchun admin ekrani **yo'q** — kerak bo'lganda SQL bilan o'qiladi. Ekran haqiqiy
   ehtiyoj paydo bo'lganda qo'shiladi.
