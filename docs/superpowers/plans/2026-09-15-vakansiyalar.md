# Vakansiyalar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Admin'dan boshqariladigan vakansiyalar, `/vakansiyalar` sahifasi (apple.com/careers/us tuzilishida), nomzod arizasi (Telegram + `job_applications`) va footer havolasi.

**Architecture:** Yangiliklar CRUD naqshi (migratsiya → `shared/types` → `db.ts` mapper → `validate.ts` parser → `api.admin.*` route'lar → admin List/Form) va konsultatsiya lead naqshi (`api.consult.tsx`: rate limit + honeypot + Telegram + INSERT). Sahifa — yupqa route (`loader` + `meta`) va `src/store/CareersPage.tsx` taqdimot komponenti.

**Tech Stack:** React Router v7 SSR, SQLite (`env.DB`), Tailwind v4 tokenlari, lucide-react, vitest, sharp (rasm konvertatsiyasi).

**Spec:** `docs/superpowers/specs/2026-09-15-vakansiyalar-design.md`

## Global Constraints

- Strict TypeScript, `any` yo'q; buyruqlar `bun` bilan (`bun run lint`, `bun run test`, `bun run migrate`).
- **Commit qilinmaydi** — egasi so'ramaguncha (egasining CLAUDE.md: "Never commit without my confirmation").
- Qo'llangan migratsiya tahrirlanmaydi — yangisi `migrations/0034_vacancies.sql`.
- Komponentlarda hex rang yo'q; faqat tokenlar (`text-primary`, `bg-surface`, `text-link`…), `white` literal va mavjud precedent `bg-black` (CategoryCover). `box-shadow` yo'q.
- Storefront'da eng kichik shrift 14px (`text-label`); o'lchamlar faqat shkala klasslari (`text-copy`, `text-subhead`, …), tugmalar `src/store/ui.ts`dan.
- `src/locales.ts`da har kalit uz va ru'da (lint parity tekshiradi).
- Rezyume faqat `https://` havola (≤500 belgi); lavozim nomi **serverda** `vacancyId` bo'yicha faol vakansiyadan, topilmasa "Umumiy ariza".
- Rasmlar WebP; manba PNG'lar `public/`da qolmaydi (Trash'ga).
- Xodim iqtiboslari va imtiyozlar o'ylab topilmaydi — kartalarda kompaniya nomidan gap; "Bizda ish qanday" faqat ish mazmuni faktlari.

---

### Task 1: Ma'lumotlar qatlami — migratsiya, tiplar, mapper'lar, loader

**Files:**
- Create: `migrations/0034_vacancies.sql`
- Modify: `shared/types.ts` (ApiNews'dan keyin)
- Modify: `functions/lib/db.ts` (import ro'yxati; `rowToNews`dan keyin)
- Modify: `app/lib/loaders.ts` (importlar; `loadNews`dan keyin)

**Interfaces:**
- Produces: `EmploymentType = 'full' | 'part' | 'intern'`, `ApiVacancy`, `ApiJobApplication` (shared/types); `VacancyRow`, `rowToVacancy(r): ApiVacancy`, `JobApplicationRow`, `rowToJobApplication(r): ApiJobApplication` (db.ts); `loadVacancies(env: Env): Promise<ApiVacancy[]>` (loaders.ts).

- [ ] **Step 1: Migratsiya**

`migrations/0034_vacancies.sql`:
```sql
-- Vakansiyalar (admin'dan) va nomzodlar arizalari — spec: docs/superpowers/specs/2026-09-15-vakansiyalar-design.md.
-- Arizalar `orders`ga emas, alohida jadvalga yoziladi: nomzod ma'lumoti sotuv arizalariga aralashmaydi.
CREATE TABLE vacancies (
  id             TEXT PRIMARY KEY,
  title          TEXT NOT NULL,
  title_ru       TEXT NOT NULL DEFAULT '',
  department     TEXT NOT NULL DEFAULT '',
  department_ru  TEXT NOT NULL DEFAULT '',
  employment     TEXT NOT NULL DEFAULT 'full',
  salary         TEXT NOT NULL DEFAULT '',
  salary_ru      TEXT NOT NULL DEFAULT '',
  description    TEXT NOT NULL DEFAULT '',
  description_ru TEXT NOT NULL DEFAULT '',
  sort_order     INTEGER NOT NULL DEFAULT 0,
  is_active      INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE job_applications (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at    INTEGER NOT NULL DEFAULT (unixepoch()),
  vacancy_id    TEXT,
  position      TEXT NOT NULL,
  name          TEXT NOT NULL,
  phone         TEXT NOT NULL,
  message       TEXT NOT NULL DEFAULT '',
  resume_url    TEXT NOT NULL DEFAULT '',
  status        TEXT NOT NULL DEFAULT 'new',
  telegram_sent INTEGER NOT NULL DEFAULT 0
);
```

- [ ] **Step 2: Tiplar** — `shared/types.ts`da `ApiNews` interfeysidan keyin:
```ts
/** Bandlik turi — `vacancies.employment`. */
export type EmploymentType = 'full' | 'part' | 'intern';

/** Vakansiya. uz maydonlari asosiy, `*Ru` bo'sh bo'lsa sayt o'zbekchasini ko'rsatadi. */
export interface ApiVacancy {
  id: string;
  title: string;
  titleRu: string;
  /** Bo'lim ("Sotuv", "Servis"). */
  department: string;
  departmentRu: string;
  employment: EmploymentType;
  /** Erkin matn; bo'sh bo'lsa ko'rsatilmaydi. */
  salary: string;
  salaryRu: string;
  /** Markdown — vazifalar va talablar ro'yxati. */
  description: string;
  descriptionRu: string;
  sortOrder: number;
  isActive: boolean;
}

/** Nomzod arizasi (admin → Vakansiyalar → Arizalar). */
export interface ApiJobApplication {
  id: number;
  createdAt: number;
  vacancyId: string | null;
  /** Ariza paytidagi lavozim nomi — vakansiya keyin o'chsa ham qoladi. */
  position: string;
  name: string;
  phone: string;
  message: string;
  resumeUrl: string;
  status: OrderStatus;
  telegramSent: boolean;
}
```

- [ ] **Step 3: Mapper'lar** — `functions/lib/db.ts` type importiga `ApiVacancy, ApiJobApplication, EmploymentType` qo'shing; `rowToNews`dan keyin:
```ts
export interface VacancyRow {
  id: string; title: string; title_ru: string; department: string; department_ru: string;
  employment: string; salary: string; salary_ru: string; description: string; description_ru: string;
  sort_order: number; is_active: number;
}

export function rowToVacancy(r: VacancyRow): ApiVacancy {
  return {
    id: r.id, title: r.title, titleRu: r.title_ru, department: r.department, departmentRu: r.department_ru,
    employment: r.employment as EmploymentType, salary: r.salary, salaryRu: r.salary_ru,
    description: r.description, descriptionRu: r.description_ru,
    sortOrder: r.sort_order, isActive: r.is_active === 1,
  };
}

export interface JobApplicationRow {
  id: number; created_at: number; vacancy_id: string | null; position: string; name: string; phone: string;
  message: string; resume_url: string; status: string; telegram_sent: number;
}

export function rowToJobApplication(r: JobApplicationRow): ApiJobApplication {
  return {
    id: r.id, createdAt: r.created_at, vacancyId: r.vacancy_id, position: r.position, name: r.name, phone: r.phone,
    message: r.message, resumeUrl: r.resume_url, status: r.status as OrderStatus, telegramSent: r.telegram_sent === 1,
  };
}
```

- [ ] **Step 4: Loader** — `app/lib/loaders.ts`: type importiga `ApiVacancy`, db importiga `rowToVacancy, type VacancyRow`; `loadNews`dan keyin:
```ts
/** "Vakansiyalar" sahifasi — faollari tartib bo'yicha. Xato bo'lsa bo'sh: sahifa umumiy ariza bilan ochilaveradi. */
export async function loadVacancies(env: Env): Promise<ApiVacancy[]> {
  try {
    const { results } = await env.DB.prepare('SELECT * FROM vacancies WHERE is_active = 1 ORDER BY sort_order ASC, title ASC').all<VacancyRow>();
    return results.map(rowToVacancy);
  } catch (err) {
    console.error('loadVacancies fallback:', err);
    return [];
  }
}
```

- [ ] **Step 5: Tekshiruv**

Run: `bun run migrate && sqlite3 data/store.db ".tables" | tr -s ' ' '\n' | grep -E "vacancies|job_applications" && bun run lint`
Expected: `✓ 0034_vacancies.sql`, ikkala jadval nomi, lint exit 0.

---

### Task 2: Validatsiya va Telegram matni (TDD)

**Files:**
- Test: `functions/lib/validate.test.ts`
- Modify: `functions/lib/validate.ts` (type import; `parseConsultInput`dan keyin)
- Modify: `shared/order.ts`
- Modify: `src/admin/errText.ts`

**Interfaces:**
- Consumes: `ApiVacancy`, `EmploymentType` (Task 1).
- Produces: `parseVacancyInput(body: unknown): VacancyInput` (`VacancyInput = ApiVacancy`); `interface JobApplicationInput { name; phone; message; resumeUrl; vacancyId: string | null }`; `parseJobApplicationInput(body: unknown): JobApplicationInput`; `composeJobApplicationMessage(a: JobApplicationInput, position: string, brand: string): string`.

- [ ] **Step 1: Yiqiladigan testlar** — `validate.test.ts` import ro'yxatiga `parseVacancyInput, parseJobApplicationInput`; faylga:
```ts
describe('parseVacancyInput', () => {
  it("majburiy — faqat lavozim nomi; qolgani sukut qiymatlar", () => {
    const v = parseVacancyInput({ title: ' Sotuv maslahatchisi ' });
    expect(v).toMatchObject({
      title: 'Sotuv maslahatchisi', titleRu: '', department: '', departmentRu: '', employment: 'full',
      salary: '', salaryRu: '', description: '', descriptionRu: '', sortOrder: 0, isActive: true,
    });
    expect(v.id.length).toBeGreaterThan(0);
  });
  it('nomsiz — xato', () => {
    expect(() => parseVacancyInput({ department: 'Sotuv' })).toThrow('title_required');
  });
  it('bandlik turi faqat full | part | intern', () => {
    expect(parseVacancyInput({ title: 'X', employment: 'intern' }).employment).toBe('intern');
    expect(() => parseVacancyInput({ title: 'X', employment: 'freelance' })).toThrow('employment_invalid');
  });
  it('uzun tavsif kesiladi', () => {
    expect(parseVacancyInput({ title: 'X', description: 'a'.repeat(6000) }).description).toHaveLength(4000);
  });
});

describe('parseJobApplicationInput', () => {
  const base = { name: ' Aziz ', phone: '+998 90 123-45-67' };
  it("ism va telefon majburiy; qolgani bo'sh", () => {
    expect(parseJobApplicationInput(base)).toEqual({
      name: 'Aziz', phone: '+998 90 123-45-67', message: '', resumeUrl: '', vacancyId: null,
    });
  });
  it('telefon 7–15 raqam', () => {
    expect(() => parseJobApplicationInput({ ...base, phone: '12-34' })).toThrow('phone_invalid');
    expect(() => parseJobApplicationInput({ name: 'A' })).toThrow('phone_required');
  });
  it('rezyume havolasi faqat https va 500 belgigacha', () => {
    expect(parseJobApplicationInput({ ...base, resumeUrl: 'https://t.me/aziz' }).resumeUrl).toBe('https://t.me/aziz');
    expect(() => parseJobApplicationInput({ ...base, resumeUrl: 'http://evil.example' })).toThrow('resume_invalid');
    expect(() => parseJobApplicationInput({ ...base, resumeUrl: 'javascript:alert(1)' })).toThrow('resume_invalid');
    expect(() => parseJobApplicationInput({ ...base, resumeUrl: `https://x.uz/${'a'.repeat(500)}` })).toThrow('resume_invalid');
  });
  it('xabar 1000 belgigacha kesiladi, vakansiya id ixtiyoriy', () => {
    const a = parseJobApplicationInput({ ...base, message: 'a'.repeat(1500), vacancyId: ' v1 ' });
    expect(a.message).toHaveLength(1000);
    expect(a.vacancyId).toBe('v1');
  });
});
```

- [ ] **Step 2: Yiqilishini ko'ring**

Run: `bunx vitest run functions/lib/validate.test.ts`
Expected: FAIL — `parseVacancyInput is not a function` (yoki import xatosi).

- [ ] **Step 3: Parser'lar** — `validate.ts` type importiga `ApiVacancy, EmploymentType`; `parseConsultInput`dan keyin:
```ts
const EMPLOYMENT: EmploymentType[] = ['full', 'part', 'intern'];

