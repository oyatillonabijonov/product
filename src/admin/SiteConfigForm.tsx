import { useEffect, useState } from 'react';
import type { ApiSiteConfig } from '../../shared/types';
import { getSiteConfig, updateSiteConfig } from './api';

const FIELDS: { key: keyof ApiSiteConfig; label: string; placeholder?: string }[] = [
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
];

export default function SiteConfigForm() {
  const [form, setForm] = useState<ApiSiteConfig | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    getSiteConfig().then(setForm).catch(() => setMsg('Yuklashda xatolik (migratsiya qo\'llanganmi?)'));
  }, []);

  if (!form) return <p className="text-[#6E6E73]">{msg || 'Yuklanmoqda…'}</p>;

  async function save() {
    if (!form) return;
    setBusy(true); setMsg('');
    try { await updateSiteConfig(form); setMsg('Saqlandi ✓'); }
    catch (e) { setMsg(e instanceof Error ? e.message : 'Xatolik'); }
    finally { setBusy(false); }
  }

  return (
    <div className="bg-white rounded-2xl p-5 shadow-[--shadow-apple] space-y-3 max-w-xl">
      <h3 className="font-semibold text-[17px]">Sayt ma'lumotlari</h3>
      {FIELDS.map((f) => (
        <label key={f.key} className="block text-[13px] text-[#6E6E73]">
          {f.label}
          <input
            value={form[f.key]}
            placeholder={f.placeholder}
            onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
            className="mt-1 w-full border border-[#E5E5EA] rounded-xl px-3 py-2 text-[14px] text-[#1D1D1F]"
          />
        </label>
      ))}
      {msg && <p className={`text-[13px] ${msg.includes('✓') ? 'text-[#1B7A34]' : 'text-[#E8462D]'}`}>{msg}</p>}
      <button onClick={save} disabled={busy} className="px-5 py-2.5 bg-[#0071E3] text-white font-semibold rounded-full disabled:opacity-50">Saqlash</button>
    </div>
  );
}
