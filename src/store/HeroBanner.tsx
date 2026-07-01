import type { Translation } from '../locales';

export default function HeroBanner({ t }: { t: Translation }) {
  return (
    <div className="relative rounded-[24px] overflow-hidden bg-gradient-to-br from-[#EAF3FF] to-[#F5F5F7] p-8 md:p-12 min-h-[220px] flex flex-col justify-center">
      <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 h-72 w-72 rounded-full opacity-60 blur-[100px]" style={{ background: 'radial-gradient(circle, rgba(0,113,227,0.18), rgba(27,122,52,0.10) 50%, transparent 70%)' }} />
      <div className="inline-flex w-fit items-center gap-2 rounded-full bg-[#1B7A34]/[0.08] px-3 py-1 text-[12px] font-semibold text-[#1B7A34] mb-3">
        <span className="h-1.5 w-1.5 rounded-full bg-[#1B7A34]" />{t.heroPill}
      </div>
      <h1 className="text-[28px] md:text-[40px] font-semibold tracking-[-0.02em] max-w-xl leading-[1.1]">{t.heroTitle1} {t.heroTitle2}</h1>
      <p className="text-[15px] md:text-[17px] text-[#6E6E73] mt-2">{t.heroTrust}</p>
    </div>
  );
}