export type VacancyInput = ApiVacancy;

/** Vakansiya: lavozim nomi majburiy, bandlik turi enum, matnlar uzunligi cheklangan. */
export function parseVacancyInput(body: unknown): VacancyInput {
  const o = asRecord(body);
  const title = reqString(o, 'title').slice(0, 100);
  const str = (k: string, max: number) => (typeof o[k] === 'string' ? (o[k] as string).trim().slice(0, max) : '');
  const employment = o.employment === undefined ? 'full' : o.employment;
  if (!EMPLOYMENT.includes(employment as EmploymentType)) throw new ValidationError('employment_invalid');
  return {
    id: typeof o.id === 'string' && o.id.trim() !== '' ? o.id.trim() : crypto.randomUUID(),
    title, titleRu: str('titleRu', 100),
    department: str('department', 60), departmentRu: str('departmentRu', 60),
    employment: employment as EmploymentType,
    salary: str('salary', 60), salaryRu: str('salaryRu', 60),
    description: str('description', 4000), descriptionRu: str('descriptionRu', 4000),
    sortOrder: typeof o.sortOrder === 'number' ? o.sortOrder : 0,
    isActive: o.isActive === undefined ? true : Boolean(o.isActive),
  };
}

export interface JobApplicationInput {
  name: string;
  phone: string;
  message: string;
  /** Bo'sh yoki `https://` havola (Telegram, Google Drive, hh.uz). */
  resumeUrl: string;
  /** Qaysi vakansiyaga; `null` — umumiy ariza. Lavozim nomi serverda shu id bo'yicha topiladi. */
  vacancyId: string | null;
}

/** Nomzod arizasi — `parseConsultInput` naqshi; rezyume faqat `https://` havola (fayl yuklash yo'q). */
export function parseJobApplicationInput(body: unknown): JobApplicationInput {
  const o = asRecord(body);
  const name = reqString(o, 'name');
  const phone = reqString(o, 'phone');
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 7 || digits.length > 15) throw new ValidationError('phone_invalid');
  const resumeUrl = typeof o.resumeUrl === 'string' ? o.resumeUrl.trim() : '';
  if (resumeUrl !== '' && (resumeUrl.length > 500 || !/^https:\/\/\S+$/i.test(resumeUrl))) {
    throw new ValidationError('resume_invalid');
  }
  return {
    name: name.slice(0, 120),
    phone: phone.trim(),
    message: typeof o.message === 'string' ? o.message.trim().slice(0, 1000) : '',
    resumeUrl,
    vacancyId: typeof o.vacancyId === 'string' && o.vacancyId.trim() !== '' ? o.vacancyId.trim().slice(0, 100) : null,
  };
}
```

- [ ] **Step 4: O'tishini ko'ring**

Run: `bunx vitest run functions/lib/validate.test.ts`
Expected: PASS (hamma testlar).

- [ ] **Step 5: Telegram matni** — `shared/order.ts` importi: `import type { ConsultInput, JobApplicationInput } from '../functions/lib/validate';` va fayl oxiriga:
```ts
/** Nomzod arizasini Telegram matniga aylantiradi. `position` — serverda vakansiyadan topilgan nom. */
export function composeJobApplicationMessage(a: JobApplicationInput, position: string, brand: string): string {
  const lines: string[] = [`💼 ${brand} — vakansiyaga ariza`, '', `🏷 ${position}`, `👤 ${a.name}`, `📞 ${a.phone}`];
  if (a.message) lines.push('', `📝 ${a.message}`);
  if (a.resumeUrl) lines.push('', `📎 ${a.resumeUrl}`);
  return lines.join('\n');
}
```

- [ ] **Step 6: Admin xato matni** — `src/admin/errText.ts` `MESSAGES`ga: `employment_invalid: "Bandlik turi noto'g'ri",`

- [ ] **Step 7:** Run: `bun run lint && bun run test` → Expected: exit 0, hamma testlar PASS.

---

### Task 3: Admin API route'lari

**Files:**
- Create: `app/routes/api.admin.vacancies.tsx`, `app/routes/api.admin.vacancies.$id.tsx`, `app/routes/api.admin.job-applications.tsx`, `app/routes/api.admin.job-applications.$id.tsx`
- Modify: `app/routes.ts` (`api/admin/news/:id` qatoridan keyin)

**Interfaces:**
- Consumes: `parseVacancyInput` (Task 2), `rowToVacancy`, `VacancyRow`, `rowToJobApplication`, `JobApplicationRow` (Task 1), `requireAdmin`, `parseBody` (`api.admin.guard.ts`).
- Produces: `GET/POST /api/admin/vacancies` → `ApiVacancy[]` / `ApiVacancy` (201); `PUT/DELETE /api/admin/vacancies/:id`; `GET /api/admin/job-applications` → `ApiJobApplication[]`; `PATCH /api/admin/job-applications/:id` `{status}` → `{ok:true}`.

- [ ] **Step 1: `api.admin.vacancies.tsx`**
```tsx
import type { Route } from './+types/api.admin.vacancies';
import { json, rowToVacancy, type VacancyRow } from '../../functions/lib/db';
import { parseVacancyInput } from '../../functions/lib/validate';
import { requireAdmin, parseBody } from './api.admin.guard';

const COLS = 'id, title, title_ru, department, department_ru, employment, salary, salary_ru, description, description_ru, sort_order, is_active';

export async function loader({ request, context }: Route.LoaderArgs) {
  const env = context.env;
  const who = await requireAdmin(request, env);
  if (who instanceof Response) return who;
  const { results } = await env.DB.prepare('SELECT * FROM vacancies ORDER BY sort_order ASC, title ASC').all<VacancyRow>();
  return json(results.map(rowToVacancy));
}

