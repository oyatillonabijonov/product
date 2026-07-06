import { useEffect, useState } from 'react';
import type { ApiSiteConfig } from '../../shared/types';
import { getSiteConfig, updateSiteConfig } from './api';
import { errText } from './errText';

const FIELDS: { key: keyof ApiSiteConfig; label: string; placeholder?: string; secret?: boolean }[] = [
  { key: 'name', label: 'Do\'kon nomi' },
  { key: 'phone', label: 'Telefon (tel: format)', placeholder: '+998901234567' },
  { key: 'phoneDisplay', label: 'Telefon (ko\'rinish)', placeholder: '+998 (90) 123-45-67' },
  { key: 'telegram', label: 'Telegram URL' },
  { key: 'instagram', label: 'Instagram URL' },
  { key: 'whatsapp', label: 'WhatsApp URL' },
  { key: 'mapLl', label: 'Xarita koordinatalari (lon,lat)' },
  { key: 'mapLabel', label: 'Manzil yorlig\'i' },
  { key: 'seoTitleSuffix', label: 'SEO title suffiksi' },
  { key: 'seoDescription', label: 'SEO tavsif' },
  { key: 'ogImage', label: 'OG rasm yo\'li' },
  { key: 'telegramBotToken', label: 'Telegram bot tokeni (buyurtmalar uchun)', secret: true, placeholder: '123456:ABC-...' },
  { key: 'telegramOrderChatId', label: 'Buyurtma chat/guruh ID', placeholder: '-1001234567890' },
];

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
    <div className="bg-white rounded-2xl p-5 shadow-apple space-y-3 max-w-xl">
      <h3 className="font-semibold text-[17px]">Sayt ma'lumotlari</h3>
      {FIELDS.map((f) => (
        <label key={f.key} className="block text-[13px] text-muted">
          {f.label}
          <input
            type={f.secret ? 'password' : 'text'}
            value={form[f.key]}
            placeholder={f.placeholder}
            onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
            className="mt-1 w-full border border-line-2 rounded-xl px-3 py-2 text-[14px] text-primary"
          />
        </label>
      ))}
      <label className="block text-[13px] text-muted">
        To'lov rejimi
        <select
          value={form.paymentMode}
          onChange={(e) => setForm({ ...form, paymentMode: e.target.value as ApiSiteConfig['paymentMode'] })}
          className="mt-1 w-full border border-line-2 rounded-xl px-3 py-2 text-[14px] text-primary"
        >
          <option value="both">Naqd + muddatli</option>
          <option value="cash">Faqat naqd</option>
          <option value="installment">Faqat muddatli</option>
        </select>
      </label>
      {msg && <p className={`text-[13px] ${msg.includes('✓') ? 'text-trust' : 'text-danger'}`}>{msg}</p>}
      <button onClick={save} disabled={busy} className="px-5 py-2.5 bg-accent text-white font-semibold rounded-full disabled:opacity-50">Saqlash</button>
    </div>
  );
}
