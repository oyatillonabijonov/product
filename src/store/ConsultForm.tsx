import { useState, type FC } from 'react';
import { motion } from 'motion/react';
import { Check } from 'lucide-react';
import type { Translation } from '../locales';
import type { ApiSiteConfig } from '../../shared/types';
import { formatUzPhone, isCompleteUzPhone } from '../lib/phone';
import { ymGoal } from '../lib/metrica';
import { SPRING_UI } from '../lib/motion';
import { useAssets } from './SiteAssets';


/** Mavzu — pill; tanlangani ko'k chiziq (mahsulot konfiguratori bilan bir til). Ko'p tanlash mumkin. */
const Chip: FC<{ label: string; on: boolean; onToggle: () => void }> = ({ label, on, onToggle }) => (
  <button
    type="button"
    role="checkbox"
    aria-checked={on}
    onClick={onToggle}
    className={`press inline-flex h-11 items-center gap-1.5 rounded-full border-[1.5px] px-5 text-para ${
      on ? 'border-cta text-primary' : 'border-line text-body hover:border-muted-3'
    }`}
  >
    {on && <Check className="h-4 w-4 text-cta" strokeWidth={2.5} />}
    {label}
  </button>
);

/**
 * Bepul konsultatsiya formasi — landingning oxirida. Ariza `/api/consult`ga
 * ketadi va admin "Buyurtmalar" bo'limida `consult` belgisi bilan ko'rinadi.
 *
 * Ixcham karta: lg'da chapda rasm (~40%), o'ngda sarlavha, izoh, mavzular va
 * ism + telefon + tugma (md'dan bir qatorda). Mobilda rasm tepada, past banner.
 * Rasm balandlikni belgilamaydi — `absolute` bo'lib o'ng tomon balandligini to'ldiradi.
 * Muvaffaqiyat xabari o'ng tomonda chiqadi, rasm joyida qoladi.
 */
const ConsultForm: FC<{ t: Translation; config: ApiSiteConfig }> = ({ t, config }) => {
  const asset = useAssets();
  const topics = [
    t.consultTopicApple, t.consultTopicPc, t.consultTopicAudio,
    t.consultTopicVideo, t.consultTopicService, t.consultTopicOther,
  ];
  const [picked, setPicked] = useState<string[]>([]);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState(''); // honeypot
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState('');
  const [touched, setTouched] = useState(false);

  const badName = !name.trim();
  const badPhone = !isCompleteUzPhone(phone);

  function toggle(label: string) {
    setPicked((p) => (p.includes(label) ? p.filter((x) => x !== label) : [...p, label]));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (badName || badPhone) return;
    setBusy(true);
    setErr('');
    try {
      const res = await fetch('/api/consult', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), phone: phone.trim(), topics: picked, company }),
      });
      if (!res.ok) throw new Error();
      setDone(true);
      ymGoal(config.yandexMetricaId, 'consult_submit');
    } catch {
      setErr(t.consultError);
    } finally {
      setBusy(false);
    }
  }

  // Apple forma maydoni: ramkali quti, label ichida — fokusda yoki to'ldirilganda tepaga kichrayadi.
  // `text-control` (16px) — pastida iOS fokusda zoom qiladi.
  const field = (bad: boolean) =>
    `peer h-14 w-full rounded-sm border bg-bg px-4 pt-5 text-control text-primary outline-none placeholder:text-transparent ${
      bad ? 'border-danger' : 'border-line focus:border-cta'
    }`;
  const label = 'pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-control text-muted-2 transition-all duration-200 peer-focus:top-4 peer-focus:text-label peer-[:not(:placeholder-shown)]:top-4 peer-[:not(:placeholder-shown)]:text-label';

  return (
    <section id="konsultatsiya" className="rounded-xl scroll-mt-24 grid overflow-hidden bg-surface lg:grid-cols-[2fr_3fr]">
      <div aria-hidden className="relative h-48 md:h-64 lg:h-auto">
        <img src={asset('consult.image')} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
      </div>

      <div className="flex flex-col justify-center px-6 py-10 md:px-10 md:py-12 lg:px-12">
        {done ? (
          <div>
            <motion.div
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={SPRING_UI}
              className="flex h-14 w-14 items-center justify-center rounded-full bg-cta text-white"
            >
              <Check className="h-6 w-6" strokeWidth={2.5} />
            </motion.div>
            <h2 className="mt-5 text-subhead md:text-heading font-semibold text-primary">{t.consultDoneTitle}</h2>
            <p className="mt-2 max-w-[46ch] text-copy text-muted text-pretty">{t.consultDoneText}</p>
          </div>
        ) : (
          <>
            <h2 className="text-heading md:text-title font-semibold text-balance text-primary">{t.consultTitle}</h2>
            <p className="mt-3 max-w-[56ch] text-copy text-muted text-pretty">{t.consultLead}</p>

            <div className="mt-6 flex flex-wrap gap-2">
              {topics.map((label_) => (
                <Chip key={label_} label={label_} on={picked.includes(label_)} onToggle={() => toggle(label_)} />
              ))}
            </div>

            <form onSubmit={submit} noValidate className="mt-6 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
              <div className="relative">
                <input
                  id="consult-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder=" "
                  autoComplete="name"
                  aria-invalid={touched && badName}
                  className={field(touched && badName)}
                />
                <label htmlFor="consult-name" className={label}>{t.consultName} *</label>
              </div>

              <div className="relative">
                <input
                  id="consult-phone"
                  value={phone}
                  onChange={(e) => setPhone(formatUzPhone(e.target.value))}
                  onFocus={() => { if (!phone) setPhone('+998 '); }}
                  placeholder=" "
                  inputMode="tel"
                  autoComplete="tel"
                  aria-invalid={touched && badPhone}
                  className={field(touched && badPhone)}
                />
                <label htmlFor="consult-phone" className={label}>{t.consultPhone} *</label>
              </div>

              {/* honeypot — foydalanuvchiga ko'rinmaydi, bot to'ldirsa ariza tashlanadi */}
              <input
                type="text"
                tabIndex={-1}
                autoComplete="off"
                aria-hidden
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="absolute h-0 w-0 opacity-0"
              />

              <button
                type="submit"
                disabled={busy}
                className="press h-14 rounded-full bg-cta px-8 text-copy text-white hover:bg-cta-hover disabled:opacity-60"
              >
                {busy ? t.consultSending : t.consultSubmit}
              </button>

              {err && <p className="text-label text-danger md:col-span-3">{err}</p>}
            </form>
          </>
        )}
      </div>
    </section>
  );
};

export default ConsultForm;
