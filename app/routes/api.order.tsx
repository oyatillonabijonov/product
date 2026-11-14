import type { Route } from './+types/api.order';
import { json, rowToSiteConfig, type SiteConfigRow } from '../../functions/lib/db';
import { parseOrderInput, ValidationError } from '../../functions/lib/validate';
import { customerIdFrom } from '../../functions/lib/customer-auth';
import { allowLead } from '../../functions/lib/rate-limit';
import { readJson } from '../../functions/lib/body';

const MAX_LEAD_BYTES = 32 * 1024;
import { composeOrderMessage } from '../../shared/order';
import { ON_ORDER_SQL } from '../../shared/on-order';

// Ommaviy buyurtma endpoint'i (auth yo'q). Honeypot + validatsiya + IP rate limit spam'ga qarshi.
export async function action({ request, context }: Route.ActionArgs) {
  const env = context.env;
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, { status: 405 });
  // Bitta IP'dan 10 daqiqada 10 ta — bot Telegram guruhini va jadvalni to'ldirib tashlamasin.
  if (!allowLead(context.ip || 'unknown')) return json({ error: 'too_many_requests' }, { status: 429 });

  // Lead JSON'i bir necha KB; kattasi o'qilgan baytlar bo'yicha (Content-Length'ga ishonmasdan) rad etiladi.
  const raw = await readJson(request, MAX_LEAD_BYTES);
  if (raw instanceof Response) return raw;
  const body = raw as Record<string, unknown> | null;
  // Honeypot: bot bo'sh 'company' maydonini to'ldiradi → jimgina "qabul qildik" deymiz.
  if (body && typeof body.company === 'string' && body.company !== '') return json({ ok: true });

  let input;
  try {
    input = parseOrderInput(body);
  } catch (e) {
    if (e instanceof ValidationError) return json({ error: e.message }, { status: 400 });
    return json({ error: 'invalid' }, { status: 400 });
  }

  // «Taxminiy narx» belgisi bazadan: tovar hozir «buyurtma asosida» bo'lsa (qoldiq 0), savatga qachon tushganidan
  // qat'i nazar operator buni ko'radi. Mijoz yuborgan belgiga ishonilmaydi (`parseOrderInput` uni o'tkazmaydi).
  const ids = [...new Set(input.items.map((it) => it.productId))];
  if (ids.length > 0) {
    const { results } = await env.DB.prepare(`SELECT id FROM products WHERE id IN (${ids.map(() => '?').join(',')}) AND ${ON_ORDER_SQL}`)
      .bind(...ids).all<{ id: string }>();
    const approx = new Set(results.map((r) => r.id));
    input.items = input.items.map((it) => (approx.has(it.productId) ? { ...it, approx: true } : it));
  }

  // site_config — bot token/chat + brend nomi.
  const cfgRow = await env.DB.prepare('SELECT * FROM site_config WHERE id = 1').first<SiteConfigRow>();
  const cfg = cfgRow ? rowToSiteConfig(cfgRow) : null;
  // customer_id sessiyadan (serverda) — klient body'siga ishonilmaydi.
  const customerId = cfg?.customerSessionSecret ? await customerIdFrom(request, cfg.customerSessionSecret, env) : null;

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

  const res = await env.DB.prepare(
    'INSERT INTO orders (name, phone, note, payment_kind, term_months, down_payment_uzs, monthly_uzs, total_uzs, items_json, source, telegram_sent, customer_id, address_text) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
  )
    .bind(
      input.name, input.phone, input.note, input.paymentKind,
      input.termMonths, input.downPaymentUzs, input.monthlyUzs, input.totalUzs,
      JSON.stringify(input.items), input.source, telegramSent, customerId, input.addressText || null,
    )
    .run();

  // id — Metrica e-commerce `purchase` voqeasi uchun (admin'dagi №{id} bilan bir xil).
  return json({ ok: true, id: Number(res.meta.last_row_id) });
}
