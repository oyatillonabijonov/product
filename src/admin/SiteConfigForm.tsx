import { useEffect, useState } from 'react';
import type { ApiSiteConfig } from '../../shared/types';
import { getSiteConfig, updateSiteConfig } from './api';
import { errText } from './errText';

type Field = { key: keyof ApiSiteConfig; label: string; placeholder?: string; secret?: boolean; hint?: string };
type Group = { title: string; desc: string; fields: Field[]; optional?: boolean };

// Mijoz (do'kon egasi) uchun: xom maydonlar o'rniga mantiqiy bo'limlar + har biriga sodda izoh.
const GROUPS: Group[] = [
  {
    title: "Do'kon ma'lumotlari",
    desc: 'Saytda ko\'rinadigan asosiy ma\'lumotlar.',
    fields: [
      { key: 'name', label: "Do'kon nomi" },
      { key: 'phoneDisplay', label: 'Telefon (ko\'rinishi)', placeholder: '+998 (90) 123-45-67', hint: 'Saytda shu ko\'rinishda chiqadi.' },
      { key: 'phone', label: 'Telefon (bosilganda)', placeholder: '+998901234567', hint: 'Faqat raqamlar — bosilganda shu raqamga qo\'ng\'iroq ochiladi.' },
    ],
  },
  {
    title: 'Aloqa va ijtimoiy tarmoqlar',
    desc: 'Footer va aloqa tugmalarida chiqadi. Bo\'sh qoldirsangiz ko\'rinmaydi.',
    fields: [
      { key: 'telegram', label: 'Telegram', placeholder: 'https://t.me/username' },
      { key: 'instagram', label: 'Instagram', placeholder: 'https://instagram.com/username' },
      { key: 'whatsapp', label: 'WhatsApp', placeholder: 'https://wa.me/998901234567' },
    ],
  },
  {
    title: 'Manzil (xarita)',
    desc: 'Footer xaritasida ko\'rsatiladi.',
    fields: [
      { key: 'mapLl', label: 'Koordinata', placeholder: '69.240562,41.311081', hint: 'Yandex Xaritada do\'koningizni toping → o\'ng tugma → koordinatani nusxalang (lon,lat).' },
      { key: 'mapLabel', label: 'Manzil yozuvi', placeholder: 'Chilonzor, Toshkent' },
    ],
  },
  {
    title: 'Buyurtma xabarnomasi (Telegram bot)',
    desc: 'Yangi buyurtma kelganda sizga Telegramга xabar keladi.',
    optional: true,
    fields: [
      { key: 'telegramBotToken', label: 'Bot tokeni', secret: true, placeholder: '123456:ABC-...', hint: 'BotFather (@BotFather) da bot yarating → tokenni shu yerga qo\'ying.' },
      { key: 'telegramOrderChatId', label: 'Chat/guruh ID', placeholder: '-1001234567890', hint: 'Botni guruhga admin qilib qo\'shing, guruh ID sini shu yerga yozing.' },
    ],
  },
  {
    title: 'Mijoz kirishi (ixtiyoriy)',
    desc: 'Mijozlar Google yoki Telegram bilan kirib, buyurtma tarixini ko\'ra oladi.',
    optional: true,
    fields: [
      { key: 'googleClientId', label: 'Google Client ID' },
      { key: 'googleClientSecret', label: 'Google Client Secret', secret: true },
      { key: 'telegramLoginBot', label: 'Telegram login bot username', placeholder: 'my_login_bot' },
    ],
  },
  {
    title: 'SEO va analitika (ilg\'or)',
    desc: 'Qidiruv tizimlari va tashrif statistikasi. Bilmasangiz tegmasangiz ham bo\'ladi.',
    optional: true,
    fields: [
      { key: 'seoTitleSuffix', label: 'Sarlavha qo\'shimchasi', hint: 'Har bir sahifa sarlavhasi oxiriga qo\'shiladi.' },
      { key: 'seoDescription', label: 'Bosh sahifa tavsifi' },
      { key: 'ogImage', label: 'Ulashish rasmi yo\'li', placeholder: '/og.png' },
      { key: 'yandexMetricaId', label: 'Yandex Metrica raqami', placeholder: '12345678' },
    ],
  },
];

