import type { Route } from './+types/api.account';
import { parseProfileInput, ValidationError } from '../../functions/lib/validate';
import { currentCustomerId } from '../../functions/lib/customer-auth';
import { updateCustomerProfile, loadCustomer } from '../../functions/lib/db';

// Kabinet o'z-o'zini boshqarish — customer_session bilan himoyalangan.
// Kirish faqat Google/Telegram orqali, shuning uchun parol oqimi yo'q.
export async function action({ request, context }: Route.ActionArgs) {
  const env = context.env;
  const id = await currentCustomerId(request, env);
  if (!id) return Response.json({ error: 'unauthorized' }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'bad_request' }, { status: 400 });
  }
  const intent = (body as { intent?: unknown }).intent;

  if (intent === 'profile') {
    let input;
    try {
      input = parseProfileInput(body);
    } catch (e) {
      return Response.json({ error: e instanceof ValidationError ? e.message : 'bad_request' }, { status: 400 });
    }
    await updateCustomerProfile(env, id, input.name, input.phone);
    const customer = await loadCustomer(env, id);
    return Response.json({ ok: true, customer });
  }

  return Response.json({ error: 'bad_request' }, { status: 400 });
}
