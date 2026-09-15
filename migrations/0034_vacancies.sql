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
