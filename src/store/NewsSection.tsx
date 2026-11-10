import type { FC } from 'react';
import { Link } from 'react-router';
import type { ApiNews } from '../../shared/types';
import type { Translation } from '../locales';
import { localeField, localizedPath, type Locale } from '../../app/lib/i18n';
import { fillNewsPrice } from '../../shared/news-price';
import { safeHref } from '../../shared/safe-href';
import { useCurrency } from './CurrencyContext';
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

export type NewsLayout = 'stack' | 'split';

/** Tile ko'rinishi: 1 ta — keng split; 2 ta — ikkalasi stack; 3 ta — birinchisi stack, qolgani split. Admin ko'rinishi ham shuni o'qiydi. */
export function newsLayout(count: number, index: number): NewsLayout {
  return count === 1 || (count === 3 && index > 0) ? 'split' : 'stack';
}

/**
 * Bitta tile. `stack` — matn tepada, rasm pastda (katta tile va mobil);
 * `split` — md'dan yuqorida rasm chapda, matn o'ngda (yon tile'lar).
 */
export const NewsTile: FC<{ item: ApiNews; locale: Locale; t: Translation; layout: NewsLayout; className?: string }> = ({
  item, locale, t, layout, className = '',
}) => {
  const badge = localeField(item.badge, item.badgeRu, locale);
  const tag = localeField(item.tag, item.tagRu, locale);
  const { price } = useCurrency();
  const shown = item.priceUzs != null ? price(item.priceUzs) : null;
  // Narx matn boshida, karta o'zi yozadi («… so'm dan.»); `fillNewsPrice` — matnida eski `{narx}` belgisi qolgan kartalar uchun.
  const text = [
    item.priceMode !== 'none' && shown ? t.newsPriceFrom.replace('{narx}', shown) : '',
    fillNewsPrice(localeField(item.text, item.textRu, locale), shown),
  ].filter(Boolean).join(' ');
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
      {/* Rasm dekor (sarlavha yonida) — alt bo'sh. Shaffof fonli render ikkala temada ham toza turadi.
          O'lcham admin surgichidan (`imageScale`): bo'y va en birga o'zgaradi, en karta ichidan chiqmaydi — rasm kesilmaydi. */}
      <img
        src={item.imageUrl}
        alt=""
        loading="lazy"
        style={{ '--news-scale': item.imageScale / 100 }}
        className={`w-auto max-w-[min(100%,calc(100%*var(--news-scale)))] object-contain ${
          split
            ? 'max-h-[calc(220px*var(--news-scale))] md:order-first md:max-h-[calc(260px*var(--news-scale))] md:justify-self-center'
            : 'mt-auto max-h-[calc(300px*var(--news-scale))] md:max-h-[calc(420px*var(--news-scale))]'
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
  return (
    <section className="flex flex-col gap-8 md:gap-10">
      <h2 className={SECTION_HEADING}>{t.newsTitle}</h2>
      {/* 3 ta bo'lsa qatorlar teng (`grid-rows-2`) — o'ngdagi ikki tile rasmiga qarab har xil bo'yda chiqmasin. */}
      <div className={`grid gap-4 ${news.length > 1 ? 'lg:grid-cols-2' : ''} ${news.length === 3 ? 'lg:grid-rows-2' : ''}`}>
        {news.map((item, i) => (
          <NewsTile
            key={item.id}
            item={item}
            locale={locale}
            t={t}
            layout={newsLayout(news.length, i)}
            className={news.length === 3 && i === 0 ? 'lg:row-span-2' : ''}
          />
        ))}
      </div>
    </section>
  );
};

export default NewsSection;