export async function action({ request, context }: Route.ActionArgs) {
  const env = context.env;
  const who = await requireAdmin(request, env);
  if (who instanceof Response) return who;
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, { status: 405 });
  const v = parseBody(await request.json().catch(() => null), parseVacancyInput);
  if (v instanceof Response) return v;
  await env.DB.prepare(`INSERT INTO vacancies (${COLS}) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(v.id, v.title, v.titleRu, v.department, v.departmentRu, v.employment, v.salary, v.salaryRu, v.description, v.descriptionRu, v.sortOrder, v.isActive ? 1 : 0)
    .run();
  const row = await env.DB.prepare('SELECT * FROM vacancies WHERE id = ?').bind(v.id).first<VacancyRow>();
  return json(row ? rowToVacancy(row) : { error: 'insert_failed' }, { status: row ? 201 : 500 });
}
```

- [ ] **Step 2: `api.admin.vacancies.$id.tsx`**
```tsx
import type { Route } from './+types/api.admin.vacancies.$id';
import { json, rowToVacancy, type VacancyRow } from '../../functions/lib/db';
import { parseVacancyInput } from '../../functions/lib/validate';
import { requireAdmin, parseBody } from './api.admin.guard';

export async function action({ request, context, params }: Route.ActionArgs) {
  const env = context.env;
  const who = await requireAdmin(request, env);
  if (who instanceof Response) return who;
  const id = String(params.id);

  if (request.method === 'PUT') {
    const v = parseBody({ ...(((await request.json().catch(() => null)) ?? {}) as object), id }, parseVacancyInput);
    if (v instanceof Response) return v;
    await env.DB.prepare(
      'UPDATE vacancies SET title=?, title_ru=?, department=?, department_ru=?, employment=?, salary=?, salary_ru=?, description=?, description_ru=?, sort_order=?, is_active=? WHERE id=?',
    )
      .bind(v.title, v.titleRu, v.department, v.departmentRu, v.employment, v.salary, v.salaryRu, v.description, v.descriptionRu, v.sortOrder, v.isActive ? 1 : 0, id)
      .run();
    const row = await env.DB.prepare('SELECT * FROM vacancies WHERE id = ?').bind(id).first<VacancyRow>();
    if (!row) return json({ error: 'not_found' }, { status: 404 });
    return json(rowToVacancy(row));
  }

  // Arizalar o'chmaydi — ularda `position` nusxasi bor.
  if (request.method === 'DELETE') {
    await env.DB.prepare('DELETE FROM vacancies WHERE id = ?').bind(id).run();
    return json({ ok: true });
  }

  return json({ error: 'method_not_allowed' }, { status: 405 });
}
```

- [ ] **Step 3: `api.admin.job-applications.tsx`**
```tsx
import type { Route } from './+types/api.admin.job-applications';
import { json, rowToJobApplication, type JobApplicationRow } from '../../functions/lib/db';
import { requireAdmin } from './api.admin.guard';

export async function loader({ request, context }: Route.LoaderArgs) {
  const env = context.env;
  const who = await requireAdmin(request, env);
  if (who instanceof Response) return who;
  const { results } = await env.DB.prepare('SELECT * FROM job_applications ORDER BY created_at DESC, id DESC LIMIT 200').all<JobApplicationRow>();
  return json(results.map(rowToJobApplication));
}
```

- [ ] **Step 4: `api.admin.job-applications.$id.tsx`**
```tsx
import type { Route } from './+types/api.admin.job-applications.$id';
import { json } from '../../functions/lib/db';
import { requireAdmin } from './api.admin.guard';

export async function action({ request, params, context }: Route.ActionArgs) {
  const env = context.env;
  const who = await requireAdmin(request, env);
  if (who instanceof Response) return who;
  if (request.method !== 'PATCH') return json({ error: 'method_not_allowed' }, { status: 405 });
  const body = (await request.json().catch(() => null)) as { status?: string } | null;
  const status = body?.status;
  if (status !== 'new' && status !== 'contacted' && status !== 'done') {
    return json({ error: 'status_invalid' }, { status: 400 });
  }
  await env.DB.prepare('UPDATE job_applications SET status = ? WHERE id = ?').bind(status, Number(params.id)).run();
  return json({ ok: true });
}
```

- [ ] **Step 5: Ro'yxatdan o'tkazish** — `app/routes.ts`da `route('api/admin/news/:id', …)`dan keyin:
```ts
  route('api/admin/vacancies', 'routes/api.admin.vacancies.tsx'),
  route('api/admin/vacancies/:id', 'routes/api.admin.vacancies.$id.tsx'),
  route('api/admin/job-applications', 'routes/api.admin.job-applications.tsx'),
  route('api/admin/job-applications/:id', 'routes/api.admin.job-applications.$id.tsx'),
```

- [ ] **Step 6: Tekshiruv**

Run: `bun run lint && for p in vacancies job-applications; do curl -s -o /dev/null -w "$p %{http_code}\n" http://localhost:3000/api/admin/$p; done`
Expected: lint exit 0; ikkalasi `401` (sessiyasiz).

---

### Task 4: Admin UI — "Vakansiyalar" bo'limi

**Files:**
- Modify: `src/admin/api.ts`
- Create: `src/admin/VacancyForm.tsx`, `src/admin/VacancyList.tsx`, `src/admin/JobApplicationsList.tsx`, `src/admin/CareersAdmin.tsx`
- Modify: `src/admin/AdminApp.tsx`

**Interfaces:**
- Consumes: Task 3 endpoint'lari; `ApiVacancy`, `ApiJobApplication`, `EmploymentType`, `OrderStatus`; `errText`; `IconAction`; `safeHref` (`src/lib/safe-href`).
- Produces: `listVacancies`, `createVacancy`, `updateVacancy`, `deleteVacancy`, `listJobApplications`, `setJobApplicationStatus` (api.ts); `<CareersAdmin />` (AdminApp `careers` tab'ida).

- [ ] **Step 1: Mijoz funksiyalari** — `api.ts` type importiga `ApiVacancy, ApiJobApplication`; `deleteNews`dan keyin:
```ts
export async function listVacancies(): Promise<ApiVacancy[]> {
  return handle(await fetch('/api/admin/vacancies'));
}
export async function createVacancy(v: Partial<ApiVacancy>): Promise<ApiVacancy> {
  return handle(await fetch('/api/admin/vacancies', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(v),
  }));
}
export async function updateVacancy(id: string, v: Partial<ApiVacancy>): Promise<ApiVacancy> {
  return handle(await fetch(`/api/admin/vacancies/${encodeURIComponent(id)}`, {
    method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(v),
  }));
}
export async function deleteVacancy(id: string): Promise<void> {
  await handle(await fetch(`/api/admin/vacancies/${encodeURIComponent(id)}`, { method: 'DELETE' }));
}
export async function listJobApplications(): Promise<ApiJobApplication[]> {
  return handle(await fetch('/api/admin/job-applications'));
}
export async function setJobApplicationStatus(id: number, status: OrderStatus): Promise<{ ok: true }> {
  return handle(await fetch(`/api/admin/job-applications/${id}`, {
    method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ status }),
  }));
}
```

- [ ] **Step 2: `VacancyForm.tsx`**
```tsx
import { useState } from 'react';
import type { FC } from 'react';
import type { ApiVacancy, EmploymentType } from '../../shared/types';
import { createVacancy, updateVacancy } from './api';
import { errText } from './errText';

const input = 'rounded-sm w-full border border-line-2 px-3 py-2 text-[14px]';

type Form = Omit<ApiVacancy, 'id'>;

export const EMPLOYMENT_LABEL: Record<EmploymentType, string> = { full: "To'liq stavka", part: 'Yarim stavka', intern: 'Amaliyot' };

/** uz/ru juftligi bitta qatorda; `multiline` — markdown tavsif uchun textarea. */
const Pair: FC<{ label: string; hint?: string; uz: string; ru: string; onUz: (v: string) => void; onRu: (v: string) => void; multiline?: boolean }> = ({
  label, hint, uz, ru, onUz, onRu, multiline,
}) => {
  const field = (value: string, onChange: (v: string) => void) => (multiline
    ? <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={8} className={input} />
    : <input value={value} onChange={(e) => onChange(e.target.value)} className={input} />);
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <label className="text-[13px] text-muted">{label} (uz){hint && <span className="text-muted-2"> — {hint}</span>}
        {field(uz, onUz)}
      </label>
      <label className="text-[13px] text-muted">{label} (ru)
        {field(ru, onRu)}
      </label>
    </div>
  );
};

const VacancyForm: FC<{ initial: ApiVacancy | null; onSaved: () => void; onCancel: () => void }> = ({ initial, onSaved, onCancel }) => {
  const [form, setForm] = useState<Form>({
    title: initial?.title ?? '', titleRu: initial?.titleRu ?? '',
    department: initial?.department ?? '', departmentRu: initial?.departmentRu ?? '',
    employment: initial?.employment ?? 'full',
    salary: initial?.salary ?? '', salaryRu: initial?.salaryRu ?? '',
    description: initial?.description ?? '', descriptionRu: initial?.descriptionRu ?? '',
    sortOrder: initial?.sortOrder ?? 0, isActive: initial?.isActive ?? true,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const f = form as Form;
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm({ ...f, [k]: v });

  async function save() {
    if (!f.title.trim()) { setError('Lavozim nomi majburiy'); return; }
    setBusy(true); setError('');
    try {
      if (initial) await updateVacancy(initial.id, f);
      else await createVacancy(f);
      onSaved();
    } catch (e) { setError(errText(e)); }
    finally { setBusy(false); }
  }

  return (
    <div className="rounded-md bg-white p-5 mb-4 space-y-3">
      <h3 className="font-semibold">{initial ? 'Vakansiyani tahrirlash' : 'Yangi vakansiya'}</h3>
      <Pair label="Lavozim" uz={f.title} ru={f.titleRu} onUz={(v) => set('title', v)} onRu={(v) => set('titleRu', v)} />
      <Pair label="Bo'lim" hint="masalan «Sotuv», «Servis»" uz={f.department} ru={f.departmentRu} onUz={(v) => set('department', v)} onRu={(v) => set('departmentRu', v)} />
      <Pair label="Maosh" hint="bo'sh bo'lsa ko'rsatilmaydi" uz={f.salary} ru={f.salaryRu} onUz={(v) => set('salary', v)} onRu={(v) => set('salaryRu', v)} />
      <label className="block text-[13px] text-muted">Bandlik turi
        <select value={f.employment} onChange={(e) => set('employment', e.target.value as EmploymentType)} className={input}>
          {(Object.keys(EMPLOYMENT_LABEL) as EmploymentType[]).map((k) => <option key={k} value={k}>{EMPLOYMENT_LABEL[k]}</option>)}
        </select>
      </label>
      <Pair
        label="Tavsif" hint="«## Vazifalar» sarlavhasi, «- » bilan ro'yxat" multiline
        uz={f.description} ru={f.descriptionRu} onUz={(v) => set('description', v)} onRu={(v) => set('descriptionRu', v)}
      />
      <div className="flex flex-wrap items-center gap-4">
        <label className="text-[13px] text-muted">Tartib
          <input type="number" value={f.sortOrder} onChange={(e) => set('sortOrder', Number(e.target.value))} className="rounded-sm ml-2 w-20 border border-line-2 px-2 py-1.5" />
        </label>
        <label className="text-[13px] text-muted flex items-center gap-2">
          <input type="checkbox" checked={f.isActive} onChange={(e) => set('isActive', e.target.checked)} /> Faol
        </label>
      </div>
      {error && <p className="text-[13px] text-danger">{error}</p>}
      <div className="flex gap-2">
        <button onClick={save} disabled={busy} className="press px-5 py-2.5 bg-accent text-white font-semibold rounded-full disabled:opacity-50">Saqlash</button>
        <button onClick={onCancel} className="press px-5 py-2.5 text-muted font-semibold rounded-full">Bekor qilish</button>
      </div>
    </div>
  );
};

export default VacancyForm;
```

- [ ] **Step 3: `VacancyList.tsx`**
```tsx
import { useEffect, useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import type { ApiVacancy } from '../../shared/types';
import { deleteVacancy, listVacancies } from './api';
import IconAction from './IconAction';
import VacancyForm, { EMPLOYMENT_LABEL } from './VacancyForm';

/** Vakansiyalar — saytda faollari tartib bo'yicha chiqadi. */
export default function VacancyList() {
  const [items, setItems] = useState<ApiVacancy[]>([]);
  const [editing, setEditing] = useState<ApiVacancy | null>(null);
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function refresh() {
    setLoading(true);
    try {
      setItems(await listVacancies());
      setError('');
    } catch {
      setError("Yuklashda xatolik (migratsiya qo'llanganmi?)");
    } finally {
      setLoading(false);
      setEditing(null);
      setCreating(false);
    }
  }
  useEffect(() => { refresh(); }, []);

  async function remove(v: ApiVacancy) {
    if (!window.confirm(`«${v.title}» o'chirilsinmi? Unga kelgan arizalar qoladi.`)) return;
    try {
      await deleteVacancy(v.id);
      refresh();
    } catch {
      setError("O'chirishda xatolik");
    }
  }

  if (loading) return <p className="text-muted">Yuklanmoqda…</p>;
  if (error) return <p className="text-danger">{error}</p>;
  const list = items as ApiVacancy[];
  const edit = editing as ApiVacancy | null;
  return (
    <div>
      {creating && <VacancyForm initial={null} onSaved={refresh} onCancel={() => setCreating(false)} />}
      {edit && <VacancyForm key={edit.id} initial={edit} onSaved={refresh} onCancel={() => setEditing(null)} />}
      {!creating && !edit && (
        <button onClick={() => setCreating(true)} className="press mb-4 px-5 py-2.5 bg-primary text-white font-semibold rounded-full">+ Yangi vakansiya</button>
      )}
      <div className="space-y-2">
        {list.map((v) => (
          <div key={v.id} className="rounded-md bg-white p-3 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-[14px] truncate">{v.title}</div>
              <div className="text-[12px] text-muted-2 truncate">
                {[v.department, EMPLOYMENT_LABEL[v.employment], v.salary].filter(Boolean).join(' · ')} · Tartib: {v.sortOrder} · {v.isActive ? 'Faol' : 'Nofaol'}
              </div>
            </div>
            <IconAction Icon={Pencil} label="Tahrir" onClick={() => setEditing(v)} />
            <IconAction Icon={Trash2} label="O'chir" onClick={() => remove(v)} danger />
          </div>
        ))}
        {list.length === 0 && <p className="text-muted text-[14px]">Vakansiyalar yo'q — saytda umumiy ariza formasi chiqadi.</p>}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: `JobApplicationsList.tsx`**
```tsx
import { useEffect, useState } from 'react';
import type { FC } from 'react';
import type { ApiJobApplication, OrderStatus } from '../../shared/types';
import { listJobApplications, setJobApplicationStatus } from './api';
import { safeHref } from '../lib/safe-href';

const STATUS_LABEL: Record<OrderStatus, string> = { new: 'Yangi', contacted: "Bog'lanildi", done: 'Yopildi' };
const STATUS_STYLE: Record<OrderStatus, string> = {
  new: 'bg-accent-soft text-accent',
  contacted: 'bg-trust-soft text-trust',
  done: 'bg-row-alt text-muted',
};

/** Nomzodlar arizalari — OrdersPage naqshi; holat optimistik yangilanadi. */
const JobApplicationsList: FC = () => {
  const [items, setItems] = useState<ApiJobApplication[] | null>(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    listJobApplications().then(setItems).catch(() => setErr('Yuklashda xatolik'));
  }, []);

  async function changeStatus(id: number, status: OrderStatus) {
    setItems((prev: ApiJobApplication[] | null) => prev?.map((a) => (a.id === id ? { ...a, status } : a)) ?? prev);
    try {
      await setJobApplicationStatus(id, status);
    } catch {
      setErr('Holatni saqlashda xatolik');
    }
  }

  const list = items as ApiJobApplication[] | null;
  if (err && !list) return <p className="text-danger">{err}</p>;
  if (!list) return <p className="text-muted">Yuklanmoqda…</p>;

  return (
    <div>
      {err && <p className="text-danger text-[13px] mb-3">{err}</p>}
      {list.length === 0 ? (
        <p className="text-muted">Hozircha ariza yo'q.</p>
      ) : (
        <div className="space-y-3">
          {list.map((a) => {
            const resume = safeHref(a.resumeUrl);
            return (
              <div key={a.id} className="rounded-md bg-white border border-line-2 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-[15px]">{a.name}</span>
                    <a href={`tel:${a.phone}`} className="text-[13px] text-accent">{a.phone}</a>
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-accent-soft text-accent">{a.position}</span>
                    {!a.telegramSent && <span className="text-[11px] text-sale">TG yuborilmadi</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLE[a.status]}`}>{STATUS_LABEL[a.status]}</span>
                    <select value={a.status} onChange={(e) => changeStatus(a.id, e.target.value as OrderStatus)} className="rounded-xs text-[13px] border border-line-2 px-2 py-1">
                      <option value="new">Yangi</option>
                      <option value="contacted">Bog'lanildi</option>
                      <option value="done">Yopildi</option>
                    </select>
                  </div>
                </div>
                {a.message && <p className="text-[13px] text-body whitespace-pre-line">{a.message}</p>}
                {resume && (
                  <a href={resume} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-[13px] text-accent underline underline-offset-2 break-all">
                    Rezyume: {a.resumeUrl}
                  </a>
                )}
                <div className="text-[11px] text-muted-2 mt-2">{new Date(a.createdAt * 1000).toLocaleString('ru-RU')}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default JobApplicationsList;
```

- [ ] **Step 5: `CareersAdmin.tsx`**
```tsx
import { useState } from 'react';
import type { FC } from 'react';
import VacancyList from './VacancyList';
import JobApplicationsList from './JobApplicationsList';

type View = 'vacancies' | 'applications';

/** "Vakansiyalar" bo'limi — ikki tab: vakansiyalar CRUD va nomzodlar arizalari. */
const CareersAdmin: FC = () => {
  const [raw, setView] = useState<View>('vacancies');
  const view = raw as View;
  const tab = (id: View, label: string) => (
    <button
      onClick={() => setView(id)}
      className={`press rounded-full px-4 py-2 text-[14px] font-semibold ${view === id ? 'bg-accent text-white' : 'text-primary hover:bg-white'}`}
    >
      {label}
    </button>
  );
  return (
    <div>
      <div className="mb-5 flex gap-2">
        {tab('vacancies', 'Vakansiyalar')}
        {tab('applications', 'Arizalar')}
      </div>
      {view === 'vacancies' ? <VacancyList /> : <JobApplicationsList />}
    </div>
  );
};

export default CareersAdmin;
```

- [ ] **Step 6: AdminApp** — `src/admin/AdminApp.tsx`:
  - lucide importiga `Briefcase`; `import CareersAdmin from './CareersAdmin';`
  - `type Tab = … | 'pages' | 'careers';`
  - `NAV`da `pages`dan keyin: `{ id: 'careers', label: 'Vakansiyalar', Icon: Briefcase },`
  - `SECTION_TABS`ga `'careers'`
  - `{tab === 'pages' && <PageList />}`dan keyin: `{tab === 'careers' && <CareersAdmin />}`

- [ ] **Step 7: Tekshiruv**

Run: `bun run lint`
Expected: exit 0. Brauzer: `/admin/careers` — preview brauzerda admin sessiyasi bo'lsa: vakansiya yaratish → ro'yxatda chiqishi → tahrirlash → o'chirish; "Arizalar" tab'i ochiladi. Sessiya bo'lmasa parol kiritilmaydi — admin oqimini egasi tekshiradi (hisobotda aytiladi).

---

### Task 5: Ommaviy ariza API — `POST /api/job-apply`

**Files:**
- Create: `app/routes/api.job-apply.tsx`
- Modify: `app/routes.ts` (`api/consult` qatoridan keyin)

**Interfaces:**
- Consumes: `parseJobApplicationInput`, `composeJobApplicationMessage` (Task 2); `allowLead`; `rowToSiteConfig`, `SiteConfigRow`.
- Produces: `POST /api/job-apply` body `{ name, phone, message?, resumeUrl?, vacancyId?, company? }` → `{ok:true}` | 400 `{error}` | 413 | 429.

- [ ] **Step 1: Route**
```tsx
import type { Route } from './+types/api.job-apply';
import { json, rowToSiteConfig, type SiteConfigRow } from '../../functions/lib/db';
import { parseJobApplicationInput, ValidationError } from '../../functions/lib/validate';
import { allowLead } from '../../functions/lib/rate-limit';
import { composeJobApplicationMessage } from '../../shared/order';

const MAX_LEAD_BYTES = 32 * 1024;
/** Vakansiya tanlanmagan yoki topilmagan ariza — admin va botda shu nom bilan chiqadi. */
const GENERAL_POSITION = 'Umumiy ariza';

/**
 * Nomzod arizasi (auth yo'q) — `api.consult.tsx` naqshi: IP cheklovi, body chegarasi, honeypot.
 * Ariza `job_applications`ga tushadi (sotuv arizalariga aralashmaydi). Lavozim nomi mijozdan
 * olinmaydi — `vacancyId` bo'yicha faol vakansiyadan; topilmasa "Umumiy ariza".
 */
export async function action({ request, context }: Route.ActionArgs) {
  const env = context.env;
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, { status: 405 });
  if (!allowLead(context.ip || 'unknown')) return json({ error: 'too_many_requests' }, { status: 429 });
  if (Number(request.headers.get('content-length') ?? '0') > MAX_LEAD_BYTES) return json({ error: 'too_large' }, { status: 413 });

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (body && typeof body.company === 'string' && body.company !== '') return json({ ok: true });

  let input;
  try {
    input = parseJobApplicationInput(body);
  } catch (e) {
    if (e instanceof ValidationError) return json({ error: e.message }, { status: 400 });
    return json({ error: 'invalid' }, { status: 400 });
  }

  const vacancy = input.vacancyId
    ? await env.DB.prepare('SELECT id, title FROM vacancies WHERE id = ? AND is_active = 1').bind(input.vacancyId).first<{ id: string; title: string }>()
    : null;
  const position = vacancy?.title ?? GENERAL_POSITION;

  const cfgRow = await env.DB.prepare('SELECT * FROM site_config WHERE id = 1').first<SiteConfigRow>();
  const cfg = cfgRow ? rowToSiteConfig(cfgRow) : null;
  // Telegram xato bersa ham ariza saqlanadi (telegram_sent=0).
  let telegramSent = 0;
  if (cfg?.telegramBotToken && cfg.telegramOrderChatId) {
    try {
      const r = await fetch(`https://api.telegram.org/bot${cfg.telegramBotToken}/sendMessage`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ chat_id: cfg.telegramOrderChatId, text: composeJobApplicationMessage(input, position, cfg.name) }),
      });
      telegramSent = r.ok ? 1 : 0;
    } catch {
      telegramSent = 0;
    }
  }

  await env.DB.prepare(
    'INSERT INTO job_applications (vacancy_id, position, name, phone, message, resume_url, telegram_sent) VALUES (?, ?, ?, ?, ?, ?, ?)',
  )
    .bind(vacancy?.id ?? null, position, input.name, input.phone, input.message, input.resumeUrl, telegramSent)
    .run();

  return json({ ok: true });
}
```

- [ ] **Step 2: Ro'yxatdan o'tkazish** — `route('api/consult', …)`dan keyin: `route('api/job-apply', 'routes/api.job-apply.tsx'),`

- [ ] **Step 3: Tekshiruv** (rate limit 10/10 daqiqa — 4 ta so'rov yetadi)

Run:
```bash
bun run lint
curl -s -X POST http://localhost:3000/api/job-apply -H 'content-type: application/json' -d '{"name":"Sinov nomzod","phone":"+998 90 123-45-67","message":"sinov","vacancyId":"yoq-id"}'
curl -s -X POST http://localhost:3000/api/job-apply -H 'content-type: application/json' -d '{"name":"Sinov nomzod","phone":"+998 90 123-45-67","resumeUrl":"http://x.uz"}'
sqlite3 data/store.db "SELECT position, name, message, vacancy_id IS NULL FROM job_applications WHERE name='Sinov nomzod';"
sqlite3 data/store.db "DELETE FROM job_applications WHERE name='Sinov nomzod';"
```
Expected: lint exit 0; `{"ok":true}`; `{"error":"resume_invalid"}`; `Umumiy ariza|Sinov nomzod|sinov|1`; sinov qatori o'chiriladi (faqat shu task yozgan qator).

---

### Task 6: `/vakansiyalar` sahifasi, ariza formasi, footer, sitemap, rasmlar

**Files:**
- Create: `public/careers/work.webp`, `public/careers/life.webp` (sharp bilan), manba `public/work/` → Trash
- Modify: `src/store/ui.ts` (`LINK_MORE`), `src/store/AboutPage.tsx` (lokal `MORE` → `LINK_MORE`)
- Modify: `src/locales.ts` (uz + ru kalitlar)
- Create: `src/store/JobApplyForm.tsx`, `src/store/CareersPage.tsx`, `app/routes/vakansiyalar.tsx`
- Modify: `app/routes.ts`, `src/store/Footer.tsx`, `app/routes/sitemap[.]xml.tsx`

**Interfaces:**
- Consumes: `loadVacancies` (Task 1), `POST /api/job-apply` (Task 5), `localeField` (`app/lib/i18n`), `renderMarkdown`, `MdBlockView`, `Modal`, `formatUzPhone`/`isCompleteUzPhone`, `ymGoal`, `BTN_LG`/`BTN_MD`/`SECTION_HEADING`.
- Produces: `LINK_MORE` (ui.ts); `JobApplyForm: FC<{ t; vacancyId: string | null; position: string; onClose: () => void }>`; `CareersPage: FC<{ t; locale; vacancies: ApiVacancy[] }>`; route `vakansiyalar` + `vakansiyalar-lang`.

- [ ] **Step 1: Rasmlar**
```bash
cat > /tmp/claude-501/careers-webp.mjs <<'EOF'
import { createRequire } from 'node:module';
const require = createRequire('/Users/oyatillo/Documents/Apps/Stores/product/package.json');
const sharp = require('sharp');
const root = '/Users/oyatillo/Documents/Apps/Stores/product/public';
await sharp(`${root}/work/work.png`).webp({ quality: 80, effort: 6, smartSubsample: true }).toFile(`${root}/careers/work.webp`);
await sharp(`${root}/work/life.png`).webp({ quality: 90, effort: 6, smartSubsample: true }).toFile(`${root}/careers/life.webp`);
EOF
mkdir -p public/careers && bun /tmp/claude-501/careers-webp.mjs && ls -la public/careers && trash public/work
```
Expected: ikkala `.webp` (work ~50–70 KB, life ~20–30 KB), `public/work` Trash'da.

- [ ] **Step 2: `LINK_MORE`** — `src/store/ui.ts` oxiriga:
```ts
/** Matnli havola — apple.com'dagi "Batafsil ›"; `link` tokeni (qorong'i kartada ham AA). Ortidan `ChevronRight`. */
export const LINK_MORE = 'press inline-flex items-center gap-0.5 text-copy text-link hover:underline';
```
`src/store/AboutPage.tsx`: `const MORE = …` qatori va uning izohini o'chirib, importga `LINK_MORE` qo'shing; hamma `className={MORE}` → `className={LINK_MORE}`.

- [ ] **Step 3: Tarjimalar** — `src/locales.ts`, uz blokida `legalLedeReturns`dan keyin:
```ts
    footerCareers: "Vakansiyalar",
    careersMetaDesc: "{store} jamoasiga qo'shiling: ochiq vakansiyalar va ariza topshirish.",
    careersHeroTitle: "Bizga qo'shiling. O'zingiz bo'ling.",
    careersHeroCta: "Vakansiyalarni ko'rish",
    careersIntro: "ProDuct — texnikani chuqur biladigan va sevadigan odamlar jamoasi. Bu yerda siz shunchaki ishga kirmaysiz — har bir mijozga yechim topishga o'z hissangizni qo'shasiz.",
    careersWorkEyebrow: "ProDuct'da ishlash",
    careersWorkTitle: "Jamoaga qo'shiling va ishga ilhom bering.",
    careersWorkText: "Sotuv maslahatchilari, servis muhandislari, marketing va logistika — har bir jamoa mijoz to'g'ri texnika va xizmat olishi uchun ishlaydi.",
    careersWorkQuote: "Biz shunchaki texnika sotmaymiz — mijozga yechim beramiz.",
    careersQuoteBy: "ProDuct jamoasi",
    careersLifeEyebrow: "Jamoadagi hayot",
    careersLifeTitle: "Jamoamizga qo'shiling va uni birga shakllantiring.",
    careersLifeText: "Texnikani sevadigan odamlar orasida ishlaysiz: yangi qurilmalarni birinchilardan bo'lib ko'rasiz va murakkab vazifalarni birga hal qilasiz.",
    careersLifeCard: "Texnikani sevadigan odamlar orasida.",
    careersWhyTitle: "Bizda ish qanday.",
    careersWhyMuted: "Har kuni ilg'or texnika bilan.",
    careersWhyTechTitle: "Ilg'or texnika.",
    careersWhyTechText: "Apple, ish stantsiyalari, professional audio va video jihozlari bilan har kuni ishlaysiz.",
    careersWhyClientTitle: "Mijozga yechim.",
    careersWhyClientText: "Narx ro'yxatini emas, mijozning vazifasiga mos konfiguratsiyani taklif qilasiz.",
    careersWhyServiceTitle: "Texnikani ichidan bilish.",
    careersWhyServiceText: "Diagnostika va servis do'konning o'zida — qurilmalar qanday ishlashini yaqindan ko'rasiz.",
    careersWhyTeamTitle: "To'rt yo'nalish.",
    careersWhyTeamText: "Apple, PC, Audio va Video — har bir yo'nalishda o'z mutaxassislari bor.",
    careersRolesTitle: "O'zingizga yoqqan ishni toping.",
    careersRolesEmpty: "Hozir ochiq vakansiya yo'q. Umumiy ariza qoldiring — mos o'rin ochilsa, ko'rib chiqamiz.",
    careersGeneralApply: "Umumiy ariza qoldirish",
    careersGeneralPosition: "Umumiy ariza",
    careersApply: "Ariza topshirish",
    employmentFull: "To'liq stavka",
    employmentPart: "Yarim stavka",
    employmentIntern: "Amaliyot",
    careersFormTitle: "Ariza",
    careersMessage: "Tajribangiz haqida qisqacha",
    careersResume: "Rezyume havolasi (ixtiyoriy)",
    careersResumeHint: "Telegram, Google Drive yoki hh.uz havolasi",
    careersResumeInvalid: "Havola https:// bilan boshlanishi kerak",
    careersSubmit: "Ariza yuborish",
    careersDoneTitle: "Arizangiz qabul qilindi",
    careersDoneText: "Arizangizni ko'rib chiqib, telefon orqali bog'lanamiz.",
