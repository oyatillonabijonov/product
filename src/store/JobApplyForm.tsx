import { useState } from 'react';
import type { FC } from 'react';
import { useOutletContext } from 'react-router';
import { Send, X } from 'lucide-react';
import type { Translation } from '../locales';
import type { StoreContext } from './StoreLayout';
import { formatUzPhone, isCompleteUzPhone } from '../lib/phone';
import { ymGoal } from '../lib/metrica';
import Modal from './Modal';

/** Server bilan bir xil qoida (`parseJobApplicationInput`) — xato forma ichida, jim ishlamaslik yo'q. */
const RESUME_RE = /^https:\/\/\S+$/i;

/**
 * Nomzod arizasi — OrderForm naqshi: `Modal`, ikki bosqichli yopilish (`onExited`), qatordagi
 * xatolar, honeypot. `vacancyId` serverga ketadi; lavozim nomi serverda vakansiyadan olinadi,
 * `position` faqat sarlavhada ko'rsatish uchun.
 */
const JobApplyForm: FC<{ t: Translation; vacancyId: string | null; position: string; onClose: () => void }> = ({
  t, vacancyId, position, onClose,
}) => {
  const { customer, config } = useOutletContext<StoreContext>();
  const [name, setName] = useState(customer?.name ?? '');
  const [phone, setPhone] = useState(formatUzPhone(customer?.phone ?? ''));
  const [message, setMessage] = useState('');
  const [resumeUrl, setResumeUrl] = useState('');
  const [company, setCompany] = useState(''); // honeypot
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState('');
  const [nameErr, setNameErr] = useState('');
  const [phoneErr, setPhoneErr] = useState('');
  const [resumeErr, setResumeErr] = useState('');
  const [open, setOpen] = useState(true);

  async function submit(e: { preventDefault: () => void }) {
    e.preventDefault();
    const resume = resumeUrl.trim();
    const badName = !name.trim();
    const badPhone = !isCompleteUzPhone(phone);
    const badResume = resume !== '' && (resume.length > 500 || !RESUME_RE.test(resume));
    setNameErr(badName ? t.orderNameRequired : '');
    setPhoneErr(badPhone ? t.orderPhoneInvalid : '');
    setResumeErr(badResume ? t.careersResumeInvalid : '');
    if (badName || badPhone || badResume) return;
    setBusy(true);
    setErr('');
    try {
      const res = await fetch('/api/job-apply', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), phone: phone.trim(), message: message.trim(), resumeUrl: resume, vacancyId, company }),
      });
      if (!res.ok) throw new Error();
      setDone(true);
      ymGoal(config.yandexMetricaId, 'job_apply');
    } catch {
      setErr(t.orderError);
    } finally {
      setBusy(false);
    }
  }

  // Maydon foni sahifa foni (`bg-bg`): modal `surface` ustida turadi, cho'kkan maydon
  // uni chegara bilan emas, chuqurlik bilan ajratadi.
  const inputCls = (bad: boolean) =>
    `rounded-sm w-full border px-3 py-2.5 text-control text-primary bg-bg focus:outline-none ${
      bad ? 'border-danger focus:border-danger' : 'border-line focus:border-accent'
    }`;

  return (
    <Modal open={open} label={t.careersFormTitle} onClose={() => setOpen(false)} onExited={onClose}>
      <div className="p-6">
        <button onClick={() => setOpen(false)} aria-label={t.orderClose} className="press absolute top-4 right-4 text-muted-2 hover:text-primary">
          <X className="w-5 h-5" />
        </button>

        {done ? (
          <div className="py-6 text-center">
            <p className="text-control font-semibold text-primary">{t.careersDoneTitle}</p>
            <p className="text-label text-muted mt-2">{t.careersDoneText}</p>
            <button onClick={() => setOpen(false)} className="press mt-5 w-full h-11 bg-primary text-bg font-normal text-copy rounded-full">
              {t.orderClose}
            </button>
          </div>
        ) : (
          <form onSubmit={submit} noValidate>
            <h2 className="text-lede font-semibold pr-8">{t.careersFormTitle}</h2>
            <p className="text-label text-muted mt-1 mb-4 line-clamp-2">{position}</p>

            <label htmlFor="job-name" className="block text-label text-muted mb-1">{t.orderName}</label>
            <input
              id="job-name" value={name} autoComplete="name" autoFocus
              onChange={(e) => { setName(e.target.value); if (nameErr) setNameErr(''); }}
              aria-invalid={Boolean(nameErr) || undefined}
              className={`${inputCls(Boolean(nameErr))} ${nameErr ? 'mb-1' : 'mb-3'}`}
            />
            {nameErr && <p className="text-label text-danger mb-2">{nameErr}</p>}

            <label htmlFor="job-phone" className="block text-label text-muted mb-1">{t.orderPhone}</label>
            <input
              id="job-phone" type="tel" inputMode="tel" autoComplete="tel" value={phone}
              onChange={(e) => { setPhone(formatUzPhone(e.target.value)); if (phoneErr) setPhoneErr(''); }}
              onFocus={() => { if (!phone) setPhone('+998 '); }}
              aria-invalid={Boolean(phoneErr) || undefined}
              className={`${inputCls(Boolean(phoneErr))} tabular-nums ${phoneErr ? 'mb-1' : 'mb-3'}`}
            />
            {phoneErr && <p className="text-label text-danger mb-2">{phoneErr}</p>}

            <label htmlFor="job-message" className="block text-label text-muted mb-1">{t.careersMessage}</label>
            <textarea
              id="job-message" rows={3} value={message} maxLength={1000}
              onChange={(e) => setMessage(e.target.value)}
              className={`${inputCls(false)} mb-3 resize-none`}
            />

            <label htmlFor="job-resume" className="block text-label text-muted mb-1">{t.careersResume}</label>
            <input
              id="job-resume" type="url" inputMode="url" value={resumeUrl} placeholder="https://"
              onChange={(e) => { setResumeUrl(e.target.value); if (resumeErr) setResumeErr(''); }}
              aria-invalid={Boolean(resumeErr) || undefined} aria-describedby="job-resume-hint"
              className={`${inputCls(Boolean(resumeErr))} mb-1`}
            />
            <p id="job-resume-hint" className={`text-label mb-4 ${resumeErr ? 'text-danger' : 'text-muted-2'}`}>
              {resumeErr || t.careersResumeHint}
            </p>

            {/* honeypot — foydalanuvchiga ko'rinmaydi, bot to'ldirsa ariza tashlanadi */}
            <input tabIndex={-1} autoComplete="off" value={company} onChange={(e) => setCompany(e.target.value)} className="hidden" aria-hidden="true" />

            {err && <p className="text-label text-sale mb-3">{err}</p>}

            <button
              type="submit" disabled={busy}
              className="press w-full h-[52px] bg-cta text-white font-normal text-control rounded-full hover:bg-cta-hover flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Send className="w-4.5 h-4.5" /> {busy ? t.orderSending : t.careersSubmit}
            </button>
          </form>
        )}
      </div>
    </Modal>
  );
};

export default JobApplyForm;
