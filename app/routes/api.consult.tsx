import type { Route } from './+types/api.consult';
import { json, rowToSiteConfig, type SiteConfigRow } from '../../functions/lib/db';
import { parseConsultInput, ValidationError } from '../../functions/lib/validate';
import { customerIdFrom } from '../../functions/lib/customer-auth';
import { composeConsultMessage } from '../../shared/order';

/**
 * Bepul konsultatsiya arizasi (auth yo'q, honeypot bilan). Ariza `orders`
 * jadvaliga `source='consult'` bilan tushadi — operator hamma murojaatni bitta
 * joyda ko'radi. Mahsulot va narx bo'lmagani uchun items bo'sh, summalar NULL.
 */
export async function action({ request, context }: Route.ActionArgs) {
  const env = context.cloudflare.env;
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, { status: 405 });

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  // Honeypot: bot bo'sh 'company' maydonini to'ldiradi → jimgina "qabul qildik" deymiz.
  if (body && typeof body.company === 'string' && body.company !== '') return json({ ok: true });

  let input;
  try {
    input = parseConsultInput(body);
  } catch (e) {
    if (e instanceof ValidationError) return json({ error: e.message }, { status: 400 });
    return json({ error: 'invalid' }, { status: 400 });
  }

  const cfgRow = await env.DB.prepare('SELECT * FROM site_config WHERE id = 1').first<SiteConfigRow>();
  const cfg = cfgRow ? rowToSiteConfig(cfgRow) : null;
  const customerId = cfg?.customerSessionSecret ? await customerIdFrom(request, cfg.customerSessionSecret) : null;

  // Telegram muvaffaqiyatsiz bo'lsa ham ariza D1'ga saqlanadi (telegram_sent=0).
  let telegramSent = 0;
  if (cfg?.telegramBotToken && cfg.telegramOrderChatId) {
    try {
      const r = await fetch(`https://api.telegram.org/bot${cfg.telegramBotToken}/sendMessage`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ chat_id: cfg.telegramOrderChatId, text: composeConsultMessage(input, cfg.name) }),
      });
      telegramSent = r.ok ? 1 : 0;
    } catch {
      telegramSent = 0;
    }
  }

  // Tanlangan mavzular note'ga yoziladi — admin ro'yxatida shu ko'rinadi.
  const note = [input.topics.join(' · '), input.note].filter((x) => x !== '').join(' — ');

  await env.DB.prepare(
    "INSERT INTO orders (name, phone, note, payment_kind, term_months, down_payment_uzs, monthly_uzs, total_uzs, items_json, source, telegram_sent, customer_id) VALUES (?, ?, ?, 'cash', NULL, NULL, NULL, NULL, '[]', 'consult', ?, ?)",
  )
    .bind(input.name, input.phone, note, telegramSent, customerId)
    .run();

  return json({ ok: true });
}
