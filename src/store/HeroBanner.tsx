import { motion } from 'motion/react';
import { ArrowRight, Phone } from 'lucide-react';
import type { Translation } from '../locales';
import heroDevice from '../assets/images/iph1.webp';

export default function HeroBanner({ t, phone }: { t: Translation; phone: string }) {
  return (
    <div className="relative overflow-hidden rounded-[28px] bg-bg border border-line-3 shadow-apple">
      {/* Soft color mesh */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-28 h-[380px] w-[380px] rounded-full opacity-70 blur-[110px]"
        style={{ background: 'radial-gradient(circle, rgba(0,113,227,0.28), rgba(27,122,52,0.10) 55%, transparent 72%)' }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-24 bottom-[-120px] h-[320px] w-[320px] rounded-full opacity-50 blur-[110px]"
        style={{ background: 'radial-gradient(circle, rgba(0,113,227,0.16), transparent 70%)' }}
      />

      {/* Desktop device image — anchored to the hero's bottom edge */}
      <motion.img
        src={heroDevice}
        alt=""
        aria-hidden
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="hidden md:block absolute bottom-0 right-8 lg:right-16 w-auto h-[112%] max-h-[440px] object-contain object-bottom"
      />

      <div className="relative grid grid-cols-1 md:grid-cols-2 items-center gap-6 px-6 sm:px-10 md:px-12 py-9 md:py-14 md:min-h-[380px]">
        <div className="max-w-xl">
          <div className="inline-flex w-fit items-center gap-2 rounded-full bg-trust/[0.08] px-3 py-1.5 text-[12px] font-semibold text-trust mb-5">
            <span className="h-1.5 w-1.5 rounded-full bg-trust" />
            {t.heroPill}
          </div>
          <h1 className="text-[34px] sm:text-[42px] md:text-[52px] font-semibold tracking-[-0.03em] leading-[1.03]">
            {t.heroTitle1}{' '}
            <span className="bg-gradient-to-r from-accent to-accent-bright bg-clip-text text-transparent">
              {t.heroTitle2}
            </span>
          </h1>
          <p className="text-[15px] md:text-[18px] text-muted mt-4 leading-relaxed">{t.heroTrust}</p>

          <div className="flex flex-col sm:flex-row gap-3 mt-7">
            <a
              href="#featured"
              className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-accent text-white text-[15px] font-semibold rounded-full hover:bg-accent-hover transition-colors"
            >
              {t.heroCtaPrimary}
              <ArrowRight className="w-4 h-4" />
            </a>
            <a
              href={`tel:${phone}`}
              className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-white text-primary text-[15px] font-semibold rounded-full border border-line hover:border-accent transition-colors"
            >
              <Phone className="w-4 h-4" />
              {t.heroCtaSecondary}
            </a>
          </div>
        </div>

        {/* Mobile device image — in-flow below the copy */}
        <div className="md:hidden flex justify-center pt-2">
          <motion.img
            src={heroDevice}
            alt=""
            aria-hidden
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="w-auto max-h-[240px] object-contain"
          />
        </div>
      </div>
    </div>
  );
}
