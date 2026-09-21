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

## Namunalar

- «Bu papkadagi rasmlarni qo'sh: /Users/javlon/Desktop/iphone-17. Nomi iPhone 17 Pro 256GB,
  Apple yo'nalishi, narxi 14 500 000 so'm, izoh: …»
- «Qaysi tovarlarda rasm yoki izoh yo'q?» → «Birinchi 10 tasining nomini ber»

## Cheklovlar

- **Token — to'liq admin kaliti.** Tool'lar ro'yxati tor (o'chirish va sozlamalar yo'q), lekin
  tokenning o'zi admin API'ning hammasiga kiradi. Uni faqat ishonchli kompyuterda saqlang.
- Rasm ≤ 5 MB, faqat jpg/jpeg/png/webp. Kattasi rad etiladi (server rasm qayta ishlamaydi).
- Yangi tovar **yashirin** yaratiladi — saytga chiqarish admin'dagi toggle bilan.
- Tovar o'chirish, sozlamalar va akkaunt tool'lari yo'q.
