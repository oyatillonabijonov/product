import type { FC } from 'react';
import type { ApiPost } from '../../shared/types';
import { localeField, type Locale } from '../../app/lib/i18n';
import LocaleLink from './LocaleLink';

// `uz-UZ` ICU'da oy nomi "M08" ko'rinishida chiqadi — o'zbekcha oylar qo'lda.
const UZ_MONTHS = [
  'yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun',
  'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr',
];

/** Sana `published_at` bo'sh yoki noto'g'ri bo'lsa ko'rsatilmaydi. */
export function postDate(iso: string, locale: Locale): string {
  if (!iso) return '';
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return '';
  if (locale === 'ru') {
    return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
  }
  return `${d.getUTCDate()} ${UZ_MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/**
 * Maqola kartasi — matn rasm ustida, pastdan qorayadigan qatlam bilan. Hero
 * ustunlari bilan bir uslubda: landing bo'ylab bitta vizual til.
 */
export const PostCard: FC<{ post: ApiPost; locale: Locale; featured?: boolean; className?: string }> = ({
  post, locale, featured = false, className = '',
}) => {
  const date = postDate(post.publishedAt, locale);
  const excerpt = localeField(post.excerpt, post.excerptRu, locale);
  return (
    <LocaleLink
      to={`/blog/${post.slug}`}
      className={`rounded-lg group relative flex overflow-hidden bg-surface ${className}`}
    >
      {post.coverUrl && (
        <img
          src={post.coverUrl}
          alt=""
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-[cubic-bezier(.2,.7,.2,1)] group-hover:scale-[1.05]"
        />
      )}
      {/* Matn har qanday rasmda o'qilishi uchun pastki qatlam. */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.20) 0%, rgba(0,0,0,0) 34%, rgba(0,0,0,0.55) 66%, rgba(0,0,0,0.88) 100%)' }}
      />
      <div className={`relative mt-auto flex flex-col ${featured ? 'p-7 md:p-9' : 'p-5 md:p-6'}`}>
        {date && <span className="text-label text-white/60">{date}</span>}
        <h3
          className={`mt-2 font-semibold leading-[1.2] text-white ${
            featured ? 'text-subhead md:text-heading' : 'line-clamp-2 text-copy md:text-lede'
          }`}
        >
          {localeField(post.title, post.titleRu, locale)}
        </h3>
        {featured && excerpt && (
          <p className="mt-3 max-w-[52ch] text-para leading-relaxed text-white/70">{excerpt}</p>
        )}
      </div>
    </LocaleLink>
  );
};
