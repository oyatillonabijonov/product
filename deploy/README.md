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

Eski D1 va R2'da ma'lumot qolgan bo'lsa, **Cloudflare hisobini o'chirishdan oldin** ko'chirib oling:

```bash
# Baza — SQL dump
npx wrangler d1 export taqsit-store-db --remote --output=d1-dump.sql
sqlite3 /var/lib/product-store/store.db < d1-dump.sql

# Rasmlar — R2 dan yuklab olish (rclone yoki aws-cli S3 API orqali)
rclone copy r2:taqsit-store-images /var/lib/product-store/images/products
```

Dump ichida `d1_migrations` jadvali bo'lishi mumkin — u zarar qilmaydi, ammo `_migrations` jadvali bo'sh bo'lsa `npm run migrate` migratsiyalarni qaytadan qo'llashga urinadi. Shuning uchun import qilingandan keyin qaysi migratsiyalar allaqachon bajarilganini belgilab qo'ying:

```bash
node -e "const D=require('better-sqlite3'),fs=require('fs');const db=new D('/var/lib/product-store/store.db');db.exec('CREATE TABLE IF NOT EXISTS _migrations (name TEXT PRIMARY KEY, applied_at TEXT NOT NULL)');const s=db.prepare('INSERT OR IGNORE INTO _migrations VALUES (?, ?)');for(const f of fs.readdirSync('migrations').filter(f=>f.endsWith('.sql')).sort())s.run(f,new Date().toISOString())"
```

## Muhit o'zgaruvchilari

| Nomi | Sukut | Izoh |
|---|---|---|
| `PORT` | 3000 | Server porti |
| `DATA_DIR` | `data` | Baza va rasmlar papkasi |
| `DATABASE_PATH` | `$DATA_DIR/store.db` | Baza fayli |
| `IMAGES_DIR` | `$DATA_DIR/images` | Yuklangan rasmlar |
| `NODE_ENV` | — | `production` bo'lsa build'dan ishlaydi |

Sirlar (Telegram bot tokeni, OAuth kalitlari, admin paroli) muhit o'zgaruvchilarida emas — ular bazadagi `site_config` va `admin_auth` qatorlarida, admin panelidan boshqariladi. Bu Cloudflare davridan qolgan yondashuv va o'z kuchida qoladi.
