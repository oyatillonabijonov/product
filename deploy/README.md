# Serverga o'rnatish

Kerak bo'ladigan narsa: **Node 22.18+** (TypeScript'ni o'zi tushunadi, build qadami yo'q) va ixtiyoriy ravishda nginx. Baza — fayl (SQLite), rasmlar — papka. Alohida baza serveri yo'q.

## 1. Tayyorlash

```bash
sudo adduser --system --group --home /srv/product-store product
sudo mkdir -p /var/lib/product-store && sudo chown product:product /var/lib/product-store
```

Kodni `/srv/product-store` ga qo'ying (git clone yoki rsync), so'ng:

```bash
cd /srv/product-store
npm ci --omit=dev        # yoki: bun install --production
npm run build            # build/client + build/server
DATA_DIR=/var/lib/product-store npm run migrate
```

`migrate` `migrations/` dagi barcha `.sql` fayllarni tartib bilan qo'llaydi va qaysi biri qo'llanganini `_migrations` jadvalida saqlaydi. Yangi migratsiya qo'shilsa, deploydan keyin yana bir marta ishga tushiring.

## 2. Ishga tushirish

```bash
sudo cp deploy/product-store.service /etc/systemd/system/
sudo systemctl daemon-reload && sudo systemctl enable --now product-store
sudo journalctl -u product-store -f
```

Server `http://127.0.0.1:3000` da turadi. Oldiga nginx qo'ying:

```bash
sudo cp deploy/nginx.conf /etc/nginx/sites-available/product-store
sudo ln -s /etc/nginx/sites-available/product-store /etc/nginx/sites-enabled/
sudo mkdir -p /var/cache/nginx/product
sudo nginx -t && sudo systemctl reload nginx
```

nginx shart emas — ilova o'zi ham 80/443 da tura oladi, lekin TLS, gzip va sahifa keshi qo'lda sozlanadi.

## 3. Yangilash

```bash
cd /srv/product-store && git pull
npm ci --omit=dev && npm run build
DATA_DIR=/var/lib/product-store npm run migrate
sudo systemctl restart product-store
```

## 4. Zaxira nusxa

Hamma narsa bitta papkada:

```bash
sudo systemctl stop product-store
tar czf backup-$(date +%F).tar.gz -C /var/lib product-store
sudo systemctl start product-store
```

To'xtatmasdan olish uchun SQLite'ning o'z buyrug'i:

```bash
sqlite3 /var/lib/product-store/store.db ".backup '/tmp/store-backup.db'"
tar czf backup.tar.gz /tmp/store-backup.db /var/lib/product-store/images
```

## 5. Cloudflare'dan ma'lumot ko'chirish (bir martalik)

Eski D1 va R2'da ma'lumot qolgan bo'lsa, **Cloudflare hisobini o'chirishdan oldin** ko'chirib oling.

**Baza.** Export uchun Cloudflare'ga kirish kerak (bir marta, brauzer ochiladi):

```bash
npx wrangler login
npx wrangler d1 export taqsit-store-db --remote --output=d1-dump.sql
```

So'ng import — mavjud baza avtomatik zaxiraga olinadi, import vaqtinchalik faylda
bajariladi va faqat muvaffaqiyatda o'rniga qo'yiladi:

```bash
DATA_DIR=/var/lib/product-store npm run import:d1 d1-dump.sql
DATA_DIR=/var/lib/product-store npm run migrate
```

Skript D1'dagi `d1_migrations` ro'yxatini o'qib, o'sha migratsiyalarni qo'llangan
deb belgilaydi — shuning uchun `migrate` faqat D1'da bo'lmaganlarini (masalan
`0024`, `0025`) qo'llaydi. Oxirida u nechta rasm R2'dan kerakligini aytadi va
kalitlar ro'yxatini `images-to-copy.txt` ga yozadi.

**Rasmlar.** R2 uchun S3 API kaliti kerak (Cloudflare panel → R2 → Manage API
tokens; bu `wrangler login` dan alohida narsa):

```bash
rclone config create r2 s3 provider=Cloudflare \
  access_key_id=<KEY> secret_access_key=<SECRET> \
  endpoint=https://<ACCOUNT_ID>.r2.cloudflarestorage.com

rclone copy r2:taqsit-store-images /var/lib/product-store/images
sudo chown -R product:product /var/lib/product-store/images
```

Kalit tuzilishi saqlanadi (`products/<uuid>.webp`), shuning uchun bazadagi
`/images/...` havolalari o'zgarishsiz ishlaydi. `images-to-copy.txt` bo'sh
bo'lsa bu qadam umuman kerak emas — hamma rasm `public/` dagi statik fayllar.

Ko'chirish tugagach `.wrangler/` papkasini va `wrangler` paketini o'chirsangiz
bo'ladi.

## 6. Avto-deploy (Coolify + GitHub)

`main` ga har push'da sayt o'zi yangilanadi. Sozlash bir martalik:

1. Coolify → ilova → **Webhooks** → GitHub qatoridagi URL va **Secret**
2. GitHub repo → Settings → Webhooks → Add webhook: o'sha URL,
   `Content type: application/json`, o'sha Secret, event: **push**

Yoki CLI bilan:

```bash
gh api repos/<owner>/<repo>/hooks \
  -f name=web -F active=true -f "events[]=push" \
  -f "config[url]=http://<coolify>/webhooks/source/github/events/manual" \
  -f "config[content_type]=json" \
  -f "config[secret]=<Coolify'dagi secret>"
```

Tekshirish: `gh api repos/<owner>/<repo>/hooks/<id>/deliveries` — oxirgi
yetkazish `200` bo'lishi kerak. GitHub'ning "test delivery" tugmasi deploy
boshlamaydi (u allaqachon deploy qilingan commitni yuboradi), haqiqiy push
kerak.

Webhook xohlagan payt GitHub'dan o'chiriladi — git manbasi o'zgarmaydi.

## Muhit o'zgaruvchilari

| Nomi | Sukut | Izoh |
|---|---|---|
| `PORT` | 3000 | Server porti |
| `DATA_DIR` | `data` | Baza va rasmlar papkasi |
| `DATABASE_PATH` | `$DATA_DIR/store.db` | Baza fayli |
| `IMAGES_DIR` | `$DATA_DIR/images` | Yuklangan rasmlar |
| `NODE_ENV` | — | `production` bo'lsa build'dan ishlaydi |

Sirlar (Telegram bot tokeni, OAuth kalitlari, admin paroli) muhit o'zgaruvchilarida emas — ular bazadagi `site_config` va `admin_auth` qatorlarida, admin panelidan boshqariladi. Bu Cloudflare davridan qolgan yondashuv va o'z kuchida qoladi.
