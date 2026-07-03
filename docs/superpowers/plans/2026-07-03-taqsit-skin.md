# 8 — Taqsit skin (tokenizatsiya) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** All hardcoded palette hexes in live components move to Tailwind v4 `@theme` tokens with pixel-parity; rebrand seam = styles.css + site.config.ts only.

**Architecture:** Extend the existing `@theme` block with 19 new `--color-*` tokens (exact current hex values). Mechanical class-string substitution `-[#HEX]` → `-token` across `src/store/`, `app/`, then `src/admin/`. Whitelist: white, `#25D366` (WhatsApp brand), rgba inside shadows. Dead `src/components/` untouched.

**Tech Stack:** Tailwind v4 (`@theme` → auto-generated utilities), React Router v7.

## Global Constraints

- bun/bunx only. Strict TS, no `any`. `bun run lint` + `bun run test` (87) + `bun run build` green after every task.
- **Pixel-parity:** token values are byte-identical to the hexes they replace; NO visual change anywhere. `#E30000` stays #E30000 as `--color-danger`.
- `src/components/` (dead legacy) va `src/index.css` (orphan) TEGILMAYDI.
- Token→hex map (canonical, spec §2): primary #1D1D1F · body #3A3A3C · muted #6E6E73 · muted-2 #86868B · muted-3 #9A9AA0 · disabled #C7C7CC · disabled-2 #B0B0B5 · accent #0071E3 · accent-hover #0077ED · accent-soft #EAF3FF · accent-soft-2 #DCEBFF · accent-bright #00A2FF · bg #F5F5F7 · row-alt #FAFAFC · fill-2 #E8E8ED · line #D2D2D7 · line-2 #E5E5EA · line-3 #ECECEF · divider #F0F0F2 · segment #F0F0F3 · trust #1B7A34 · trust-soft #E8F5E9 · sale #E8462D · danger #E30000.
- Commit format `feat:`/`docs:`; body oxiri `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.

---

### Task 1: `@theme` tokenlari + storefront sweep (`src/store/` + `app/`)

**Files:**
- Modify: `app/styles.css` (@theme kengaytiriladi)
- Modify: `src/store/*.tsx` (barcha hex → token), `app/root.tsx`, `app/routes/*.tsx` (hex bo'lsa)

**Interfaces:**
- Produces: 24 ta `--color-*` tokeni (5 mavjud + 19 yangi); storefront'da klass-hex qolmaydi (whitelist'dan tashqari).

- [ ] **Step 1: @theme** — `app/styles.css`dagi `@theme` blokiga mavjud 5 rang tokenidan keyin qo'shilsin (qiymatlar Global Constraints xaritasidan aynan):

```css
  --color-body: #3A3A3C;
  --color-muted: #6E6E73;
  --color-muted-2: #86868B;
  --color-muted-3: #9A9AA0;
  --color-disabled: #C7C7CC;
  --color-disabled-2: #B0B0B5;
  --color-accent-hover: #0077ED;
  --color-accent-soft: #EAF3FF;
  --color-accent-soft-2: #DCEBFF;
  --color-accent-bright: #00A2FF;
  --color-row-alt: #FAFAFC;
  --color-fill-2: #E8E8ED;
  --color-line: #D2D2D7;
  --color-line-2: #E5E5EA;
  --color-line-3: #ECECEF;
  --color-divider: #F0F0F2;
  --color-segment: #F0F0F3;
  --color-trust-soft: #E8F5E9;
  --color-danger: #E30000;
```

- [ ] **Step 2: Mexanik almashtirish (storefront)** — har bir xarita jufti uchun `src/store/*.tsx`, `app/root.tsx`, `app/routes/*.tsx` fayllarida **case-insensitive** `-[#HEX]` → `-token` almashtirilsin (sed misoli, har token uchun):

```bash
# misol: muted
LC_ALL=C sed -i '' 's/-\[#6[eE]6[eE]73\]/-muted/g' src/store/*.tsx app/root.tsx app/routes/*.tsx
```

To'liq tartib: primary(#1D1D1F), body(#3A3A3C), muted(#6E6E73), muted-2(#86868B), muted-3(#9A9AA0), disabled(#C7C7CC), disabled-2(#B0B0B5), accent-hover(#0077ED) **accent(#0071E3)dan OLDIN emas — muhim emas, hexlar unikal**, accent(#0071E3), accent-soft-2(#DCEBFF), accent-soft(#EAF3FF), accent-bright(#00A2FF), row-alt(#FAFAFC), fill-2(#E8E8ED), bg(#F5F5F7), line-3(#ECECEF), line-2(#E5E5EA), line(#D2D2D7), divider(#F0F0F2), segment(#F0F0F3), trust-soft(#E8F5E9), trust(#1B7A34), sale(#E8462D), danger(#E30000).

- [ ] **Step 3: Qoldiqlarni qo'lda ko'rish** —

```bash
grep -rnE '#[0-9A-Fa-f]{6}' src/store app --include='*.tsx' --include='*.css'
```

Qolishi mumkin: `#FFFFFF`/`#fff` (oq), `#25D366` (WhatsApp), `rgba(...)` (shadow ichida), `app/styles.css`dagi token ta'riflari. Klass ichidagi boshqa har qanday hex (masalan `bg-[#FFFFFF]` emas-oq bo'lgan) — tegishli tokenga qo'lda almashtirilsin; klass-satrdan tashqari hex (inline style, SVG) topilsa — xuddi shu qiymatli CSS var'ga (`var(--color-...)`) o'tkazilsin yoki hisobotda sabab bilan qoldirilsin.

- [ ] **Step 4: Verify** — `bun run lint` clean; `bun run test` 87/87; `bun run build` succeeds; build chiqishida tokenlar borligini tekshir: `grep -c 'color-muted' build/client/assets/*.css` → >0. Vizual parity: almashtirish faqat nom, qiymat aynan — CSS'da yangi rang YO'Q.

- [ ] **Step 5: Commit**

```bash
git add app/styles.css src/store app/root.tsx app/routes
git commit -m "feat: tokenize storefront palette into @theme (Taqsit skin)"
```

---

### Task 2: Admin sweep (`src/admin/`) + CLAUDE.md

**Files:**
- Modify: `src/admin/*.tsx` (hex → token)
- Modify: `CLAUDE.md` (Design system bo'limi)

- [ ] **Step 1: Mexanik almashtirish** — Task 1 Step 2'dagi xuddi shu sed to'plami `src/admin/*.tsx`ga (jumladan `#E30000` → `-danger`, `#E5E5EA` → `-line-2`).

- [ ] **Step 2: Qoldiq tekshiruvi** — `grep -rnE '#[0-9A-Fa-f]{6}' src/admin --include='*.tsx'` → faqat oq/rgba; boshqasi qo'lda yopilsin.

- [ ] **Step 3: CLAUDE.md** — "Design system & rebrand seam" bo'limidagi rang ro'yxati jumlasi quyidagicha yangilansin (mavjud matn strukturasini saqlagan holda): palette endi **faqat** `app/styles.css` `@theme` blokida (24 semantik token: primary/body/muted×3/disabled×2/accent×5/bg/row-alt/fill-2/line×3/divider/segment/trust×2/sale/danger); **komponentlarda hex taqiqlanadi** — yangi UI kodi token utility'laridan (`text-muted`, `border-line/50`, `bg-accent-soft` ...) foydalanadi; istisnolar: oq, `#25D366` (WhatsApp brend), shadow rgba'lari. Rebrand = @theme qiymatlari + `site.config.ts` + logo/rasmlar.

- [ ] **Step 4: Verify + commit** — `bun run lint` clean; `bun run test` 87/87; `bun run build` succeeds.

```bash
git add src/admin CLAUDE.md
git commit -m "feat: tokenize admin palette and document the theme-only rebrand seam"
```