```
ru blokida `legalLedeReturns`dan keyin:
```ts
    footerCareers: "Вакансии",
    careersMetaDesc: "Присоединяйтесь к команде {store}: открытые вакансии и отклик.",
    careersHeroTitle: "Присоединяйтесь. Будьте собой.",
    careersHeroCta: "Смотреть вакансии",
    careersIntro: "ProDuct — команда людей, которые глубоко знают и любят технику. Здесь вы не просто устраиваетесь на работу — вы помогаете найти решение для каждого клиента.",
    careersWorkEyebrow: "Работа в ProDuct",
    careersWorkTitle: "Присоединяйтесь к команде и вдохновляйте работу.",
    careersWorkText: "Консультанты, сервисные инженеры, маркетинг и логистика — каждая команда работает, чтобы клиент получил правильную технику и сервис.",
    careersWorkQuote: "Мы не просто продаём технику — мы даём клиенту решение.",
    careersQuoteBy: "Команда ProDuct",
    careersLifeEyebrow: "Жизнь в команде",
    careersLifeTitle: "Присоединяйтесь к команде и формируйте её вместе с нами.",
    careersLifeText: "Вы работаете среди людей, которые любят технику: первыми видите новые устройства и вместе решаете сложные задачи.",
    careersLifeCard: "Среди людей, которые любят технику.",
    careersWhyTitle: "Как у нас работают.",
    careersWhyMuted: "Каждый день с передовой техникой.",
    careersWhyTechTitle: "Передовая техника.",
    careersWhyTechText: "Каждый день вы работаете с Apple, рабочими станциями, профессиональным аудио и видео.",
    careersWhyClientTitle: "Решение для клиента.",
    careersWhyClientText: "Предлагаете не прайс-лист, а конфигурацию под задачу клиента.",
    careersWhyServiceTitle: "Техника изнутри.",
    careersWhyServiceText: "Диагностика и сервис — прямо в магазине: вы видите, как устроены устройства.",
    careersWhyTeamTitle: "Четыре направления.",
    careersWhyTeamText: "Apple, PC, аудио и видео — в каждом направлении свои специалисты.",
    careersRolesTitle: "Найдите работу по душе.",
    careersRolesEmpty: "Сейчас открытых вакансий нет. Оставьте общую заявку — рассмотрим её, когда откроется подходящее место.",
    careersGeneralApply: "Оставить общую заявку",
    careersGeneralPosition: "Общая заявка",
    careersApply: "Откликнуться",
    employmentFull: "Полная занятость",
    employmentPart: "Частичная занятость",
    employmentIntern: "Стажировка",
    careersFormTitle: "Отклик",
    careersMessage: "Коротко о вашем опыте",
    careersResume: "Ссылка на резюме (необязательно)",
    careersResumeHint: "Ссылка на Telegram, Google Drive или hh.uz",
    careersResumeInvalid: "Ссылка должна начинаться с https://",
    careersSubmit: "Отправить заявку",
    careersDoneTitle: "Заявка принята",
    careersDoneText: "Мы рассмотрим заявку и свяжемся с вами по телефону.",
