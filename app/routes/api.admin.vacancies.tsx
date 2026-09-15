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
