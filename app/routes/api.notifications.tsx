import type { Route } from './+types/api.notifications';
import { currentCustomerId } from '../../functions/lib/customer-auth';
import { markNotificationsRead } from '../../functions/lib/db';

// Ro'yxatning o'zi kabinet loader'idan keladi; bu route faqat "o'qildi" belgisini qo'yadi.
export async function action({ request, context }: Route.ActionArgs) {
  if (request.method !== 'POST') return Response.json({ error: 'method_not_allowed' }, { status: 405 });
  const id = await currentCustomerId(request, context.env);
  if (!id) return Response.json({ error: 'unauthorized' }, { status: 401 });
  await markNotificationsRead(context.env, id);
  return Response.json({ ok: true });
}
