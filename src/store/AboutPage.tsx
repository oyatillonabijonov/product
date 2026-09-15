import type { FC, ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { ChevronRight, MapPin, Newspaper, ShieldCheck, ShoppingBag, UserRound } from 'lucide-react';
import type { Translation } from '../locales';
import type { ApiSiteConfig } from '../../shared/types';
import LocaleLink from './LocaleLink';
import PageHero from './PageHero';
import { LINK_MORE, SECTION_HEADING } from './ui';
import { safeHref } from '../lib/safe-href';

const CARD = 'flex flex-col overflow-hidden rounded-xl bg-surface';

const Chevron: FC = () => <ChevronRight aria-hidden className="mt-px h-4 w-4" strokeWidth={2} />;

/** Kartaning matn qismi: ko'k ikonka → nuqtali sarlavha → matn; havolalar `children`da, pastga yopishadi. */
const CardText: FC<{ icon: LucideIcon; title: string; text: string; className?: string; children?: ReactNode }> = ({
  icon: Icon, title, text, className = '', children,
}) => (
  <div className={`flex flex-1 flex-col p-8 md:p-10 ${className}`}>
    <Icon aria-hidden className="h-10 w-10 text-link" strokeWidth={1.5} />
    <h3 className="mt-6 text-subhead font-semibold text-balance text-primary">{title}</h3>
    <p className="mt-3 text-copy text-pretty text-body">{text}</p>
    {children}
  </div>
);

/**
 * "Biz haqimizda" (2026-09-15, egasining referensi: apple.com Legal hero'si + iSpace'ning
 * "Эксперты / Гарантии / Доступные покупки / Персональный подход / Всегда рядом / Новости"
 * bloklari, bento ko'rinishida).
 *
 * Hero — umumiy `PageHero` (egasining `bg_us` gradienti; huquqiy hujjatlar ham shu hero'da).
 *
 * Bento (lg, 3 ustun): [Mutaxassislar 2×2 foto | Kafolat] [·· | Qulay xarid]
 * [Shaxsiy yondashuv | Doim yaqinda ×2] [Yangiliklar ×3]. md'da 2 ustun, mobilda bitta.
 * Mutaxassislar kartasida matn md'dan foto ustida, chap 46%da (fotoning chap-yuqori qismi qorong'i devor);
 * mobilda foto matn ostiga tushadi — tor kartada matn odamlarning yuziga to'g'ri kelardi.
 *
 * Matnda faqat saytda allaqachon berilgan va'dalar: kafolat va servis (`svc*`), bir klikda
 * buyurtma va operator qo'ng'irog'i, Trade-In sahifasi, bepul Apple sozlash (`setup*`),
 * yetkazish muddatlari. Fotolar GPT'da yaratilgan (egasi), manba PNG'lar `public/`da qolmaydi.
 */
const AboutPage: FC<{ t: Translation; config: ApiSiteConfig; title: string }> = ({ t, config, title }) => {
  const mapHref = `https://yandex.com/maps/?ll=${encodeURIComponent(config.mapLl)}&z=17&pt=${config.mapLl},pm2rdm`;
  const telegram = safeHref(config.telegram);
  const instagram = safeHref(config.instagram);

  return (
    <>
      <PageHero title={title} lede={t.aboutLede} />

      <section className="shell flex flex-col gap-8 pb-14 pt-16 md:gap-10 md:pb-20 md:pt-24">
        <h2 className={SECTION_HEADING}>
          {t.aboutWhyTitle} <span className="text-muted-2">{t.aboutWhyMuted}</span>
        </h2>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <article className={`${CARD} relative isolate md:col-span-2 md:min-h-[440px] lg:row-span-2`}>
            {/* md'dan matn kartaning chap 46%ida — fotodagi yuzlar 57%dan o'ngda, qorong'i devor ustida qoladi. */}
            <div className="p-8 md:w-[46%] md:p-10 md:pr-0">
              <p className="text-copy font-semibold text-muted-2 md:text-white/70">{t.aboutExpertsLabel}</p>
              <h3 className="mt-2 text-heading font-semibold text-balance text-primary md:text-white">
                {t.aboutExpertsTitle}
              </h3>
              <p className="mt-4 text-copy text-pretty text-body md:text-white/80">{t.aboutExpertsText}</p>
            </div>
            <img
              src="/about/experts.webp"
              alt=""
              loading="lazy"
              className="aspect-[4/3] w-full object-cover object-[70%_50%] md:absolute md:inset-0 md:-z-10 md:aspect-auto md:h-full"
            />
          </article>

          <article className={CARD}>
            <CardText icon={ShieldCheck} title={t.aboutWarrantyTitle} text={t.aboutWarrantyText} />
          </article>

          <article className={CARD}>
            <CardText icon={ShoppingBag} title={t.aboutBuyTitle} text={t.aboutBuyText}>
              <div className="mt-auto pt-6">
                <LocaleLink to="/page/trade-in" className={LINK_MORE}>{t.aboutTradeInLink}<Chevron /></LocaleLink>
              </div>
            </CardText>
          </article>

          <article className={CARD}>
            <CardText icon={UserRound} title={t.aboutPersonalTitle} text={t.aboutPersonalText} />
          </article>

          <article className={`${CARD} lg:col-span-2 lg:grid lg:grid-cols-2`}>
            <CardText icon={MapPin} title={t.aboutNearTitle} text={t.aboutNearText}>
              <p className="mt-4 text-para text-pretty text-muted">
                {t.footerAddressText1} {t.footerAddressText2}
                <br />
                {t.footerTime}
              </p>
              <div className="mt-auto pt-6">
                <a href={mapHref} target="_blank" rel="noopener noreferrer" className={LINK_MORE}>{t.mapLink}<Chevron /></a>
              </div>
            </CardText>
            <img
              src="/about/delivery.webp"
              alt=""
              loading="lazy"
              className="aspect-[3/2] w-full object-cover object-[55%_50%] lg:aspect-auto lg:h-full"
            />
          </article>

          <article className={`${CARD} md:col-span-2 lg:col-span-3 lg:grid lg:grid-cols-2 lg:items-center`}>
            <CardText icon={Newspaper} title={t.aboutNewsTitle} text={t.aboutNewsText} className="lg:py-14 lg:pl-14">
              <div className="mt-auto flex flex-wrap gap-x-6 gap-y-2 pt-6">
                <LocaleLink to="/blog" className={LINK_MORE}>{t.aboutBlogLink}<Chevron /></LocaleLink>
                {telegram && <a href={telegram} target="_blank" rel="noopener noreferrer" className={LINK_MORE}>Telegram<Chevron /></a>}
                {instagram && <a href={instagram} target="_blank" rel="noopener noreferrer" className={LINK_MORE}>Instagram<Chevron /></a>}
              </div>
            </CardText>
            {/* Rasm o'ng va pastki chetdan chiqib turadi (apple.com banneri) — karta `overflow-hidden` kesadi. */}
            <img
              src="/about/news.webp"
              alt=""
              loading="lazy"
              className="w-full px-8 pb-8 md:px-10 md:pb-10 lg:translate-x-[6%] lg:translate-y-[6%] lg:self-end lg:p-0"
            />
          </article>
        </div>
      </section>
    </>
  );
};

export default AboutPage;
