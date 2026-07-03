import { Search, FileText, IdCard, PackageCheck } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Translation } from '../locales';

export default function HowItWorks({ t }: { t: Translation }) {
  const steps: { icon: LucideIcon; title: string; desc: string }[] = [
    { icon: Search, title: t.step1Title, desc: t.step1Desc },
    { icon: FileText, title: t.step2Title, desc: t.step2Desc },
    { icon: IdCard, title: t.step3Title, desc: t.step3Desc },
    { icon: PackageCheck, title: t.step4Title, desc: t.step4Desc },
  ];
  return (
    <section className="rounded-[28px] bg-bg border border-line-3 px-6 md:px-10 py-9 md:py-11">
      <h2 className="text-[22px] md:text-[30px] font-semibold tracking-[-0.02em] mb-7 md:mb-9">{t.stepsTitle}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 md:gap-6">
        {steps.map(({ icon: Icon, title, desc }, i) => (
          <div key={i} className="relative">
            <div className="flex items-center gap-3 mb-3">
              <span className="w-11 h-11 rounded-2xl bg-white text-accent flex items-center justify-center shadow-apple">
                <Icon className="w-5 h-5" strokeWidth={1.9} />
              </span>
              <span className="text-[13px] font-bold text-muted-2">0{i + 1}</span>
            </div>
            <h3 className="text-[15px] font-semibold mb-1.5">{title}</h3>
            <p className="text-[13px] text-muted leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
