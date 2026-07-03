import type { FC } from 'react';
import { Link } from 'react-router';
import { motion } from 'motion/react';
import { Phone, Send, Instagram, MapPin, Clock, ExternalLink } from 'lucide-react';
import type { Translation } from '../locales';
import type { ApiSiteConfig } from '../../shared/types';
import type { PageLink } from '../../app/lib/loaders';
import { localizedPath, localeToTextKey, type Locale } from '../../app/lib/i18n';
import logo from '../assets/logo.svg';

const fadeInUp = {
  initial: { opacity: 1, y: 0 },
  whileInView: { opacity: 1, y: 0 },
  transition: { duration: 0.1 },
};

const Footer: FC<{ t: Translation; locale: Locale; config: ApiSiteConfig; pageLinks: PageLink[] }> = ({ t, locale, config, pageLinks }) => {
  const mapWidgetSrc = `https://yandex.com/map-widget/v1/?ll=${encodeURIComponent(config.mapLl)}&z=17&pt=${config.mapLl},pm2rdm`;
  const mapLinkHref = `https://yandex.com/maps/?ll=${encodeURIComponent(config.mapLl)}&z=17&pt=${config.mapLl},pm2rdm`;
  const telegramHandle = `@${config.telegram.replace(/^https?:\/\/t\.me\//, '')}`;
  const instagramHandle = `@${config.instagram.replace(/^https?:\/\/www\.instagram\.com\//, '').replace(/\/$/, '')}`;
  const textKey = localeToTextKey(locale);
  return (
    <footer className="w-full bg-[#F5F5F7] pt-16 pb-10 px-4 md:px-16 flex flex-col mt-auto border-t border-[#D2D2D7]/50">
      <div className="max-w-[1024px] mx-auto w-full mb-16">
        <motion.div
          {...fadeInUp}
          className="w-full h-[350px] bg-[#FFFFFF] rounded-[32px] overflow-hidden shadow-[--shadow-apple] relative group border border-[#D2D2D7]/50"
        >
          <iframe
            src={mapWidgetSrc}
            width="100%"
            height="100%"
            frameBorder="0"
            allowFullScreen={true}
            loading="lazy"
            title="Taqsit Store joylashuvi / Shop location map"
            className="grayscale-[0.2] contrast-[1.1] brightness-[0.95] group-hover:grayscale-0 transition-all duration-700"
          ></iframe>
          <div className="absolute top-6 left-6 z-10">
            <div className="bg-white/80 backdrop-blur-md px-4 py-3 rounded-2xl border border-[#D2D2D7]/50 shadow-[--shadow-apple]">
              <div className="flex items-center gap-2 mb-1">
                <MapPin className="w-4 h-4 text-[#0071E3]" />
                <span className="text-[14px] font-semibold">{t.mapTitle}</span>
              </div>
              <p className="text-[12px] text-[#6E6E73]">{t.mapDesc}</p>
              <a
                href={mapLinkHref}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[12px] text-[#0071E3] mt-2 flex items-center gap-1 hover:underline"
              >
                {t.mapLink} <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="max-w-[1024px] mx-auto w-full grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
        <div className="flex flex-col gap-3">
          <div className="font-semibold text-[21px] tracking-[-0.02em] text-[#1D1D1F] mb-2 flex items-center gap-2">
            <img src={logo} alt="Logo" className="w-16 h-16 object-contain" />
          </div>
          <p className="text-[13px] text-[#6E6E73] leading-relaxed max-w-[250px]">
            {t.footerDesc}
          </p>
        </div>
        <div className="flex flex-col gap-3">
          <h3 className="text-[12px] font-semibold text-[#1D1D1F] uppercase tracking-widest mb-2">{t.footerContact}</h3>
          <a href={`tel:${config.phone}`} className="text-[13px] text-[#6E6E73] hover:text-[#1D1D1F] flex items-center gap-2 transition-colors">
            <Phone className="w-4 h-4" /> {config.phoneDisplay}
          </a>
          <a href={config.telegram} target="_blank" className="text-[13px] text-[#6E6E73] hover:text-[#1D1D1F] flex items-center gap-2 transition-colors">
            <Send className="w-4 h-4" /> {telegramHandle}
          </a>
          <a href={config.instagram} target="_blank" className="text-[13px] text-[#6E6E73] hover:text-[#1D1D1F] flex items-center gap-2 transition-colors">
            <Instagram className="w-4 h-4" /> {instagramHandle}
          </a>
        </div>
        <div className="flex flex-col gap-3">
          <h3 className="text-[12px] font-semibold text-[#1D1D1F] uppercase tracking-widest mb-2">{t.footerAddress}</h3>
          <div className="text-[13px] text-[#6E6E73] flex items-start gap-2">
            <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{t.footerAddressText1}<br/>{t.footerAddressText2}</span>
          </div>
          <div className="text-[13px] text-[#6E6E73] flex items-center gap-2 mt-1">
            <Clock className="w-4 h-4" />
            <span>{t.footerTime}</span>
          </div>
        </div>
      </div>

      <div className="w-full h-[1px] bg-[#D2D2D7]/50 mb-6 max-w-[1024px] mx-auto"></div>

      <div className="max-w-[1024px] mx-auto w-full flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-[12px] text-[#6E6E73]">
        <p>{t.footerCopyright}</p>
        <div className="flex gap-6">
          {pageLinks.map((p) => (
            <Link key={p.slug} to={localizedPath(locale, `/page/${p.slug}`)} className="hover:text-[#1D1D1F] transition-colors">
              {p.title[textKey]}
            </Link>
          ))}
        </div>
      </div>
    </footer>
  );
};

export default Footer;
