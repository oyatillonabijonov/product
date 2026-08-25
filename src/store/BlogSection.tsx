import type { FC } from 'react';
import { ArrowRight } from 'lucide-react';
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
      className={`group relative flex overflow-hidden rounded-[20px] bg-surface shadow-[inset_0_0_0_1px_rgba(255,255,255,0.10)] ${className}`}
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
        {date && <span className="text-[14px] text-white/60">{date}</span>}
        <h3
          className={`mt-2 font-semibold leading-[1.2] tracking-[-0.02em] text-white ${
            featured ? 'text-[24px] md:text-[30px]' : 'line-clamp-2 text-[17px] md:text-[19px]'
          }`}
        >
          {localeField(post.title, post.titleRu, locale)}
        </h3>
        {featured && excerpt && (
          <p className="mt-3 max-w-[52ch] text-[15px] leading-relaxed text-white/70">{excerpt}</p>
        )}
      </div>
    </LocaleLink>
  );
};

const BlogSection: FC<{ title: string; lead: string; allLabel: string; posts: ApiPost[]; locale: Locale }> = ({
  title, lead, allLabel, posts, locale,
}) => {
  if (posts.length === 0) return null;
  const [featured, ...rest] = posts;

  return (
    <section className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-[22px] md:text-[28px] font-semibold tracking-[-0.02em]">{title}</h2>
          <p className="mt-2 text-[15px] text-muted">{lead}</p>
        </div>
        <LocaleLink
          to="/blog"
          className="group inline-flex shrink-0 items-center gap-2 rounded-full border border-line px-4 py-2 text-[14px] font-semibold text-primary transition-colors hover:border-primary"
        >
          {allLabel}
          <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
        </LocaleLink>
      </div>

      {/* Birinchi maqola yirik, qolganlari yonida ustun bo'lib turadi. `auto-rows-fr`
          tufayli ustun 1 ta ham, 2 ta ham maqolada to'g'ri bo'linadi. */}
      <div className="grid gap-4 lg:grid-cols-3">
        <PostCard
          post={featured}
          locale={locale}
          featured
          className={`min-h-[320px] lg:min-h-[460px] ${rest.length > 0 ? 'lg:col-span-2' : 'lg:col-span-3'}`}
        />
        {rest.length > 0 && (
          <div className="grid auto-rows-fr gap-4">
            {rest.map((p) => (
              <PostCard key={p.id} post={p} locale={locale} className="min-h-[220px]" />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default BlogSection;
