import type { FC } from 'react';
import { Link } from 'react-router';
import type { ApiNews } from '../../shared/types';
import type { Translation } from '../locales';
import { localeField, localizedPath, type Locale } from '../../app/lib/i18n';
import { safeHref } from '../lib/safe-href';
import { BTN_MD, SECTION_HEADING } from './ui';

const CTA_CLS = `${BTN_MD} mt-6 bg-cta text-white hover:bg-cta-hover`;

/** Tugma — havola bo'lmasa chiqmaydi (hech narsa qilmaydigan tugma mijozni aldaydi). */
const Cta: FC<{ item: ApiNews; locale: Locale; t: Translation }> = ({ item, locale, t }) => {
  const href = safeHref(item.linkUrl);
  if (!href) return null;
  const label = localeField(item.cta, item.ctaRu, locale) || t.newsMore;
  return href.startsWith('/')
    ? <Link to={localizedPath(locale, href)} className={CTA_CLS}>{label}</Link>
    : <a href={href} target="_blank" rel="noopener noreferrer" className={CTA_CLS}>{label}</a>;
};

/**
 * Bitta tile. `stack` — matn tepada, rasm pastda (katta tile va mobil);
 * `split` — md'dan yuqorida rasm chapda, matn o'ngda (yon tile'lar).
 */
const Tile: FC<{ item: ApiNews; locale: Locale; t: Translation; layout: 'stack' | 'split'; className?: string }> = ({
  item, locale, t, layout, className = '',
}) => {
  const badge = localeField(item.badge, item.badgeRu, locale);
  const tag = localeField(item.tag, item.tagRu, locale);
  const text = localeField(item.text, item.textRu, locale);
  const split = layout === 'split';
  return (
    <article
      className={`rounded-xl flex flex-col items-center gap-8 overflow-hidden bg-surface px-6 pb-8 pt-10 md:px-10 ${
        split ? 'md:grid md:grid-cols-2 md:gap-6 md:py-10' : 'md:pt-14'
      } ${className}`}
    >
      <div className="flex flex-col items-center text-center">
        {(badge || tag) && (
          <p className="flex flex-wrap justify-center gap-x-2 text-label font-semibold uppercase tracking-[0.04em]">
            {badge && <span className="text-new">{badge}</span>}
            {tag && <span className="text-verified">{tag}</span>}
          </p>
        )}
        <h3 className={`mt-1.5 font-semibold text-balance text-primary ${split ? 'text-subhead md:text-heading' : 'text-heading md:text-title'}`}>
          {localeField(item.title, item.titleRu, locale)}
        </h3>
        {text && <p className="mt-2 max-w-[34ch] text-copy text-pretty text-body">{text}</p>}
        <Cta item={item} locale={locale} t={t} />
      </div>
      {/* Rasm dekor (sarlavha yonida) — alt bo'sh. Shaffof fonli render ikkala temada ham toza turadi. */}
      <img
        src={item.imageUrl}
        alt=""
        loading="lazy"
        className={`w-auto max-w-full object-contain ${
          split ? 'max-h-[220px] md:order-first md:max-h-[260px] md:justify-self-center' : 'mt-auto max-h-[300px] md:max-h-[420px]'
        }`}
      />
    </article>
  );
};

/**
 * Landing "Yangiliklar" — apple.com bosh sahifasidagi promo tile'lar uslubida.
 * Admin → Yangiliklar'dan birinchi 3 tasi: 1 ta bo'lsa keng tile, 2 ta bo'lsa
 * yonma-yon, 3 ta bo'lsa birinchisi chapda katta, qolgan ikkitasi o'ngda ustma-ust.
 */
const NewsSection: FC<{ t: Translation; news: ApiNews[]; locale: Locale }> = ({ t, news, locale }) => {
  if (news.length === 0) return null;
  const [first, ...rest] = news;
  return (
    <section className="flex flex-col gap-8 md:gap-10">
      <h2 className={SECTION_HEADING}>{t.newsTitle}</h2>
      {/* 3 ta bo'lsa qatorlar teng (`grid-rows-2`) — o'ngdagi ikki tile rasmiga qarab har xil bo'yda chiqmasin. */}
      <div className={`grid gap-4 ${news.length > 1 ? 'lg:grid-cols-2' : ''} ${news.length === 3 ? 'lg:grid-rows-2' : ''}`}>
        <Tile
          item={first}
          locale={locale}
          t={t}
          layout={news.length === 1 ? 'split' : 'stack'}
          className={news.length === 3 ? 'lg:row-span-2' : ''}
        />
        {rest.map((item) => (
          <Tile key={item.id} item={item} locale={locale} t={t} layout={news.length === 3 ? 'split' : 'stack'} />
        ))}
      </div>
    </section>
  );
};

export default NewsSection;
