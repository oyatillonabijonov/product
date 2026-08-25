import type { FC } from 'react';
import type { LucideIcon } from 'lucide-react';
import { ShieldCheck, Truck, Wrench } from 'lucide-react';
import type { Translation } from '../locales';

/** Kafolat · yetkazib berish · servis — landingdagi xizmat va'dalari. */
const ServiceCards: FC<{ t: Translation }> = ({ t }) => {
  const items: { icon: LucideIcon; title: string; desc: string }[] = [
    { icon: ShieldCheck, title: t.svcWarrantyTitle, desc: t.svcWarrantyDesc },
    { icon: Truck, title: t.svcDeliveryTitle, desc: t.svcDeliveryDesc },
    { icon: Wrench, title: t.svcServiceTitle, desc: t.svcServiceDesc },
  ];
  return (
    <section className="flex flex-col gap-7">
      <h2 className="text-[22px] md:text-[28px] font-semibold tracking-[-0.02em]">{t.svcTitle}</h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {items.map(({ icon: Icon, title, desc }) => (
          <div key={title} className="rounded-[22px] border border-line-3 bg-surface px-6 py-7">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent-soft text-primary">
              <Icon className="h-5 w-5" strokeWidth={1.8} />
            </span>
            <h3 className="mt-4 text-[17px] font-semibold tracking-[-0.01em]">{title}</h3>
            <p className="mt-2 text-[16px] leading-relaxed text-muted">{desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
};

export default ServiceCards;