```

- [ ] **Step 4: `JobApplyForm.tsx`**
```tsx
import { useState } from 'react';
import type { FC } from 'react';
import { useOutletContext } from 'react-router';
import { Send, X } from 'lucide-react';
import type { Translation } from '../locales';
import type { StoreContext } from './StoreLayout';
import { formatUzPhone, isCompleteUzPhone } from '../lib/phone';
import { ymGoal } from '../lib/metrica';
import Modal from './Modal';

/** Server bilan bir xil qoida (`parseJobApplicationInput`) — xato forma ichida, jim ishlamaslik yo'q. */
const RESUME_RE = /^https:\/\/\S+$/i;

/**
 * Nomzod arizasi — OrderForm naqshi: `Modal`, ikki bosqichli yopilish (`onExited`), qatordagi
 * xatolar, honeypot. `vacancyId` serverga ketadi; lavozim nomi serverda vakansiyadan olinadi,
 * `position` faqat sarlavhada ko'rsatish uchun.
 */
const JobApplyForm: FC<{ t: Translation; vacancyId: string | null; position: string; onClose: () => void }> = ({
  t, vacancyId, position, onClose,
}) => {
  const { customer, config } = useOutletContext<StoreContext>();
  const [name, setName] = useState(customer?.name ?? '');
  const [phone, setPhone] = useState(formatUzPhone(customer?.phone ?? ''));
  const [message, setMessage] = useState('');
  const [resumeUrl, setResumeUrl] = useState('');
  const [company, setCompany] = useState(''); // honeypot
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState('');
  const [nameErr, setNameErr] = useState('');
  const [phoneErr, setPhoneErr] = useState('');
  const [resumeErr, setResumeErr] = useState('');
  const [open, setOpen] = useState(true);

  async function submit(e: { preventDefault: () => void }) {
    e.preventDefault();
    const resume = resumeUrl.trim();
    const badName = !name.trim();
    const badPhone = !isCompleteUzPhone(phone);
    const badResume = resume !== '' && (resume.length > 500 || !RESUME_RE.test(resume));
    setNameErr(badName ? t.orderNameRequired : '');
    setPhoneErr(badPhone ? t.orderPhoneInvalid : '');
    setResumeErr(badResume ? t.careersResumeInvalid : '');
    if (badName || badPhone || badResume) return;
    setBusy(true);
    setErr('');
    try {
      const res = await fetch('/api/job-apply', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), phone: phone.trim(), message: message.trim(), resumeUrl: resume, vacancyId, company }),
      });
      if (!res.ok) throw new Error();
      setDone(true);
      ymGoal(config.yandexMetricaId, 'job_apply');
    } catch {
      setErr(t.orderError);
    } finally {
      setBusy(false);
    }
  }

  const inputCls = (bad: boolean) =>
    `rounded-sm w-full border px-3 py-2.5 text-control text-primary bg-surface focus:outline-none ${
      bad ? 'border-danger focus:border-danger' : 'border-line-2 focus:border-accent'
    }`;

  return (
    <Modal open={open} label={t.careersFormTitle} onClose={() => setOpen(false)} onExited={onClose}>
      <div className="p-6">
        <button onClick={() => setOpen(false)} aria-label={t.orderClose} className="press absolute top-4 right-4 text-muted-2 hover:text-primary">
          <X className="w-5 h-5" />
        </button>

        {done ? (
          <div className="py-6 text-center">
            <p className="text-control font-semibold text-primary">{t.careersDoneTitle}</p>
            <p className="text-label text-muted mt-2">{t.careersDoneText}</p>
            <button onClick={() => setOpen(false)} className="press mt-5 w-full h-11 bg-primary text-bg font-normal text-copy rounded-full">
              {t.orderClose}
            </button>
          </div>
        ) : (
          <form onSubmit={submit} noValidate>
            <h2 className="text-lede font-semibold pr-8">{t.careersFormTitle}</h2>
            <p className="text-label text-muted mt-1 mb-4 line-clamp-2">{position}</p>

            <label htmlFor="job-name" className="block text-label text-muted mb-1">{t.orderName}</label>
            <input
              id="job-name" value={name} autoComplete="name" autoFocus
              onChange={(e) => { setName(e.target.value); if (nameErr) setNameErr(''); }}
              aria-invalid={Boolean(nameErr) || undefined}
              className={`${inputCls(Boolean(nameErr))} ${nameErr ? 'mb-1' : 'mb-3'}`}
            />
            {nameErr && <p className="text-label text-danger mb-2">{nameErr}</p>}

            <label htmlFor="job-phone" className="block text-label text-muted mb-1">{t.orderPhone}</label>
            <input
              id="job-phone" type="tel" inputMode="tel" autoComplete="tel" value={phone}
              onChange={(e) => { setPhone(formatUzPhone(e.target.value)); if (phoneErr) setPhoneErr(''); }}
              onFocus={() => { if (!phone) setPhone('+998 '); }}
              aria-invalid={Boolean(phoneErr) || undefined}
              className={`${inputCls(Boolean(phoneErr))} tabular-nums ${phoneErr ? 'mb-1' : 'mb-3'}`}
            />
            {phoneErr && <p className="text-label text-danger mb-2">{phoneErr}</p>}

            <label htmlFor="job-message" className="block text-label text-muted mb-1">{t.careersMessage}</label>
            <textarea
              id="job-message" rows={3} value={message} maxLength={1000}
              onChange={(e) => setMessage(e.target.value)}
              className={`${inputCls(false)} mb-3 resize-none`}
            />

            <label htmlFor="job-resume" className="block text-label text-muted mb-1">{t.careersResume}</label>
            <input
              id="job-resume" type="url" inputMode="url" value={resumeUrl} placeholder="https://"
              onChange={(e) => { setResumeUrl(e.target.value); if (resumeErr) setResumeErr(''); }}
              aria-invalid={Boolean(resumeErr) || undefined} aria-describedby="job-resume-hint"
              className={`${inputCls(Boolean(resumeErr))} mb-1`}
            />
            <p id="job-resume-hint" className={`text-label mb-4 ${resumeErr ? 'text-danger' : 'text-muted-2'}`}>
              {resumeErr || t.careersResumeHint}
            </p>

            {/* honeypot — foydalanuvchiga ko'rinmaydi, bot to'ldirsa ariza tashlanadi */}
            <input tabIndex={-1} autoComplete="off" value={company} onChange={(e) => setCompany(e.target.value)} className="hidden" aria-hidden="true" />

            {err && <p className="text-label text-sale mb-3">{err}</p>}

            <button
              type="submit" disabled={busy}
              className="press w-full h-[52px] bg-cta text-white font-normal text-control rounded-full hover:bg-cta-hover flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Send className="w-4.5 h-4.5" /> {busy ? t.orderSending : t.careersSubmit}
            </button>
          </form>
        )}
      </div>
    </Modal>
  );
};

