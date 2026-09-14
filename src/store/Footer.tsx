import { useState, type FC, type ReactNode } from 'react';
import { Link } from 'react-router';
import type { Translation } from '../locales';
import type { ApiSiteConfig } from '../../shared/types';
import type { PageLink } from '../../app/lib/loaders';
import { localizedPath, localeToTextKey, type Locale } from '../../app/lib/i18n';
import { safeHref } from '../lib/safe-href';
import { formatUzPhone, isCompleteUzPhone } from '../lib/phone';
import { ymGoal } from '../lib/metrica';
import logo from '../assets/logo.svg';
import logoDark from '../assets/hero/wordmark.webp';

/** "Huquqiy" ustuniga tushadigan sahifalar; qolgan sahifalar "Ma'lumot"da. */
const LEGAL = new Set(['muddatli-tolov', 'qaytarish', 'oferta', 'maxfiylik']);

const linkCls = 'text-body transition-colors duration-200 hover:text-primary';

/** Ustun sarlavhasi + ro'yxat — to'rtala ustun bir xil ritmda. */
const Col: FC<{ title: string; children: ReactNode }> = ({ title, children }) => (
  <div className="flex flex-col gap-5">
    <h3 className="text-copy font-medium text-primary">{title}</h3>
    <div className="flex flex-col gap-3.5 text-copy">{children}</div>
  </div>
);

/**
 * Qo'ng'iroq so'rovi kartasi — faqat telefon raqami. `/api/consult`ga ism
 * bo'sh, izoh "footer" bilan tushadi: operator admin "Buyurtmalar"da
 * konsultatsiya sifatida ko'radi, Telegram guruhiga ham keladi. Muvaffaqiyat
 * xabari forma o'rnida chiqadi — karta balandligi sakramaydi.
 */
const CallbackCard: FC<{ t: Translation; config: ApiSiteConfig }> = ({ t, config }) => {
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState(''); // honeypot
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState('');
  const [touched, setTouched] = useState(false);
  const badPhone = !isCompleteUzPhone(phone);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (badPhone) return;
    setBusy(true);
    setErr('');
    try {
      const res = await fetch('/api/consult', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ phone: phone.trim(), topics: [], note: "Qo'ng'iroq so'rovi (footer)", company }),
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

  return (
    <section className="footer-glow flex min-h-[420px] flex-col justify-between gap-12 rounded-xl p-6 md:min-h-[490px] md:p-14">
      <h2 className="max-w-[14ch] text-heading font-semibold text-balance md:text-display">{t.footerCtaTitle}</h2>
      {done ? (
        <p className="max-w-[40ch] text-lede text-white/85">{t.footerCtaDone}</p>
      ) : (
        <form onSubmit={submit} noValidate className="flex flex-col gap-3 sm:flex-row sm:items-start">
          <div className="flex flex-col gap-2 sm:w-[420px]">
            <label htmlFor="footer-phone" className="sr-only">{t.footerCtaPhone}</label>
            <input
              id="footer-phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={phone}
              onChange={(e) => { setPhone(formatUzPhone(e.target.value)); if (err) setErr(''); }}
              onFocus={() => { if (!phone) setPhone('+998 '); }}
              placeholder={t.footerCtaPhone}
              aria-invalid={(touched && badPhone) || undefined}
              className={`h-[52px] w-full rounded-sm border bg-white/10 px-5 text-control text-white outline-none transition-colors placeholder:text-white/60 focus:border-white/80 ${
                touched && badPhone ? 'border-sale' : 'border-white/30'
              }`}
            />
            {touched && badPhone && <p className="text-label text-white/80">{t.orderPhoneInvalid}</p>}
            {err && <p className="text-label text-white/80">{err}</p>}
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
            className="footer-glow-btn press inline-flex h-[52px] shrink-0 items-center justify-center rounded-sm bg-white px-8 text-copy font-medium disabled:opacity-60"
          >
            {busy ? t.consultSending : t.footerCtaButton}
          </button>
        </form>
      )}
    </section>
  );
};

