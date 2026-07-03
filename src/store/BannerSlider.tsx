import { useRef, useState } from 'react';
import type { FC } from 'react';
import { Link } from 'react-router';
import type { ApiBanner } from '../../shared/types';
import { localizedPath, type Locale } from '../../app/lib/i18n';
import { safeHref } from '../lib/safe-href';

const Slide: FC<{ banner: ApiBanner; locale: Locale; eager: boolean }> = ({ banner, locale, eager }) => {
  const img = (
    <img
      src={banner.imageUrl}
      alt={banner.altText}
      loading={eager ? undefined : 'lazy'}
      className="w-full h-full object-cover"
    />
  );
  const href = safeHref(banner.linkUrl);
  const cls = 'w-full shrink-0 snap-start aspect-[21/9] md:aspect-[3/1] block';
  if (!href) return <div className={cls}>{img}</div>;
  if (href.startsWith('/')) return <Link to={localizedPath(locale, href)} className={cls}>{img}</Link>;
  return <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>{img}</a>;
};

const BannerSlider: FC<{ banners: ApiBanner[]; locale: Locale }> = ({ banners, locale }) => {
  const track = useRef<HTMLDivElement | null>(null);
  const [active, setActive] = useState(0);

  function onScroll() {
    const el = track.current;
    if (!el) return;
    setActive(Math.round(el.scrollLeft / el.clientWidth));
  }
  function goTo(i: number) {
    const el = track.current;
    if (!el) return;
    el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' });
  }

  if (banners.length === 0) return null;
  return (
    <div className="relative rounded-[24px] overflow-hidden shadow-[--shadow-apple]">
      <div
        ref={track}
        onScroll={onScroll}
        className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar"
      >
        {banners.map((b, i) => (
          <Slide key={b.id} banner={b} locale={locale} eager={i === 0} />
        ))}
      </div>
      {banners.length > 1 && (
        <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-2">
          {banners.map((b, i) => (
            <button
              key={b.id}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`Slayd ${i + 1}`}
              aria-current={i === active || undefined}
              className={`w-2 h-2 rounded-full transition-colors ${i === active ? 'bg-white' : 'bg-white/45'}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default BannerSlider;
