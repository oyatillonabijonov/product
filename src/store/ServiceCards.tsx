import type { FC } from 'react';
import type { LucideIcon } from 'lucide-react';
import { ShieldCheck, Truck, Wrench } from 'lucide-react';
import type { Translation } from '../locales';

/**
 * Kafolat · yetkazib berish · servis — landingdagi xizmat va'dalari.
 *
 * Kartalar: tepada ikonka, ostida skanerlash uchun asosiy raqam (muddat), so'ng
 * sarlavha va izoh. Yuqori-o'ng burchakdagi yumshoq yorug'lik kartaga hajm
 * beradi va sichqoncha kelganda kuchayadi.
 */
const ServiceCards: FC<{ t: Translation }> = ({ t }) => {
  const items: { icon: LucideIcon; fact: string; title: string; desc: string }[] = [
    { icon: ShieldCheck, fact: t.svcWarrantyFact, title: t.svcWarrantyTitle, desc: t.svcWarrantyDesc },
    { icon: Truck, fact: t.svcDeliveryFact, title: t.svcDeliveryTitle, desc: t.svcDeliveryDesc },
    { icon: Wrench, fact: t.svcServiceFact, title: t.svcServiceTitle, desc: t.svcServiceDesc },
  ];
  return (
    <section className="flex flex-col gap-10">
      <div className="max-w-[760px]">
        <h2 className="text-[30px] md:text-[44px] font-semibold leading-[1.08] tracking-[-0.03em] text-balance">
          {t.svcTitle}
        </h2>
        <p className="mt-4 text-[16px] md:text-[18px] font-light leading-[1.5] tracking-[-0.01em] text-muted text-pretty">
          {t.svcLead}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {items.map(({ icon: Icon, fact, title, desc }) => (
          <div
            key={title}
            className="group relative isolate flex flex-col overflow-hidden rounded-[22px] border border-line bg-surface px-7 py-8 transition-[translate,border-color] duration-500 ease-[cubic-bezier(.2,.7,.2,1)] hover:-translate-y-1 hover:border-muted-3 md:px-8"
          >
            {/* Burchakdagi yorug'lik — tekis qutini hajmli qiladi. */}
            <div
              aria-hidden
              className="pointer-events-none absolute -right-16 -top-20 -z-10 h-52 w-52 rounded-full opacity-60 blur-[64px] transition-opacity duration-500 group-hover:opacity-100"
              style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.16), transparent 70%)' }}
            />

            <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-line bg-fill-2/40 text-primary">
              <Icon aria-hidden className="h-5 w-5" strokeWidth={1.7} />
            </span>

            <span className="mt-7 text-[28px] md:text-[32px] font-semibold leading-none tracking-[-0.03em] tabular-nums">
              {fact}
            </span>

            <h3 className="mt-3 text-[17px] font-semibold tracking-[-0.01em]">{title}</h3>
            <p className="mt-2 text-[16px] leading-relaxed text-muted text-pretty">{desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
};

export default ServiceCards;
