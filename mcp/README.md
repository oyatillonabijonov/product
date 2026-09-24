# ProDuct MCP

Claude'ni do'kon admin paneliga ulaydi: tovar qo'shish, yetishmayotgan rasm va tavsifni
to'ldirish, katalog holatini so'rash.

## 1. Token oling

Admin → Sozlamalar → Integratsiyalar → «MCP tokenlari» → nom yozing → **Token yaratish**.
Token faqat bir marta ko'rsatiladi.

## 1.5. Repoda paketlarni o'rnating

```bash
bun install
```

`node mcp/stdio.ts` `node_modules` dagi MCP SDK'ni talab qiladi.

## 2. Claude Code

`~/.claude.json` (yoki loyiha `.mcp.json`) ichiga:

```json
{
  "mcpServers": {
    "product": {
      "command": "node",
      "args": ["/ABSOLUTE/PATH/product/mcp/stdio.ts"],
      "env": { "PRODUCT_URL": "https://sizning-saytingiz", "PRODUCT_TOKEN": "prod_…" }
    }
  }
}
```

## 3. Claude Desktop

`claude_desktop_config.json` — xuddi shu `mcpServers` bloki.

## Remote ulanish (claude.ai, telefon)

Claude Code o'rnatish shart emas.

1. claude.ai → Settings → Connectors → **Add custom connector**
2. Manzil: `https://<sayt>/mcp`
3. Ochilgan sahifada admin login va parolni kiriting, ulanishga nom bering
   (masalan «Javlonning telefoni») va «Ruxsat berish»ni bosing.

Ulanish admin → Sozlamalar → Integratsiyalar → «MCP tokenlari» ro'yxatida
ko'rinadi va o'sha yerdan bekor qilinadi.

**Farqi:** remote'da `image_upload_from_path` yo'q — serverda sizning
fayllaringiz yo'q. Rasm faqat `https` havola orqali (`image_upload_from_url`).

**Server sozlamasi:** `PUBLIC_URL=https://<sayt>` bo'lishi shart, aks holda OAuth
ulanmaydi (log'da yoziladi) va faqat qo'lda yaratilgan token bilan ishlaydi.

## Namunalar

- «Bu papkadagi rasmlarni qo'sh: /Users/javlon/Desktop/iphone-17. Nomi iPhone 17 Pro 256GB,
  Apple yo'nalishi, narxi 14 500 000 so'm, izoh: …»
- «Qaysi tovarlarda rasm yoki izoh yo'q?» → «Birinchi 10 tasining nomini ber»

## Cheklovlar

- **Token — to'liq admin kaliti.** Tool'lar ro'yxati tor (o'chirish va sozlamalar yo'q), lekin
  tokenning o'zi admin API'ning hammasiga kiradi. Uni faqat ishonchli kompyuterda saqlang.
- Rasm ≤ 5 MB, faqat jpg/jpeg/png/webp. Kattasi rad etiladi (server rasm qayta ishlamaydi).
- Yangi tovar **darhol saytda chiqadi** — yashirish kerak bo'lsa «shu tovarni saytdan yashir»
  deb ayting yoki admin'dagi toggle'ni o'chiring.
- Tovarga **chegirma** qo'yish mumkin (eski narx yangi narxdan katta bo'lishi shart), xususiyat
  qo'shish/o'chirish ham — bor xususiyatlarga tegmasdan.
- Tovarni saytdan yashirish **doimiy**: Billz sinxronizatsiyasi endi uni qaytarib ochmaydi.
  Billz tovarida siz o'zgartirgan maydon (narx, nom, brend, rasm, xususiyat, tavsif, yo'nalish/tur)
  ham shunday qoladi — sinxronizatsiya faqat tegilmagan maydonlarni yangilaydi.
- Chatga tashlangan rasm faylini tool saytga to'g'ridan-to'g'ri uzata olmaydi. Tovarda rasm
  kerak bo'lsa yoki egasi telefondan rasm yubormoqchi bo'lsa — «rasm yuklash havolasini ber»
  deng: `image_upload_link` 30 daqiqa ishlaydigan havola qaytaradi, egasi o'sha havoladan
  bir necha marta rasm yuklashi mumkin.
- Tovar o'chirish, sozlamalar va akkaunt tool'lari yo'q.
