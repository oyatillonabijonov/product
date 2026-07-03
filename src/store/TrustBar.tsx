import { ShieldCheck, BadgeCheck, Truck, Headset } from 'lucide-react';
import type { Translation } from '../locales';

export default function TrustBar({ t }: { t: Translation }) {
  const items = [
    { icon: ShieldCheck, label: t.feature1 },
    { icon: BadgeCheck, label: t.feature2 },
    { icon: Truck, label: t.feature3 },
    { icon: Headset, label: t.feature4 },
  ];
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
      {items.map(({ icon: Icon, label }, i) => (
        <div
          key={i}
          className="flex items-center gap-3 bg-white border border-divider rounded-2xl px-4 py-3.5 shadow-[--shadow-apple]"
        >
          <span className="shrink-0 w-10 h-10 rounded-xl bg-accent-soft text-accent flex items-center justify-center">
            <Icon className="w-5 h-5" strokeWidth={2} />
          </span>
          <span className="text-[13px] md:text-[13.5px] font-medium leading-snug text-primary">{label}</span>
        </div>
      ))}
    </div>
  );
}
