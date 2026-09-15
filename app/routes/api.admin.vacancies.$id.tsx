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
