import type { Route } from './+types/api.admin.me';
import { json } from '../../functions/lib/db';
import { requireAdmin } from './api.admin.guard';

export async function loader({ request, context }: Route.LoaderArgs) {
  const who = await requireAdmin(request, context.env);
  if (who instanceof Response) return who;
  return json({ username: who });
}
