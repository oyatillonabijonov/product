import { useState, type FC } from 'react';
import { motion } from 'motion/react';
import { ArrowUpRight, Check } from 'lucide-react';
import type { Translation } from '../locales';
import { PILL, SECTION_HEADING } from './ui';
import type { ApiSiteConfig } from '../../shared/types';
import { formatUzPhone, isCompleteUzPhone } from '../lib/phone';
import { ymGoal } from '../lib/metrica';
import { SPRING_UI } from '../lib/motion';


/** Chip — bosilganda ichidagi doira to'ladi. Ko'p tanlash mumkin. */
const Chip: FC<{ label: string; on: boolean; onToggle: () => void }> = ({ label, on, onToggle }) => (
  <button
    type="button"
    role="checkbox"
    aria-checked={on}
    onClick={onToggle}
    className={`press inline-flex h-11 items-center gap-3 rounded-full border pl-3 pr-6 text-copy font-normal ${
      on ? 'border-primary bg-primary/[0.06] text-primary' : 'border-line text-body hover:border-muted-3'
    }`}
  >
    <span
      aria-hidden
      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-colors duration-200 ${
        on ? 'bg-primary text-bg' : 'bg-fill-2'
      }`}
    >
      {on && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
    </span>
    {label}
  </button>
);

/**
 * Bepul konsultatsiya formasi — landingda FAQ o'rnida. Ariza `/api/consult`ga
 * ketadi va admin "Buyurtmalar" bo'limida `consult` belgisi bilan ko'rinadi.
 */
const ConsultForm: FC<{ t: Translation; config: ApiSiteConfig }> = ({ t, config }) => {
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

  // Chiziqli (underline) maydon — to'ldirilganda label tepaga chiqadi.
  const field = (bad: boolean) =>
    `peer w-full border-0 border-b bg-transparent pb-3 pt-6 text-copy text-primary outline-none transition-colors placeholder:text-transparent ${
      bad ? 'border-danger' : 'border-line focus:border-primary'
    }`;
  const label = 'pointer-events-none absolute left-0 top-6 text-copy text-muted-2 transition-all duration-200 peer-focus:top-0 peer-focus:text-label peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:text-label';

  if (done) {
    return (
      <section id="konsultatsiya" className="rounded-xl scroll-mt-24 bg-surface px-6 py-16 text-center md:px-10 md:py-24">
        <motion.div
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={SPRING_UI}
          className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary text-bg"
        >
          <Check className="h-7 w-7" strokeWidth={2.5} />
        </motion.div>
        <h2 className="mt-6 text-subhead md:text-heading font-semibold">{t.consultDoneTitle}</h2>
        <p className="mx-auto mt-3 max-w-[46ch] text-para leading-relaxed text-muted">{t.consultDoneText}</p>
      </section>
    );
  }

  return (
    <section id="konsultatsiya" className="rounded-xl scroll-mt-24 overflow-hidden bg-surface">
      <div className="grid gap-10 px-6 py-10 md:px-10 md:py-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)] lg:gap-16">
        <div>
          <h2 className={SECTION_HEADING}>
            {t.consultTitle}
          </h2>
          <p className="mt-4 max-w-[52ch] text-para md:text-control leading-relaxed text-muted text-pretty">
            {t.consultLead}
          </p>
          <div className="mt-8 flex flex-wrap gap-2.5">
            {topics.map((label_) => (
              <Chip key={label_} label={label_} on={picked.includes(label_)} onToggle={() => toggle(label_)} />
            ))}
          </div>
        </div>

        <form onSubmit={submit} noValidate className="flex flex-col">
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

          <div className="relative mt-7">
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

          {err && <p className="mt-4 text-label text-danger">{err}</p>}

          <button
            type="submit"
            disabled={busy}
            className={`${PILL} group mt-8 justify-center disabled:opacity-60`}
          >
            {busy ? t.consultSending : t.consultSubmit}
            {!busy && <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />}
          </button>
        </form>
      </div>
    </section>
  );
};

export default ConsultForm;
