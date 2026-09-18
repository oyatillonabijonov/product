import type { FC } from 'react';
import type { LucideIcon } from 'lucide-react';
import { ChevronRight, ShieldCheck, Truck, Wrench } from 'lucide-react';
import type { Translation } from '../locales';
import LocaleLink from './LocaleLink';
import { LINK_MORE } from './ui';

/**
 * Kafolat · yetkazib berish · servis — landingdagi xizmat va'dalari.
 *
 * Uslub apple.com'ning "The Apple Store difference" bo'limidan: sarlavha qalin nom +
 * och rangli davomi, o'ngda ko'k "Batafsil ›" havola; kartada ko'k chiziqli ikonka
 * va bitta abzats — qalin gap-sarlavha ("12–24 oy rasmiy kafolat.") shu abzats
 * boshida, izoh uning davomi. Apple'dagi "+" tugmasi yo'q — batafsil oynaga
 * qo'yadigan matn yo'q, hech narsa qilmaydigan tugma esa mijozni aldaydi.
 *
 * Mobilda kartalar gorizontal suriladi (keyingisining cheti ko'rinib turadi),
 * `md`dan yuqorida uch ustunli to'r.
 */
const ServiceCards: FC<{ t: Translation }> = ({ t }) => {
  const items: { icon: LucideIcon; title: string; desc: string }[] = [
    { icon: ShieldCheck, title: t.svcWarrantyCard, desc: t.svcWarrantyDesc },
    { icon: Truck, title: t.svcDeliveryCard, desc: t.svcDeliveryDesc },
    { icon: Wrench, title: t.svcServiceCard, desc: t.svcServiceDesc },
  ];
  return (
    <section className="flex flex-col gap-6 md:gap-8">
      <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-3">
        <h2 className="max-w-[760px] text-heading md:text-title font-semibold text-balance text-muted-2">
          <span className="text-primary">{t.svcTitle}.</span> {t.svcPrompt}
        </h2>
        <LocaleLink to="/katalog" className={LINK_MORE}>
          {t.heroCtaPrimary} <ChevronRight className="h-4 w-4" />
        </LocaleLink>
      </div>

      <div className="-mx-4 flex snap-x gap-4 overflow-x-auto no-scrollbar px-4 scroll-pl-4 md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0">
        {items.map(({ icon: Icon, title, desc }) => (
          <article
            key={title}
            className="rounded-lg flex w-[80%] shrink-0 snap-start flex-col bg-surface p-7 md:w-auto"
          >
            <Icon aria-hidden className="h-9 w-9 text-cta" strokeWidth={1.5} />
            <p className="mt-5 text-copy xl:text-lede text-pretty text-body">
              <span className="font-semibold text-primary">{title}</span> {desc}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
};

export default ServiceCards;
