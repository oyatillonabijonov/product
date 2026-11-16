import type { Route } from './+types/api.account';
import { parseProfileInput, ValidationError } from '../../functions/lib/validate';
import { currentCustomerId } from '../../functions/lib/customer-auth';
import { updateCustomerProfile, loadCustomer } from '../../functions/lib/db';
import { readJson } from '../../functions/lib/body';
import { isAvatarPhoto } from '../../shared/avatar';

/** Profil formasi — bir necha maydon. */
const MAX_BODY = 16 * 1024;

// Kabinet o'z-o'zini boshqarish — customer_session bilan himoyalangan.
// Kirish faqat Google/Telegram orqali, shuning uchun parol oqimi yo'q.
export async function action({ request, context }: Route.ActionArgs) {
  const env = context.env;
  const id = await currentCustomerId(request, env);
  if (!id) return Response.json({ error: 'unauthorized' }, { status: 401 });

  const body = await readJson(request, MAX_BODY);
  if (body instanceof Response) return body;
  if (body === null) return Response.json({ error: 'bad_request' }, { status: 400 });
  const intent = (body as { intent?: unknown }).intent;

  if (intent === 'profile') {
    let input;
    try {
      input = parseProfileInput(body, id);
    } catch (e) {
      return Response.json({ error: e instanceof ValidationError ? e.message : 'bad_request' }, { status: 400 });
    }
    const before = await loadCustomer(env, id);
    await updateCustomerProfile(env, id, input.name, input.phone, input.avatar, input.email);
    // Almashtirilgan yoki olib tashlangan profil rasmi diskda qolmasin.
    const old = before?.avatar ?? '';
    if (old !== input.avatar && isAvatarPhoto(old, id)) await env.IMAGES.delete(old.slice('/images/'.length));
    const customer = await loadCustomer(env, id);
    return Response.json({ ok: true, customer });
  }

  return Response.json({ error: 'bad_request' }, { status: 400 });
}