export default JobApplyForm;
```

- [ ] **Step 5: `CareersPage.tsx`**
```tsx
import { useState } from 'react';
import type { FC } from 'react';
import type { LucideIcon } from 'lucide-react';
import { ChevronDown, ChevronRight, Cpu, Layers, MessagesSquare, Wrench } from 'lucide-react';
import type { Translation } from '../locales';
import type { ApiVacancy, EmploymentType } from '../../shared/types';
import { localeField, type Locale } from '../../app/lib/i18n';
import { renderMarkdown } from '../lib/markdown';
import { MdBlockView } from './Markdown';
import JobApplyForm from './JobApplyForm';
import { BTN_LG, BTN_MD, LINK_MORE, SECTION_HEADING } from './ui';
import wordmark from '../assets/hero/wordmark.webp';

const EMPLOYMENT_KEY: Record<EmploymentType, 'employmentFull' | 'employmentPart' | 'employmentIntern'> = {
  full: 'employmentFull', part: 'employmentPart', intern: 'employmentIntern',
};

const EYEBROW = 'text-copy font-semibold text-muted-2';

/** Ochiq ariza oynasi: aniq vakansiyaga yoki umumiy (`vacancy: null`). */
type Applying = { vacancy: ApiVacancy | null } | null;

/** Vakansiya qatori — `<details>`: yopiqda nom va meta, ochilganda tavsif va "Ariza topshirish". */
const VacancyItem: FC<{ t: Translation; locale: Locale; vacancy: ApiVacancy; onApply: () => void }> = ({ t, locale, vacancy: v, onApply }) => {
  const meta = [localeField(v.department, v.departmentRu, locale), t[EMPLOYMENT_KEY[v.employment]], localeField(v.salary, v.salaryRu, locale)]
    .filter((x) => x !== '');
  return (
    <li className="border-b border-divider">
      <details className="group">
        <summary className="press press-surface flex cursor-pointer list-none items-center gap-4 py-6 [&::-webkit-details-marker]:hidden">
          <div className="min-w-0 flex-1">
            <h3 className="text-subhead font-semibold text-balance text-primary">{localeField(v.title, v.titleRu, locale)}</h3>
            <p className="mt-1 text-copy text-muted">{meta.join(' · ')}</p>
          </div>
          <ChevronDown aria-hidden className="h-5 w-5 shrink-0 text-muted-3 transition-transform duration-200 group-open:rotate-180" />
        </summary>
        <div className="flex max-w-[760px] flex-col gap-4 pb-8 text-copy">
          {renderMarkdown(localeField(v.description, v.descriptionRu, locale)).map((b, i) => <MdBlockView key={i} block={b} />)}
          <button type="button" onClick={onApply} className={`${BTN_MD} mt-2 self-start bg-cta text-white hover:bg-cta-hover`}>
            {t.careersApply}
          </button>
        </div>
      </details>
    </li>
  );
};

