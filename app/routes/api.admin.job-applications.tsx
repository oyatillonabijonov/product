import type { Route } from './+types/api.admin.job-applications';
import { json, rowToJobApplication, type JobApplicationRow } from '../../functions/lib/db';
import { requireAdmin } from './api.admin.guard';

export async function loader({ request, context }: Route.LoaderArgs) {
  const env = context.env;
  const who = await requireAdmin(request, env);
  if (who instanceof Response) return who;
  const { results } = await env.DB.prepare(
    'SELECT * FROM job_applications ORDER BY created_at DESC, id DESC LIMIT 200',
  ).all<JobApplicationRow>();
  return json(results.map(rowToJobApplication));
}
