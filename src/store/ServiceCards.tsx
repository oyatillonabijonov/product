import type { FC } from 'react';
import type { LucideIcon } from 'lucide-react';
import { ShieldCheck, Truck, Wrench } from 'lucide-react';
import type { Translation } from '../locales';
import LocaleLink from './LocaleLink';
import { PILL, SECTION_HEADING } from './ui';

/**
 * Kafolat · yetkazib berish · servis — landingdagi xizmat va'dalari.
 *
 * Uslub apple.com'ning "Why Apple is the best place to buy" bo'limidan:
 * chegarasiz karta, tepada ingichka chiziqli ikonka, fakt ichida turgan qalin
 * gap-sarlavha ("12–24 oy rasmiy kafolat."), ostida izoh. Apple'dagi "+" tugmasi
 * yo'q — batafsil oynaga qo'yadigan matn yo'q, hech narsa qilmaydigan tugma esa
 * mijozni aldaydi.
 *
 * Mobilda kartalar gorizontal suriladi (keyingisining cheti ko'rinib turadi),
 * `md`dan yuqorida uch ustunli to'r: uchala karta sig'adi, o'q tugmalari kerak emas.
 */
const ServiceCards: FC<{ t: Translation }> = ({ t }) => {
  const items: { icon: LucideIcon; title: string; desc: string }[] = [
    { icon: ShieldCheck, title: t.svcWarrantyCard, desc: t.svcWarrantyDesc },
    { icon: Truck, title: t.svcDeliveryCard, desc: t.svcDeliveryDesc },
    { icon: Wrench, title: t.svcServiceCard, desc: t.svcServiceDesc },
  ];
  return (
    <section className="flex flex-col gap-8 md:gap-10">
      <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-6">
        <h2 className={`max-w-[680px] ${SECTION_HEADING}`}>
          {t.svcTitle}
        </h2>
        <LocaleLink
          to="/katalog"
          className={PILL}
        >
          {t.heroCtaPrimary}
        </LocaleLink>
      </div>

      <div className="-mx-4 flex snap-x gap-4 overflow-x-auto no-scrollbar px-4 scroll-pl-4 md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0">
        {items.map(({ icon: Icon, title, desc }) => (
          <article
            key={title}
            className="rounded-xl flex w-[85%] shrink-0 snap-start flex-col bg-surface p-8 md:w-auto md:p-10"
          >
            <Icon aria-hidden className="h-12 w-12 text-primary" strokeWidth={1} />
            <h3 className="mt-8 text-subhead font-semibold text-balance text-primary">{title}</h3>
            <p className="mt-3 text-copy text-pretty text-body">{desc}</p>
          </article>
        ))}
      </div>
    </section>
  );
};

export default ServiceCards;
