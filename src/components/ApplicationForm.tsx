import { useEffect, useState } from 'react';
import { Send } from 'lucide-react';
import type { Translation } from '../locales';
import { products, installmentConfig } from '../data/products';
import {
  calcInstallment,
  composeLeadMessage,
  formatUzs,
  telegramShareUrl,
  whatsappUrl,
} from '../lib/installment';

export default function ApplicationForm({
  t,
  productId,
  months,
}: {
  t: Translation;
  productId: string;
  months: number;
}) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [device, setDevice] = useState(productId);
  const [term, setTerm] = useState(months);
  const [errors, setErrors] = useState<{ name?: string; phone?: string }>({});

  // Calculator tanlovi o'zgarganda formani sinxronlash
  useEffect(() => setDevice(productId), [productId]);
  useEffect(() => setTerm(months), [months]);

  function buildMessage(): string | null {
    const nextErrors: { name?: string; phone?: string } = {};
    if (name.trim().length < 2) nextErrors.name = t.formErrName;
    if (phone.replace(/\D/g, '').length < 9) nextErrors.phone = t.formErrPhone;
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return null;

    const product = products.find((p) => p.id === device) ?? products[0];
    const selectedTerm =
      installmentConfig.terms.find((x) => x.months === term) ??
      installmentConfig.terms[installmentConfig.terms.length - 1];
    const result = calcInstallment(product, selectedTerm, installmentConfig);

    return composeLeadMessage({
      name: name.trim(),
      phone: phone.trim(),
      product: product.name,
      months: selectedTerm.months,
      monthly: formatUzs(result.monthly),
    });
  }

  function send(channel: 'telegram' | 'whatsapp') {
    const message = buildMessage();
    if (!message) return;
    const url = channel === 'telegram' ? telegramShareUrl(message) : whatsappUrl(message);
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  const inputClass =
    'w-full bg-white border rounded-2xl px-4 py-3 text-[15px] text-[#1D1D1F] focus:outline-none focus:border-[#0071E3] transition-colors';

  return (
    <section id="application" className="w-full max-w-[920px] mx-auto px-4 md:px-0 pb-12 md:pb-20 pt-8 md:pt-10">
      <div className="bg-[#F5F5F7] rounded-[30px] p-6 md:p-10">
        <h2 className="text-[28px] md:text-[36px] font-semibold tracking-[-0.015em] text-center mb-2">
          {t.formTitle}
        </h2>
        <p className="text-[16px] text-[#6E6E73] text-center mb-8 max-w-lg mx-auto">{t.formSubtitle}</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
          <div>
            <label htmlFor="form-name" className="block text-[13px] font-semibold text-[#6E6E73] mb-2">
              {t.formName}
            </label>
            <input
              id="form-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t.formNamePlaceholder}
              className={`${inputClass} ${errors.name ? 'border-[#E30000]' : 'border-[#D2D2D7]'}`}
            />
            {errors.name && <p className="text-[12px] text-[#E30000] mt-1">{errors.name}</p>}
          </div>

          <div>
            <label htmlFor="form-phone" className="block text-[13px] font-semibold text-[#6E6E73] mb-2">
              {t.formPhone}
            </label>
            <input
              id="form-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={t.formPhonePlaceholder}
              className={`${inputClass} ${errors.phone ? 'border-[#E30000]' : 'border-[#D2D2D7]'}`}
            />
            {errors.phone && <p className="text-[12px] text-[#E30000] mt-1">{errors.phone}</p>}
          </div>

          <div>
            <label htmlFor="form-device" className="block text-[13px] font-semibold text-[#6E6E73] mb-2">
              {t.formDevice}
            </label>
            <select
              id="form-device"
              value={device}
              onChange={(e) => setDevice(e.target.value)}
              className={`${inputClass} border-[#D2D2D7]`}
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="form-term" className="block text-[13px] font-semibold text-[#6E6E73] mb-2">
              {t.formTermLabel}
            </label>
            <select
              id="form-term"
              value={term}
              onChange={(e) => setTerm(Number(e.target.value))}
              className={`${inputClass} border-[#D2D2D7]`}
            >
              {installmentConfig.terms.map((x) => (
                <option key={x.months} value={x.months}>
                  {x.months} {t.calcMonths}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 max-w-2xl mx-auto mt-6">
          <button
            onClick={() => send('telegram')}
            className="flex-1 py-3.5 bg-[#0071E3] text-white text-[16px] font-semibold rounded-full hover:bg-[#0077ED] transition-colors flex items-center justify-center gap-2"
          >
            <Send className="w-5 h-5" /> {t.formSendTelegram}
          </button>
          <button
            onClick={() => send('whatsapp')}
            className="flex-1 py-3.5 bg-[#1D1D1F] text-white text-[16px] font-semibold rounded-full hover:bg-[#25D366] transition-colors flex items-center justify-center gap-2"
          >
            {t.formSendWhatsapp}
          </button>
        </div>
      </div>
    </section>
  );
}
