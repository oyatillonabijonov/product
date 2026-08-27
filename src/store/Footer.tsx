import { useEffect, useState, type FC, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router';
import { Phone, Send, Instagram, ArrowUpRight } from 'lucide-react';
import type { Translation } from '../locales';
import type { ApiSiteConfig } from '../../shared/types';
import type { PageLink } from '../../app/lib/loaders';
import { localizedPath, localeToTextKey, stripLocale, type Locale } from '../../app/lib/i18n';
import { safeHref } from '../lib/safe-href';
import logo from '../assets/logo.svg';
import { effectiveDark } from './ThemeToggle';

/** Ustun sarlavhasi + ro'yxat — uchala ustun bir xil ritmda tursin. */
const Col: FC<{ title: string; children: ReactNode }> = ({ title, children }) => (
  <div className="flex flex-col gap-4">
    <h3 className="text-[14px] font-medium text-muted-2">{title}</h3>
    <div className="flex flex-col gap-3 text-[15px]">{children}</div>
  </div>
);

const linkCls = 'text-body transition-colors duration-200 hover:text-primary';
const rowCls = `flex items-center gap-2.5 ${linkCls}`;

/**
 * Footer — to'rt ustun: brend, menyu, aloqa, manzil; ostida nozik chiziq va
 * qator (copyright · til).
 *
 * Yandex xarita widget'i ataylab yo'q: uchinchi tomon chrome'i (Traffic, zoom,
 * "Open in Yandex Maps") sayt uslubiga bo'ysunmaydi va har sahifada iframe
 * yuklardi. Manzil matn bo'lib turadi, xarita esa bitta havola.
 */
const Footer: FC<{ t: Translation; locale: Locale; config: ApiSiteConfig; pageLinks: PageLink[] }> = ({ t, locale, config, pageLinks }) => {
  const location = useLocation();
  const barePath = stripLocale(location.pathname);
  // Yandex'ning o'z dark temasi (CSS filtr xaritani iflos qiladi) — tema
  // almashtirilganda vidjet ham ergashadi.
  const [darkMap, setDarkMap] = useState(barePath === '/');
  useEffect(() => {
    const sync = () => setDarkMap(effectiveDark());
    sync();
    window.addEventListener('themechange', sync);
    return () => window.removeEventListener('themechange', sync);
  }, [barePath]);
  const mapWidgetSrc = `https://yandex.com/map-widget/v1/?ll=${encodeURIComponent(config.mapLl)}&z=17&pt=${config.mapLl},pm2rdm${darkMap ? '&theme=dark' : ''}`;
  const textKey = localeToTextKey(locale);
  const mapLinkHref = `https://yandex.com/maps/?ll=${encodeURIComponent(config.mapLl)}&z=17&pt=${config.mapLl},pm2rdm`;
  const telegramHandle = `@${config.telegram.replace(/^https?:\/\/t\.me\//, '')}`;
  const instagramHandle = `@${config.instagram.replace(/^https?:\/\/www\.instagram\.com\//, '').replace(/\/$/, '')}`;
  const menu: { to: string; label: string }[] = [
    { to: '/katalog', label: t.catalogAll },
    { to: '/chegirmalar', label: t.dealsTitle },
    { to: '/savat', label: t.cartTitle },
  ];
  const info = pageLinks.map((p) => ({ to: `/page/${p.slug}`, label: p.title[textKey] }));
  return (
    <footer className="mt-auto w-full border-t border-line bg-surface-2">
      <div className="mx-auto w-full max-w-[1440px] px-4 py-16 md:py-20">
        {/* Xarita — to'liq enli past tasma. Yandex vidjeti o'z boshqaruvlarini
            ko'rsatadi, shuning uchun balandligi ataylab past: u footer'ni
            egallamaydi, manzil esa pastdagi ustunda matn bo'lib turadi. */}
        <div className="mb-14 h-[200px] overflow-hidden rounded-[20px] border border-line md:h-[240px]">
          <iframe
            src={mapWidgetSrc}
            title={config.mapLabel || t.mapTitle}
            loading="lazy"
            allowFullScreen
            className="h-full w-full border-0"
          />
        </div>

        <div className="grid gap-12 md:grid-cols-[minmax(0,1.2fr)_repeat(4,minmax(0,1fr))] md:gap-10">
          <div className="flex flex-col gap-5">
            <img src={logo} alt={config.name} className="h-9 w-auto self-start object-contain" />
            <p className="max-w-[280px] text-[15px] leading-[1.55] text-muted text-pretty">{t.footerDesc}</p>
          </div>

          <Col title={t.footerMenu}>
            {menu.map((m) => (
              <Link key={m.to} to={localizedPath(locale, m.to)} className={linkCls}>
                {m.label}
              </Link>
            ))}
          </Col>

          <Col title={t.footerInfo}>
            {info.map((m) => (
              <Link key={m.to} to={localizedPath(locale, m.to)} className={linkCls}>
                {m.label}
              </Link>
            ))}
          </Col>

          <Col title={t.footerContact}>
            {config.phone && (
              <a href={`tel:${config.phone}`} className={rowCls}>
                <Phone aria-hidden className="h-4 w-4 shrink-0 text-muted-3" /> {config.phoneDisplay}
              </a>
            )}
            {safeHref(config.telegram) && (
              <a href={safeHref(config.telegram) ?? undefined} target="_blank" rel="noopener noreferrer" className={rowCls}>
                <Send aria-hidden className="h-4 w-4 shrink-0 text-muted-3" /> {telegramHandle}
              </a>
            )}
            {safeHref(config.instagram) && (
              <a href={safeHref(config.instagram) ?? undefined} target="_blank" rel="noopener noreferrer" className={rowCls}>
                <Instagram aria-hidden className="h-4 w-4 shrink-0 text-muted-3" /> {instagramHandle}
              </a>
            )}
          </Col>

          <Col title={t.mapTitle}>
            <p className="text-muted">
              {t.footerAddressText1}
              <br />
              {t.footerAddressText2}
            </p>
            <p className="text-muted">{t.footerTime}</p>
            <a href={mapLinkHref} target="_blank" rel="noopener noreferrer" className={`${rowCls} gap-1`}>
              {t.mapLink}
              <ArrowUpRight aria-hidden className="h-4 w-4 shrink-0" />
            </a>
          </Col>
        </div>

        <div className="mt-16 flex flex-col-reverse items-center gap-4 border-t border-line pt-6 text-[14px] md:flex-row md:justify-between">
          <p className="text-muted-2">{`© ${new Date().getFullYear()} ${config.name}. ${t.footerCopyright}`}</p>
          <div className="flex items-center gap-3">
            <Link to={barePath + location.search} className={locale === 'uz' ? 'font-medium text-primary' : 'text-muted-2 transition-colors hover:text-primary'}>
              O'zbekcha
            </Link>
            <span aria-hidden className="text-line">·</span>
            <Link to={localizedPath('ru', barePath) + location.search} className={locale === 'ru' ? 'font-medium text-primary' : 'text-muted-2 transition-colors hover:text-primary'}>
              Русский
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
