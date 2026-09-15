import type { Route } from './+types/api.job-apply';
import { json, rowToSiteConfig, type SiteConfigRow } from '../../functions/lib/db';
import { parseJobApplicationInput, ValidationError } from '../../functions/lib/validate';
import { allowLead } from '../../functions/lib/rate-limit';
import { composeJobApplicationMessage } from '../../shared/order';

const MAX_LEAD_BYTES = 32 * 1024;
/** Vakansiya tanlanmagan yoki topilmagan ariza — admin va botda shu nom bilan chiqadi. */
const GENERAL_POSITION = 'Umumiy ariza';

/**
 * Nomzod arizasi (auth yo'q) — `api.consult.tsx` naqshi: IP cheklovi, body chegarasi, honeypot.
 * Ariza `job_applications`ga tushadi (sotuv arizalariga aralashmaydi). Lavozim nomi mijozdan
 * olinmaydi — `vacancyId` bo'yicha faol vakansiyadan; topilmasa "Umumiy ariza".
 */
export async function action({ request, context }: Route.ActionArgs) {
  const env = context.env;
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, { status: 405 });
  // Bitta IP'dan 10 daqiqada 10 ta — bot Telegram guruhini va jadvalni to'ldirib tashlamasin.
  if (!allowLead(context.ip || 'unknown')) return json({ error: 'too_many_requests' }, { status: 429 });
  if (Number(request.headers.get('content-length') ?? '0') > MAX_LEAD_BYTES) return json({ error: 'too_large' }, { status: 413 });

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  // Honeypot: bot bo'sh 'company' maydonini to'ldiradi → jimgina "qabul qildik" deymiz.
  if (body && typeof body.company === 'string' && body.company !== '') return json({ ok: true });

  let input;
  try {
    input = parseJobApplicationInput(body);
  } catch (e) {
    if (e instanceof ValidationError) return json({ error: e.message }, { status: 400 });
    return json({ error: 'invalid' }, { status: 400 });
  }

  const vacancy = input.vacancyId
    ? await env.DB.prepare('SELECT id, title FROM vacancies WHERE id = ? AND is_active = 1')
      .bind(input.vacancyId)
      .first<{ id: string; title: string }>()
    : null;
  const position = vacancy?.title ?? GENERAL_POSITION;

  const cfgRow = await env.DB.prepare('SELECT * FROM site_config WHERE id = 1').first<SiteConfigRow>();
  const cfg = cfgRow ? rowToSiteConfig(cfgRow) : null;

  // Telegram xato bersa ham ariza saqlanadi (telegram_sent=0).
  let telegramSent = 0;
  if (cfg?.telegramBotToken && cfg.telegramOrderChatId) {
    try {
      const r = await fetch(`https://api.telegram.org/bot${cfg.telegramBotToken}/sendMessage`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ chat_id: cfg.telegramOrderChatId, text: composeJobApplicationMessage(input, position, cfg.name) }),
      });
      telegramSent = r.ok ? 1 : 0;
    } catch {
      telegramSent = 0;
    }
  }

  await env.DB.prepare(
    'INSERT INTO job_applications (vacancy_id, position, name, phone, message, resume_url, telegram_sent) VALUES (?, ?, ?, ?, ?, ?, ?)',
  )
    .bind(vacancy?.id ?? null, position, input.name, input.phone, input.message, input.resumeUrl, telegramSent)
    .run();

  return json({ ok: true });
}
