import type { Route } from './+types/auth.telegram';
import { redirect } from 'react-router';
import { loadSiteConfig } from '../lib/loaders';
import { upsertCustomerByTelegram } from '../../functions/lib/db';
import { customerCookie, isSameOrigin, verifyTelegramLogin } from '../../functions/lib/customer-auth';
import { isSecureRequest } from '../../functions/lib/auth';
import { readJson } from '../../functions/lib/body';

/** Telegram foydalanuvchi obyekti — bir necha yuz bayt. */
const MAX_BODY = 8 * 1024;

// GET endi sessiya bermaydi: boshqa saytdan yuborilgan havola (top-level navigatsiya) brauzerni
// begona Telegram akkauntiga bog'lab qo'ya olardi. Vidjet callback rejimida — pastdagi POST.
export async function loader() {
  return redirect('/kirish');
}

/**
 * Telegram Login Widget callback'i (`data-onauth`, `LoginPanel`) shu sahifadan same-origin `fetch` bilan
 * foydalanuvchi obyektini yuboradi. Origin tekshiruvi kirishni uni boshlagan brauzerga bog'laydi;
 * imzo bot-token bilan tekshiriladi (Telegram spetsifikatsiyasi).
 */
export async function action({ request, context }: Route.ActionArgs) {
  if (request.method !== 'POST') return Response.json({ error: 'method_not_allowed' }, { status: 405 });
  if (!isSameOrigin(request)) return Response.json({ error: 'forbidden' }, { status: 403 });
  const env = context.env;
  const cfg = await loadSiteConfig(env);
  if (!cfg.telegramBotToken) return Response.json({ error: 'disabled' }, { status: 400 });

  const raw = await readJson(request, MAX_BODY);
  if (raw instanceof Response) return raw;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return Response.json({ error: 'invalid' }, { status: 400 });
  // Imzo hamma yuborilgan maydon ustida — faqat satr/son qiymatlar (Telegram obyektining o'zi shunday).
  const fields: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof v !== 'string' && typeof v !== 'number') return Response.json({ error: 'invalid' }, { status: 400 });
    fields[k] = String(v);
  }
  if (!(await verifyTelegramLogin(fields, cfg.telegramBotToken, Math.floor(Date.now() / 1000)))) {
    return Response.json({ error: 'invalid' }, { status: 400 });
  }

  const name = [fields.first_name, fields.last_name].filter(Boolean).join(' ') || fields.username || 'Telegram';
  const id = await upsertCustomerByTelegram(env, fields.id, name);
  return Response.json({ ok: true }, { headers: { 'set-cookie': await customerCookie(env, id, isSecureRequest(request)) } });
}
