# 8-bo'lak — Taqsit skin (to'liq tokenizatsiya) — Design Spec

**Sana:** 2026-07-03
**Status:** Approved (foydalanuvchi "davom et qolgan vazifalarda")
**Bo'lak:** Platforma qayta qurishning 8-bo'lagi — OXIRGISI (7-bo'lak TUGADI)

---

## 1. Maqsad

Hozirgi premium Apple-minimal dizayn **birinchi tema ("Taqsit skin")** sifatida rasmiylashtiriladi: komponentlardagi barcha qattiq-kodlangan hex ranglar (~26 xil qiymat, ~380 joy, 39 fayl) Tailwind v4 `@theme` tokenlariga ko'chadi. Natija: **yangi do'kon rebrand'i = faqat `app/styles.css` @theme bloki + `site.config.ts` + logo/rasmlar** — komponent kodi tegilmaydi. Vizual natija **pixel-parity**: token qiymatlari hozirgi hex'lar bilan aynan bir xil, hech qanday ko'rinish o'zgarishi YO'Q (bitta istisno: §3 danger).

## 2. Token xaritasi (`app/styles.css` `@theme`, mavjud 5 tasi saqlanadi)

| Token | Qiymat | Semantika |
|---|---|---|
| `--color-primary` | #1D1D1F | asosiy matn/qora (mavjud) |
| `--color-body` | #3A3A3C | uzun matn |
| `--color-muted` | #6E6E73 | ikkilamchi matn |
| `--color-muted-2` | #86868B | uchlamchi matn |
| `--color-muted-3` | #9A9AA0 | past darajali matn |
| `--color-disabled` | #C7C7CC | o'chirilgan/placeholder |
| `--color-disabled-2` | #B0B0B5 | chizilgan eski narx |
| `--color-accent` | #0071E3 | brend aksenti (mavjud) |
| `--color-accent-hover` | #0077ED | aksent hover |
| `--color-accent-soft` | #EAF3FF | aksent fon |
| `--color-accent-soft-2` | #DCEBFF | aksent fon-2 |
| `--color-accent-bright` | #00A2FF | gradient yorqin nuqta |
| `--color-bg` | #F5F5F7 | sahifa/karta fon (mavjud) |
| `--color-row-alt` | #FAFAFC | jadval juft qator |
| `--color-fill-2` | #E8E8ED | ikkilamchi fill |
| `--color-line` | #D2D2D7 | asosiy border |
| `--color-line-2` | #E5E5EA | admin border |
| `--color-line-3` | #ECECEF | karta border |
| `--color-divider` | #F0F0F2 | ichki ajratgich |
| `--color-segment` | #F0F0F3 | segment-control fon |
| `--color-trust` | #1B7A34 | ishonch yashili (mavjud) |
| `--color-trust-soft` | #E8F5E9 | ishonch fon |
| `--color-sale` | #E8462D | chegirma (mavjud) |
| `--color-danger` | #E30000 | admin xavfli amal |

**Tokenlashtirilmaydi:** `#FFFFFF`/oq (universal), `#25D366` (WhatsApp brend rangi — tashqi identity), shadow ichidagi `rgba(...)` qiymatlar (mavjud `--shadow-*` tokenlarda qoladi).

## 3. Almashtirish qoidasi

- Mexanik: klass satrlarida `-[#HEX]` → `-tokenNomi` (barcha prefikslar bilan ishlaydi: `text-`, `bg-`, `border-`, `from-`, `via-`, `to-`, `fill-`, `hover:bg-` va h.k.; opacity modifikatorlar saqlanadi: `border-[#D2D2D7]/50` → `border-line/50`).
- Qamrov: `src/store/`, `src/admin/`, `app/` (root/routes). `src/components/` (o'lik legacy kod) **tegilmaydi**.
- Klass-satrdan tashqari kontekstlar (inline `style={{}}`, SVG fill va h.k.) qo'lda ko'rib chiqiladi — grep bilan topiladi.
- Yagona vizual o'zgarish YO'Q — hattoki `#E30000` (admin) ham o'z qiymatida `--color-danger` bo'ladi (E8462D bilan birlashtirish keyingi dizayn-qaroriga qoldiriladi).

## 4. Tekshiruv (dizayn-regressiyasiz kafolat)

- `grep -rE '#[0-9A-Fa-f]{6}' src/store src/admin app --include='*.tsx'` → faqat oq/`#25D366`/rgba qoldiqlari (whitelist).
- `bun run lint` + `bun run test` (87) + `bun run build` toza; build CSS'ida barcha 24 token qiymati mavjudligini grep bilan tasdiqlash.
- Tokenlar aynan eski hex qiymatlariga teng → renderda pixel-parity.

## 5. CLAUDE.md yangilanishi

"Design system & rebrand seam" bo'limi yangi holatga keltiriladi: to'liq token ro'yxati emas, printsip — "hex komponentlarda taqiqlangan; palette faqat @theme'da".

## 6. Chegaralar (YO'Q)

Ranglarni birlashtirish/soddalash, dark mode, font almashtirish, radius/shadow qayta ko'rish, ikkinchi tema yaratish, admin dizaynini qayta ishlash.
