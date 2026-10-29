import { redirect } from 'react-router';
import type { Route } from './+types/auth.logout';
import { clearedCustomerCookie, currentCustomerId, isSameOrigin, revokeCustomerSessions } from '../../functions/lib/customer-auth';
import { isSecureRequest } from '../../functions/lib/auth';

// GET chiqarmaydi — boshqa sayt havola/rasm bilan mijozni chiqarib yubora olmasin.
export async function loader() {
  return redirect('/');
}

/** Kabinetdagi "Chiqish" formasi (POST). Davr oshadi — mijozning hamma qurilmadagi sessiyasi bekor bo'ladi. */
export async function action({ request, context }: Route.ActionArgs) {
  if (request.method !== 'POST') return Response.json({ error: 'method_not_allowed' }, { status: 405 });
  if (!isSameOrigin(request)) return Response.json({ error: 'forbidden' }, { status: 403 });
  const id = await currentCustomerId(request, context.env);
  if (id) await revokeCustomerSessions(context.env, id);
  return redirect('/', { headers: { 'set-cookie': clearedCustomerCookie(isSecureRequest(request)) } });
}
