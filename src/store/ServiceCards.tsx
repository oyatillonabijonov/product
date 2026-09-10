import type { FC } from 'react';
import type { LucideIcon } from 'lucide-react';
import { ShieldCheck, Truck, Wrench } from 'lucide-react';
import type { Translation } from '../locales';
import LocaleLink from './LocaleLink';
import { PILL, SECTION_HEADING } from './ui';

/**
 * Kafolat · yetkazib berish · servis — landingdagi xizmat va'dalari.
 *
 * Uslub: qisqa sarlavha + pill tugma; kartada tartib raqami va ikonka bir qatorda,
 * so'ng asosiy fakt — sarlavha — izoh ketma-ket (bo'sh joy yo'q, balandlik
 * matndan kelib chiqadi).
 */
const ServiceCards: FC<{ t: Translation }> = ({ t }) => {
  const items: { icon: LucideIcon; fact: string; title: string; desc: string }[] = [
    { icon: ShieldCheck, fact: t.svcWarrantyFact, title: t.svcWarrantyTitle, desc: t.svcWarrantyDesc },
    { icon: Truck, fact: t.svcDeliveryFact, title: t.svcDeliveryTitle, desc: t.svcDeliveryDesc },
    { icon: Wrench, fact: t.svcServiceFact, title: t.svcServiceTitle, desc: t.svcServiceDesc },
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

      <div className="grid gap-4 md:grid-cols-3">
        {items.map(({ icon: Icon, fact, title, desc }, i) => (
          <article
            key={title}
            className="rounded-lg flex flex-col border border-line-2 bg-surface p-7 transition-colors duration-500 hover:border-line md:p-8"
          >
            <div className="flex items-center justify-between text-muted-2">
              <span className="font-mono text-label tabular-nums">{`0${i + 1}`}</span>
              <Icon aria-hidden className="h-7 w-7" strokeWidth={1.4} />
            </div>

            <p className="mt-9 text-heading font-semibold leading-none tabular-nums">
              {fact}
            </p>
            <h3 className="mt-3 text-copy font-medium">{title}</h3>
            <p className="mt-2 text-para text-muted text-pretty">{desc}</p>
          </article>
        ))}
      </div>
    </section>
  );
};

export default ServiceCards;
