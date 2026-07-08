import type { Route } from './+types/api.account';
import { parseProfileInput, parsePasswordInput, ValidationError } from '../../functions/lib/validate';
import { currentCustomerId } from '../../functions/lib/customer-auth';
import { updateCustomerProfile, getCustomerAuth, setCustomerPassword, loadCustomer } from '../../functions/lib/db';
import { hashPassword, verifyPassword, randomSaltHex } from '../../functions/lib/auth';

// Kabinet o'z-o'zini boshqarish — customer_session bilan himoyalangan.
// intent=profile → ism/telefon yangilash; intent=password → parol o'rnatish/o'zgartirish.
export async function action({ request, context }: Route.ActionArgs) {
  const env = context.cloudflare.env;
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

  if (intent === 'password') {
    let input;
    try {
      input = parsePasswordInput(body);
    } catch (e) {
      return Response.json({ error: e instanceof ValidationError ? e.message : 'bad_request' }, { status: 400 });
    }
    const auth = await getCustomerAuth(env, id);
    // Parol o'rnatish uchun email kerak (u kirish identifikatori) — Telegram-only hisobda yo'q.
    if (!auth?.email) return Response.json({ error: 'no_email' }, { status: 400 });
    // Paroli bor bo'lsa — o'zgartirish uchun joriy parolni tasdiqlash shart.
    if (auth.passwordHash && auth.passwordSalt) {
      if (!input.currentPassword || !(await verifyPassword(input.currentPassword, auth.passwordSalt, auth.passwordHash))) {
        return Response.json({ error: 'bad_current' }, { status: 400 });
      }
    }
    const salt = randomSaltHex();
    const hash = await hashPassword(input.newPassword, salt);
    await setCustomerPassword(env, id, hash, salt);
    return Response.json({ ok: true });
  }

  return Response.json({ error: 'bad_request' }, { status: 400 });
}
