import type { FC } from 'react';
import { useAssets } from './SiteAssets';

/**
 * Gradientli sahifa hero'si (apple.com Legal naqshi) — "Biz haqimizda" va huquqiy hujjatlar.
 * Fon egasining `bg_us` rasmi (standart `public/about/hero.webp`, admin'da almashtiriladi); qorong'i mavzuda
 * `dark-invert` uni to'q moviyga aylantiradi, shuning uchun matn oddiy tokenlar bilan ikkala mavzuda o'qiladi.
 * Mobilda ko'k chiziq matn ortidan o'tmasligi uchun kadr suriladi: baland hero'da `0%` (chiziq
 * burchakda), past hero'da rasm kichikroq masshtablanadi va `0%`da chiziq izoh ustiga tushardi — `85%`.
 * `compact` — hujjat sahifalari uchun past variant: o'quvchi matnga tezroq yetadi.
 */
const PageHero: FC<{ title: string; lede: string; compact?: boolean }> = ({ title, lede, compact }) => {
  const asset = useAssets();
  return (
    <section
      className={`shell-box relative isolate mt-4 flex items-center justify-center overflow-hidden rounded-xl px-6 text-center ${
        compact ? 'min-h-[240px] py-12 md:min-h-[320px]' : 'min-h-[360px] py-16 md:min-h-[480px]'
      }`}
    >
      <img
        src={asset('about.hero')}
        alt=""
        fetchPriority="high"
        className={`dark-invert absolute inset-0 -z-10 h-full w-full object-cover md:object-[35%_50%] ${compact ? 'object-[85%_50%]' : 'object-[0%_50%]'}`}
      />
      <div className="max-w-[760px]">
        <h1 className="text-heading font-semibold text-balance text-primary md:text-display">{title}</h1>
        <p className="mt-4 text-copy text-balance text-body md:mt-5 md:text-lede">{lede}</p>
      </div>
    </section>
  );
};

export default PageHero;
