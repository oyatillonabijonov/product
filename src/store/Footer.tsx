import type { FC } from 'react';
import { Link } from 'react-router';
import { Phone, Send, Instagram, MapPin, Clock, ExternalLink } from 'lucide-react';
import type { Translation } from '../locales';
import type { ApiSiteConfig } from '../../shared/types';
import type { PageLink } from '../../app/lib/loaders';
import { localizedPath, localeToTextKey, type Locale } from '../../app/lib/i18n';
import { safeHref } from '../lib/safe-href';
import logo from '../assets/logo.svg';

const Footer: FC<{ t: Translation; locale: Locale; config: ApiSiteConfig; pageLinks: PageLink[] }> = ({ t, locale, config, pageLinks }) => {
  const mapWidgetSrc = `https://yandex.com/map-widget/v1/?ll=${encodeURIComponent(config.mapLl)}&z=17&pt=${config.mapLl},pm2rdm`;
  const mapLinkHref = `https://yandex.com/maps/?ll=${encodeURIComponent(config.mapLl)}&z=17&pt=${config.mapLl},pm2rdm`;
  const telegramHandle = `@${config.telegram.replace(/^https?:\/\/t\.me\//, '')}`;
  const instagramHandle = `@${config.instagram.replace(/^https?:\/\/www\.instagram\.com\//, '').replace(/\/$/, '')}`;
  const textKey = localeToTextKey(locale);
  return (
    <footer className="w-full bg-bg pt-16 pb-10 flex flex-col mt-auto border-t border-line/50">
     <div className="max-w-[1200px] mx-auto w-full px-4">
      <div className="w-full mb-16">
        <div
          className="w-full h-[350px] bg-white rounded-[32px] overflow-hidden shadow-apple relative group border border-line/50"
        >
          <iframe
            src={mapWidgetSrc}
            width="100%"
            height="100%"
            frameBorder="0"
            allowFullScreen={true}
            loading="lazy"
            title={config.mapLabel || 'Store location'}
            className="grayscale-[0.2] contrast-[1.1] brightness-[0.95] group-hover:grayscale-0 transition-all duration-700"
          ></iframe>
          <div className="absolute top-6 left-6 z-10">
            <div className="bg-white/80 backdrop-blur-md px-4 py-3 rounded-2xl border border-line/50 shadow-apple">
              <div className="flex items-center gap-2 mb-1">
                <MapPin className="w-4 h-4 text-accent" />
                <span className="text-[14px] font-semibold">{t.mapTitle}</span>
              </div>
              <p className="text-[12px] text-muted">{t.mapDesc}</p>
              <a
                href={mapLinkHref}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[12px] text-accent mt-2 flex items-center gap-1 hover:underline"
              >
                {t.mapLink} <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full grid grid-cols-2 md:grid-cols-4 gap-8 gap-y-10 mb-12">
        {/* Brend bloki */}
        <div className="col-span-2 md:col-span-1 flex flex-col gap-4">
          <div className="flex items-center gap-2.5">
            <img src={logo} alt={config.name} className="w-9 h-9 object-contain" />
            <span className="font-semibold text-[18px] tracking-[-0.02em] text-primary">{config.name}</span>
          </div>
          <p className="text-[13px] text-muted leading-relaxed max-w-[240px]">{t.footerDesc}</p>
          <div className="flex flex-col gap-1.5 text-[12.5px] text-muted mt-0.5">
            <span className="flex items-start gap-2"><MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />{t.footerAddressText1} {t.footerAddressText2}</span>
            <span className="flex items-center gap-2"><Clock className="w-3.5 h-3.5 shrink-0" />{t.footerTime}</span>
          </div>
        </div>

        {/* Menyu */}
        <div className="flex flex-col gap-3">
          <h3 className="text-[13px] text-muted-2 mb-1">{t.footerMenu}</h3>
          <Link to={localizedPath(locale, '/katalog')} className="text-[13px] text-body hover:text-accent transition-colors">{t.catalogAll}</Link>
          <Link to={localizedPath(locale, '/chegirmalar')} className="text-[13px] text-body hover:text-accent transition-colors">{t.dealsTitle}</Link>
          <Link to={localizedPath(locale, '/savat')} className="text-[13px] text-body hover:text-accent transition-colors">{t.cartTitle}</Link>
          <Link to={`${localizedPath(locale, '/')}#faq`} className="text-[13px] text-body hover:text-accent transition-colors">FAQ</Link>
        </div>

        {/* Ma'lumot — kontent sahifalari */}
        {pageLinks.length > 0 && (
          <div className="flex flex-col gap-3">
            <h3 className="text-[13px] text-muted-2 mb-1">{t.footerInfo}</h3>
            {pageLinks.map((p) => (
              <Link key={p.slug} to={localizedPath(locale, `/page/${p.slug}`)} className="text-[13px] text-body hover:text-accent transition-colors">
                {p.title[textKey]}
              </Link>
            ))}
          </div>
        )}

        {/* Aloqa */}
        <div className="flex flex-col gap-3">
          <h3 className="text-[13px] text-muted-2 mb-1">{t.footerContact}</h3>
          {config.phone && (
            <a href={`tel:${config.phone}`} className="text-[13px] text-body hover:text-accent flex items-center gap-2 transition-colors">
              <Phone className="w-4 h-4 shrink-0" /> {config.phoneDisplay}
            </a>
          )}
          {safeHref(config.telegram) && (
            <a href={safeHref(config.telegram) ?? undefined} target="_blank" rel="noopener noreferrer" className="text-[13px] text-body hover:text-accent flex items-center gap-2 transition-colors">
              <Send className="w-4 h-4 shrink-0" /> {telegramHandle}
            </a>
          )}
          {safeHref(config.instagram) && (
            <a href={safeHref(config.instagram) ?? undefined} target="_blank" rel="noopener noreferrer" className="text-[13px] text-body hover:text-accent flex items-center gap-2 transition-colors">
              <Instagram className="w-4 h-4 shrink-0" /> {instagramHandle}
            </a>
          )}
        </div>
      </div>

      <div className="w-full h-px bg-line/60 mb-6"></div>

      <div className="w-full text-center text-[12px] text-muted-2">
        {`© ${new Date().getFullYear()} ${config.name}. ${t.footerCopyright}`}
      </div>
     </div>
    </footer>
  );
};

export default Footer;
