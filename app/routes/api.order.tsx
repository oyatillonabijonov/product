import type { Route } from './+types/api.order';
import { json, rowToSiteConfig, type SiteConfigRow } from '../../functions/lib/db';
import { parseOrderInput, ValidationError } from '../../functions/lib/validate';
import { customerIdFrom } from '../../functions/lib/customer-auth';
import { allowLead } from '../../functions/lib/rate-limit';

const MAX_LEAD_BYTES = 32 * 1024;
import { composeOrderMessage } from '../../shared/order';

// Ommaviy buyurtma endpoint'i (auth yo'q). Honeypot + validatsiya + IP rate limit spam'ga qarshi.
export async function action({ request, context }: Route.ActionArgs) {
  const env = context.env;
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, { status: 405 });
  // Bitta IP'dan 10 daqiqada 10 ta — bot Telegram guruhini va jadvalni to'ldirib tashlamasin.
  if (!allowLead(context.ip || 'unknown')) return json({ error: 'too_many_requests' }, { status: 429 });
  // Lead JSON'i bir necha KB; kattasi body o'qilishidan oldin rad etiladi.
  if (Number(request.headers.get('content-length') ?? '0') > MAX_LEAD_BYTES) return json({ error: 'too_large' }, { status: 413 });

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  // Honeypot: bot bo'sh 'company' maydonini to'ldiradi → jimgina "qabul qildik" deymiz.
  if (body && typeof body.company === 'string' && body.company !== '') return json({ ok: true });

  let input;
  try {
    input = parseOrderInput(body);
  } catch (e) {
    if (e instanceof ValidationError) return json({ error: e.message }, { status: 400 });
    return json({ error: 'invalid' }, { status: 400 });
  }

  // site_config — bot token/chat + brend nomi.
  const cfgRow = await env.DB.prepare('SELECT * FROM site_config WHERE id = 1').first<SiteConfigRow>();
  const cfg = cfgRow ? rowToSiteConfig(cfgRow) : null;
  // customer_id sessiyadan (serverda) — klient body'siga ishonilmaydi.
  const customerId = cfg?.customerSessionSecret ? await customerIdFrom(request, cfg.customerSessionSecret) : null;

  // Telegramga yuborish (xato bo'lsa ham quyida D1'ga saqlanadi — telegram_sent=0).
  // ponytail: mijoz yuborgan narxlar saqlanadi — bu lead, operator qo'ng'iroqda tasdiqlaydi;
  //           transaktsion bo'lsa server-side qayta hisob qo'shiladi.
  let telegramSent = 0;
  if (cfg?.telegramBotToken && cfg.telegramOrderChatId) {
    try {
      const r = await fetch(`https://api.telegram.org/bot${cfg.telegramBotToken}/sendMessage`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ chat_id: cfg.telegramOrderChatId, text: composeOrderMessage(input, cfg.name) }),
      });
      telegramSent = r.ok ? 1 : 0;
    } catch {
      telegramSent = 0;
    }
  }

  await env.DB.prepare(
    'INSERT INTO orders (name, phone, note, payment_kind, term_months, down_payment_uzs, monthly_uzs, total_uzs, items_json, source, telegram_sent, customer_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
  )
    .bind(
      input.name, input.phone, input.note, input.paymentKind,
      input.termMonths, input.downPaymentUzs, input.monthlyUzs, input.totalUzs,
      JSON.stringify(input.items), input.source, telegramSent, customerId,
    )
    .run();

  return json({ ok: true });
}
