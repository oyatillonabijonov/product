import type { Route } from './+types/auth.email';
import { parseEmailAuthInput, ValidationError } from '../../functions/lib/validate';
import { findCustomerByEmail, createEmailCustomer } from '../../functions/lib/db';
import { hashPassword, verifyPassword, randomSaltHex } from '../../functions/lib/auth';
import { customerCookie } from '../../functions/lib/customer-auth';

// Email/parol bilan kirish yoki ro'yxatdan o'tish. Modal fetch() bilan chaqiradi:
// muvaffaqiyat → JSON {ok} + customer_session cookie, klient reload qiladi.
export async function action({ request, context }: Route.ActionArgs) {
  const env = context.env;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'bad_request' }, { status: 400 });
  }

  let input;
  try {
    input = parseEmailAuthInput(body);
  } catch (e) {
    return Response.json({ error: e instanceof ValidationError ? e.message : 'bad_request' }, { status: 400 });
  }
  const { mode, email, password, name } = input;

  if (mode === 'register') {
    // Email band bo'lsa (OAuth yoki avvalgi ro'yxat) — yangi hisob ochilmaydi (dublikat + hisob egallashning oldini oladi).
    if (await findCustomerByEmail(env, email)) {
      return Response.json({ error: 'email_taken' }, { status: 409 });
    }
    const salt = randomSaltHex();
    const hash = await hashPassword(password, salt);
    const id = await createEmailCustomer(env, email, name, hash, salt);
    return Response.json({ ok: true }, { headers: { 'set-cookie': await customerCookie(env, id) } });
  }

  // login
  const found = await findCustomerByEmail(env, email);
  if (!found || !found.passwordHash || !found.passwordSalt) {
    return Response.json({ error: 'bad_credentials' }, { status: 401 });
  }
  const ok = await verifyPassword(password, found.passwordSalt, found.passwordHash);
  if (!ok) return Response.json({ error: 'bad_credentials' }, { status: 401 });
  return Response.json({ ok: true }, { headers: { 'set-cookie': await customerCookie(env, found.id) } });
}
