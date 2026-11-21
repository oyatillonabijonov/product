import type { Route } from './+types/api.admin.job-applications';
import { json, rowToJobApplication, type JobApplicationRow } from '../../functions/lib/db';
import { requireAdmin } from './api.admin.guard';

export async function loader({ request, context }: Route.LoaderArgs) {
  const env = context.env;
  const who = await requireAdmin(request, env);
  if (who instanceof Response) return who;
  // `?counts=1` — aniq sanoq: holatlar va oxirgi 7 kunda (7×24 soat) kelganlari.
  if (new URL(request.url).searchParams.has('counts')) {
    const weekAgo = Math.floor(Date.now() / 1000) - 7 * 86400;
    const row = await env.DB.prepare(
      `SELECT COALESCE(SUM(status = 'new'), 0) AS new, COALESCE(SUM(status = 'contacted'), 0) AS contacted,
         COALESCE(SUM(status = 'done'), 0) AS done, COALESCE(SUM(created_at >= ?), 0) AS week
       FROM job_applications`,
    ).bind(weekAgo).first<{ new: number; contacted: number; done: number; week: number }>();
    return json(row ?? { new: 0, contacted: 0, done: 0, week: 0 });
  }
  // Yopilmagan arizalarning hammasi + yopilganlardan oxirgi 200 tasi (buyurtmalar bilan bir qoida).
  const { results } = await env.DB.prepare(
    `SELECT * FROM (SELECT * FROM job_applications WHERE status <> 'done')
     UNION ALL
     SELECT * FROM (SELECT * FROM job_applications WHERE status = 'done' ORDER BY created_at DESC, id DESC LIMIT 200)
     ORDER BY created_at DESC, id DESC`,
  ).all<JobApplicationRow>();
  return json(results.map(rowToJobApplication));
}
