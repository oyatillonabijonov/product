import { ShieldCheck, BadgeCheck, Truck, Headset } from 'lucide-react';
import type { Translation } from '../locales';

export default function TrustBar({ t }: { t: Translation }) {
  const items = [
    { icon: ShieldCheck, label: t.feature1 },
    { icon: BadgeCheck, label: t.feature2 },
    { icon: Truck, label: t.feature3 },
    { icon: Headset, label: t.feature4 },
  ];
  // Mobilda 2×2 karta-panjara o'rniga yengil scroll-qator — hero ostida 4 ta ramka shovqin edi.
  return (
    <div className="flex overflow-x-auto no-scrollbar -mx-4 px-4 lg:mx-0 lg:px-0 lg:grid lg:grid-cols-4 gap-2.5 lg:gap-4">
      {items.map(({ icon: Icon, label }, i) => (
        <div
          key={i}
          className="shrink-0 lg:shrink lg:min-w-0 flex items-center gap-2.5 lg:gap-3 bg-white border border-divider rounded-full lg:rounded-2xl px-3.5 lg:px-4 py-2 lg:py-3.5 shadow-apple"
        >
          <span className="shrink-0 w-7 h-7 lg:w-10 lg:h-10 rounded-full lg:rounded-xl bg-accent-soft text-accent flex items-center justify-center">
            <Icon className="w-4 h-4 lg:w-5 lg:h-5" strokeWidth={2} />
          </span>
          <span className="text-[13px] md:text-[13.5px] font-medium leading-snug text-primary whitespace-nowrap lg:whitespace-normal">{label}</span>
        </div>
      ))}
    </div>
  );
}