/**
 * "Vakansiyalar" (2026-09-15) — apple.com/careers/us tuzilishida: qora hero → katta kirish matni →
 * "ProDuct'da ishlash" (foto + kompaniya gapi) → "Jamoadagi hayot" (egasining yashil gradienti) →
 * "Bizda ish qanday" (faqat ish mazmuni faktlari) → ochiq vakansiyalar + ariza.
 * Xodim iqtiboslari va imtiyozlar o'ylab topilmaydi (spec §1).
 */
const CareersPage: FC<{ t: Translation; locale: Locale; vacancies: ApiVacancy[] }> = ({ t, locale, vacancies }) => {
  const [applyingRaw, setApplying] = useState<Applying>(null);
  const applying = applyingRaw as Applying;
  const why: { icon: LucideIcon; title: string; text: string }[] = [
    { icon: Cpu, title: t.careersWhyTechTitle, text: t.careersWhyTechText },
    { icon: MessagesSquare, title: t.careersWhyClientTitle, text: t.careersWhyClientText },
    { icon: Wrench, title: t.careersWhyServiceTitle, text: t.careersWhyServiceText },
    { icon: Layers, title: t.careersWhyTeamTitle, text: t.careersWhyTeamText },
  ];

  return (
    <>
      {/* Hero ikkala mavzuda qora — apple.com/careers kabi; logo Apple'dagi belgining o'rnida. */}
      <section className="shell-box mt-4 flex min-h-[420px] flex-col items-center justify-center rounded-xl bg-black px-6 py-20 text-center md:min-h-[560px]">
        <img src={wordmark} alt="" className="h-9 w-auto md:h-12" />
        <h1 className="mt-8 text-balance text-heading font-semibold text-white md:text-display">{t.careersHeroTitle}</h1>
        <a href="#vakansiyalar" className={`${BTN_LG} mt-8 bg-white text-black hover:bg-white/90`}>{t.careersHeroCta}</a>
      </section>

      <section className="shell py-16 md:py-24">
        <p className="mx-auto max-w-[900px] text-balance text-center text-subhead font-semibold text-primary md:text-heading">{t.careersIntro}</p>
      </section>

      <section className="shell grid items-center gap-8 pb-16 md:pb-24 lg:grid-cols-12 lg:gap-12">
        <div className="lg:col-span-5">
          <p className={EYEBROW}>{t.careersWorkEyebrow}</p>
          <h2 className={`mt-3 ${SECTION_HEADING}`}>{t.careersWorkTitle}</h2>
          <p className="mt-5 text-copy text-pretty text-body md:text-lede">{t.careersWorkText}</p>
          <a href="#vakansiyalar" className={`${LINK_MORE} mt-6`}>{t.careersHeroCta}<ChevronRight aria-hidden className="mt-px h-4 w-4" /></a>
        </div>
        {/* Matn md'dan fotoning chap-yuqori qorong'i qismida; mobilda foto ostida (tor kadrda yuzlarga tushardi). */}
        <figure className="relative isolate overflow-hidden rounded-xl bg-black lg:col-span-7">
          <img src="/careers/work.webp" alt="" loading="lazy" className="aspect-[3/2] w-full object-cover" />
          <figcaption className="p-6 md:absolute md:inset-x-0 md:top-0 md:w-[55%] md:p-10">
            <blockquote className="text-subhead font-semibold text-balance text-white md:text-heading">“{t.careersWorkQuote}”</blockquote>
            <p className="mt-3 text-copy text-white/70">{t.careersQuoteBy}</p>
          </figcaption>
        </figure>
      </section>

      <section className="shell grid items-center gap-8 pb-16 md:pb-24 lg:grid-cols-12 lg:gap-12">
        <div className="lg:order-2 lg:col-span-5">
          <p className={EYEBROW}>{t.careersLifeEyebrow}</p>
          <h2 className={`mt-3 ${SECTION_HEADING}`}>{t.careersLifeTitle}</h2>
          <p className="mt-5 text-copy text-pretty text-body md:text-lede">{t.careersLifeText}</p>
        </div>
        {/* Egasining yashil gradienti — "Biz haqimizda" hero'si oilasidan; qorong'ida `dark-invert`. */}
        <figure className="relative isolate flex min-h-[260px] items-center overflow-hidden rounded-xl p-8 md:min-h-[380px] md:p-12 lg:order-1 lg:col-span-7">
          <img src="/careers/life.webp" alt="" loading="lazy" className="dark-invert absolute inset-0 -z-10 h-full w-full object-cover" />
          <p className="max-w-[520px] text-heading font-semibold text-balance text-primary md:text-title">{t.careersLifeCard}</p>
        </figure>
      </section>

      <section className="shell pb-16 md:pb-24">
        <h2 className={SECTION_HEADING}>{t.careersWhyTitle} <span className="text-muted-2">{t.careersWhyMuted}</span></h2>
        <div className="mt-8 grid gap-4 md:mt-10 md:grid-cols-2 lg:grid-cols-4">
          {why.map(({ icon: Icon, title, text }) => (
            <article key={title} className="rounded-xl bg-surface p-8">
              <Icon aria-hidden className="h-10 w-10 text-link" strokeWidth={1.5} />
              <h3 className="mt-6 text-subhead font-semibold text-balance text-primary">{title}</h3>
              <p className="mt-3 text-copy text-pretty text-body">{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="vakansiyalar" className="shell scroll-mt-32 pb-14 md:pb-20 lg:scroll-mt-28">
        <h2 className={SECTION_HEADING}>{t.careersRolesTitle}</h2>
        {vacancies.length === 0 ? (
          <div className="mt-8 rounded-xl bg-surface p-8 md:mt-10 md:p-10">
            <p className="max-w-[640px] text-copy text-pretty text-body md:text-lede">{t.careersRolesEmpty}</p>
            <button type="button" onClick={() => setApplying({ vacancy: null })} className={`${BTN_MD} mt-6 bg-cta text-white hover:bg-cta-hover`}>
              {t.careersGeneralApply}
            </button>
          </div>
        ) : (
          <>
            <ul className="mt-8 border-t border-divider md:mt-10">
              {vacancies.map((v) => (
                <VacancyItem key={v.id} t={t} locale={locale} vacancy={v} onApply={() => setApplying({ vacancy: v })} />
              ))}
            </ul>
            <button type="button" onClick={() => setApplying({ vacancy: null })} className={`${LINK_MORE} mt-6`}>
              {t.careersGeneralApply}<ChevronRight aria-hidden className="mt-px h-4 w-4" />
            </button>
          </>
        )}
      </section>

      {applying && (
        <JobApplyForm
          t={t}
          vacancyId={applying.vacancy?.id ?? null}
          position={applying.vacancy ? localeField(applying.vacancy.title, applying.vacancy.titleRu, locale) : t.careersGeneralPosition}
          onClose={() => setApplying(null)}
        />
      )}
    </>
  );
};

export default CareersPage;
```

- [ ] **Step 6: Route** — `app/routes/vakansiyalar.tsx`:
```tsx
import { useLoaderData, useOutletContext } from 'react-router';
import type { Route } from './+types/vakansiyalar';
import { resolveLocale, localeToLang } from '../lib/i18n';
import { pageTitle, catalogMeta, storeConfigFrom } from '../lib/seo';
import { siteConfig } from '../lib/site.config';
import { loadVacancies } from '../lib/loaders';
import { translations } from '../../src/locales';
import type { StoreContext } from '../../src/store/StoreLayout';
import CareersPage from '../../src/store/CareersPage';

export async function loader({ params, request, context }: Route.LoaderArgs) {
  const locale = resolveLocale(params.lang);
  if (!locale) throw new Response('Not Found', { status: 404 });
  return { vacancies: await loadVacancies(context.env), locale, requestUrl: request.url };
}

export function meta({ data, matches }: Route.MetaArgs) {
  const cfg = storeConfigFrom(matches);
  if (!data) return [{ title: pageTitle(undefined, cfg?.seoTitleSuffix) }];
  const t = translations[localeToLang(data.locale)];
  const desc = t.careersMetaDesc.replace('{store}', cfg?.name ?? siteConfig.name);
  return catalogMeta(pageTitle(t.footerCareers, cfg?.seoTitleSuffix), data.requestUrl, desc);
}

export default function VakansiyalarRoute() {
  const { vacancies } = useLoaderData<typeof loader>();
  const { t, locale } = useOutletContext<StoreContext>();
  return <CareersPage t={t} locale={locale} vacancies={vacancies} />;
}
```
`app/routes.ts`: `route('page/:slug', …)`dan keyin `route('vakansiyalar', 'routes/vakansiyalar.tsx'),`; `route(':lang/page/:slug', …)`dan keyin `route(':lang/vakansiyalar', 'routes/vakansiyalar.tsx', { id: 'vakansiyalar-lang' }),`.

- [ ] **Step 7: Footer va sitemap**
`src/store/Footer.tsx` — `{company.length > 0 && <Col title={t.footerCompany}>{company.map((p) => link(p.to, p.label))}</Col>}` qatorini almashtiring:
```tsx
          <Col title={t.footerCompany}>
            {company.map((p) => link(p.to, p.label))}
            {link('/vakansiyalar', t.footerCareers)}
          </Col>
```
`app/routes/sitemap[.]xml.tsx` — `const paths = ['/', '/katalog', '/chegirmalar', '/blog',` → `const paths = ['/', '/katalog', '/chegirmalar', '/blog', '/vakansiyalar',`

- [ ] **Step 8: Tekshiruv**

Run: `bun run lint && bun run test && curl -s http://localhost:3000/vakansiyalar | grep -o '<h1[^>]*>[^<]*' && curl -s http://localhost:3000/sitemap.xml | grep -c vakansiyalar`
Expected: lint exit 0, testlar PASS, h1 "Bizga qo'shiling. O'zingiz bo'ling.", sitemap'da 2 ta (uz + ru).
Brauzer (1200px va 390px, yorug' va qorong'i): hero, work fotosi ustidagi matn yuzlarga tushmaydi, life gradient kartasi qorong'ida to'q, vakansiyasiz holatda umumiy ariza tugmasi; ariza oynasi: bo'sh submit → qatordagi xatolar, `http://` rezyume → xato, to'g'ri ariza → muvaffaqiyat ekrani va `job_applications`da qator (so'ng sinov qatori o'chiriladi); footer'da "Vakansiyalar" havolasi `/vakansiyalar`ga (ru'da `/ru/vakansiyalar`) olib boradi; konsolda yangi xato yo'q.

---

### Task 7: Hujjat va yakuniy tekshiruv

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: CLAUDE.md** — quyidagilarni mavjud bo'limlarga qo'shing:
  - *Storefront pages* ro'yxatiga: `vakansiyalar` (indexable; admin'dan boshqariladigan vakansiyalar, apple.com/careers tuzilishi — `CareersPage`: qora hero, kirish, "ProDuct'da ishlash" foto karta, "Jamoadagi hayot" gradient karta (`dark-invert`), "Bizda ish qanday", `<details>` vakansiyalar + `JobApplyForm`; xodim iqtiboslari/imtiyozlar o'ylab topilmaydi).
  - *loaders* ro'yxatiga `loadVacancies`.
  - *Public write*ga `api.job-apply.tsx` (consult naqshi, `job_applications`ga yozadi, lavozim nomi serverda `vacancyId` bo'yicha, rezyume faqat `https://`).
  - *Admin write*ga `vacancies` CRUD va `job-applications` (GET + PATCH status).
  - *Admin panel* bo'limlariga **Vakansiyalar** (`CareersAdmin`: Vakansiyalar / Arizalar tablari).
  - *Data model*ga `0034` **vakansiyalar** (`vacancies`, `job_applications`).
  - Metrica goallariga `job_apply`.
  - Footer "Kompaniya" ustuni doim chiqadi, oxirida `/vakansiyalar`.
  - `ui.ts` — `LINK_MORE`.

- [ ] **Step 2: Yakuniy tekshiruv**

Run: `bun run lint && bun run test && git status --short`
Expected: exit 0; testlar PASS; o'zgargan fayllar ro'yxati (commit qilinmaydi).