const inputCls = 'mt-1 w-full border border-line-2 rounded-xl px-3 py-2 text-[14px] text-primary focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/15 transition';

export default function SiteConfigForm() {
  const [form, setForm] = useState<ApiSiteConfig | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    getSiteConfig().then(setForm).catch(() => setMsg('Yuklashda xatolik (migratsiya qo\'llanganmi?)'));
  }, []);

  if (!form) return <p className="text-muted">{msg || 'Yuklanmoqda…'}</p>;

  async function save() {
    if (!form) return;
    if (!form.name.trim() || !form.phone.trim()) { setMsg(errText(new Error(!form.name.trim() ? 'name_required' : 'phone_required'))); return; }
    setBusy(true); setMsg('');
    try { await updateSiteConfig(form); setMsg('Saqlandi ✓'); }
    catch (e) { setMsg(errText(e)); }
    finally { setBusy(false); }
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-[20px] font-semibold text-primary">Sayt ma'lumotlari</h2>
        <p className="text-[13.5px] text-muted mt-0.5">Do'koningiz haqidagi barcha sozlamalar. O'zgartirgach pastdagi «Saqlash» tugmasini bosing.</p>
      </div>

      {GROUPS.map((g) => (
        <section key={g.title} className="bg-white rounded-2xl border border-line-2 shadow-apple p-5">
          <div className="mb-3.5">
            <h3 className="font-semibold text-[15.5px] text-primary flex items-center gap-2">
              {g.title}
              {g.optional && <span className="text-[11px] font-medium text-muted-2 bg-bg rounded-full px-2 py-0.5">ixtiyoriy</span>}
            </h3>
            <p className="text-[12.5px] text-muted mt-1">{g.desc}</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-x-4 gap-y-3.5">
            {g.fields.map((f) => (
              <label key={f.key} className="block text-[12.5px] font-medium text-muted">
                {f.label}
                <input
                  type={f.secret ? 'password' : 'text'}
                  value={form[f.key]}
                  placeholder={f.placeholder}
                  onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                  className={inputCls}
                />
                {f.hint && <span className="block text-[11.5px] text-muted-2 font-normal mt-1">{f.hint}</span>}
              </label>
            ))}
            {g.title === "Do'kon ma'lumotlari" && (
              <label className="block text-[12.5px] font-medium text-muted">
                Narx ko'rsatish rejimi
                <select
                  value={form.paymentMode}
                  onChange={(e) => setForm({ ...form, paymentMode: e.target.value as ApiSiteConfig['paymentMode'] })}
                  className={inputCls}
                >
                  <option value="both">Naqd + muddatli</option>
                  <option value="cash">Faqat naqd</option>
                  <option value="installment">Faqat muddatli</option>
                </select>
                <span className="block text-[11.5px] text-muted-2 font-normal mt-1">Mahsulot narxi qanday ko'rsatilishi.</span>
              </label>
            )}
          </div>
        </section>
      ))}

      <div className="sticky bottom-4 flex items-center gap-3 bg-white/90 backdrop-blur border border-line-2 shadow-apple rounded-full px-4 py-3">
        <button onClick={save} disabled={busy} className="px-6 py-2.5 bg-accent text-white font-semibold rounded-full hover:bg-accent-hover transition-colors disabled:opacity-50">
          {busy ? 'Saqlanmoqda…' : 'Saqlash'}
        </button>
        {msg && <p className={`text-[13px] font-medium ${msg.includes('✓') ? 'text-trust' : 'text-danger'}`}>{msg}</p>}
      </div>
    </div>
  );
}