/**
 * Footer (2026-09-14, "Stay ahead" naqshi): yuqorida qorong'i CTA kartasi,
 * ostida shior + to'rt ustun havola (Do'kon · Ma'lumot · Huquqiy · Aloqa),
 * pastda logo va copyright. Alohida fon bandi yo'q — sahifa fonida turadi,
 * ko'zni karta tortadi. Til almashtirgichi Header'da, shuning uchun bu yerda yo'q.
 *
 * Yandex xarita vidjeti ataylab yo'q: uchinchi tomon chrome'i sayt uslubiga
 * bo'ysunmaydi va har sahifada iframe yuklardi. Manzil matn, xarita — havola.
 */
const Footer: FC<{ t: Translation; locale: Locale; config: ApiSiteConfig; pageLinks: PageLink[]; hasDeals: boolean }> = ({ t, locale, config, pageLinks, hasDeals }) => {
  const textKey = localeToTextKey(locale);
  const mapLinkHref = `https://yandex.com/maps/?ll=${encodeURIComponent(config.mapLl)}&z=17&pt=${config.mapLl},pm2rdm`;
  const telegramHandle = `@${config.telegram.replace(/^https?:\/\/t\.me\//, '')}`;
  const instagramHandle = `@${config.instagram.replace(/^https?:\/\/www\.instagram\.com\//, '').replace(/\/$/, '')}`;
  const shop: { to: string; label: string }[] = [
    { to: '/katalog', label: t.catalogAll },
    // Chegirma bo'lmasa havola ham yo'q — bo'sh sahifa tashlandiq ko'rinadi.
    ...(hasDeals ? [{ to: '/chegirmalar', label: t.dealsTitle }] : []),
    { to: '/blog', label: t.blogTitle },
    { to: '/savat', label: t.cartTitle },
  ];
  const pages = pageLinks.map((p) => ({ to: `/page/${p.slug}`, label: p.title[textKey], legal: LEGAL.has(p.slug) }));
  const info = pages.filter((p) => !p.legal);
  const legal = pages.filter((p) => p.legal);
  const links = (xs: { to: string; label: string }[]) =>
    xs.map((m) => (
      <Link key={m.to} to={localizedPath(locale, m.to)} className={linkCls}>{m.label}</Link>
    ));

  return (
    <footer className="mt-auto w-full bg-bg">
      <div className="shell pb-12 pt-10 md:pb-16 md:pt-16">
        <CallbackCard t={t} config={config} />

        <div className="mt-14 grid grid-cols-2 gap-x-6 gap-y-10 md:mt-16 md:grid-cols-[minmax(0,1.4fr)_repeat(4,minmax(0,1fr))] md:gap-8">
          <p className="col-span-2 max-w-[22ch] text-lede font-medium text-pretty text-primary md:col-span-1 md:text-subhead">
            {t.footerDesc}
          </p>

          <Col title={t.footerShop}>{links(shop)}</Col>
          <Col title={t.footerInfo}>{links(info)}</Col>
          <Col title={t.footerLegal}>{links(legal)}</Col>
          <Col title={t.footerContact}>
            {config.phone && <a href={`tel:${config.phone}`} className={linkCls}>{config.phoneDisplay}</a>}
            {safeHref(config.telegram) && (
              <a href={safeHref(config.telegram) ?? undefined} target="_blank" rel="noopener noreferrer" className={linkCls}>{telegramHandle}</a>
            )}
            {safeHref(config.instagram) && (
              <a href={safeHref(config.instagram) ?? undefined} target="_blank" rel="noopener noreferrer" className={linkCls}>{instagramHandle}</a>
            )}
            <p className="text-muted">
              {t.footerAddressText1}
              <br />
              {t.footerAddressText2}
            </p>
            <p className="text-muted">{t.footerTime}</p>
            <a href={mapLinkHref} target="_blank" rel="noopener noreferrer" className={linkCls}>{t.mapLink}</a>
          </Col>
        </div>

        <div className="mt-20 flex items-center justify-between gap-4 md:mt-28">
          <span className="flex items-center">
            <img src={logo} alt={config.name} className="logo-light h-7 w-auto object-contain" />
            <img src={logoDark} alt="" aria-hidden className="logo-dark h-7 w-auto object-contain" />
          </span>
          <p className="text-right text-para text-muted-2">{`© ${new Date().getFullYear()} ${config.name}. ${t.footerCopyright}`}</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
