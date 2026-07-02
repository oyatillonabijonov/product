import { motion } from 'motion/react';
import { ArrowRight, Phone } from 'lucide-react';
import type { Translation } from '../locales';
import heroDevice from '../assets/images/iph1.webp';

export default function HeroBanner({ t }: { t: Translation }) {
  return (
    <div className="relative overflow-hidden rounded-[28px] bg-[#F5F5F7] border border-[#ECECEF] shadow-[--shadow-apple]">
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

      <div className="relative grid grid-cols-1 md:grid-cols-2 items-center gap-6 px-6 sm:px-10 md:px-12 py-9 md:py-14">
        <div className="max-w-xl">
          <div className="inline-flex w-fit items-center gap-2 rounded-full bg-[#1B7A34]/[0.08] px-3 py-1.5 text-[12px] font-semibold text-[#1B7A34] mb-5">
            <span className="h-1.5 w-1.5 rounded-full bg-[#1B7A34]" />
            {t.heroPill}
          </div>
          <h1 className="text-[34px] sm:text-[42px] md:text-[52px] font-semibold tracking-[-0.03em] leading-[1.03]">
            {t.heroTitle1}{' '}
            <span className="bg-gradient-to-r from-[#0071E3] to-[#00A2FF] bg-clip-text text-transparent">
              {t.heroTitle2}
            </span>
          </h1>
          <p className="text-[15px] md:text-[18px] text-[#6E6E73] mt-4 leading-relaxed">{t.heroTrust}</p>

          <div className="flex flex-col sm:flex-row gap-3 mt-7">
            <a
              href="#featured"
              className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-[#0071E3] text-white text-[15px] font-semibold rounded-full hover:bg-[#0077ED] transition-colors shadow-[0_10px_24px_-10px_rgba(0,113,227,0.7)]"
            >
              {t.heroCtaPrimary}
              <ArrowRight className="w-4 h-4" />
            </a>
            <a
              href="tel:+998886043636"
              className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-white text-[#1D1D1F] text-[15px] font-semibold rounded-full border border-[#D2D2D7] hover:border-[#0071E3] transition-colors"
            >
              <Phone className="w-4 h-4" />
              {t.heroCtaSecondary}
            </a>
          </div>
        </div>

        <div className="relative flex justify-center md:justify-end">
          <motion.img
            src={heroDevice}
            alt=""
            aria-hidden
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: [0, -10, 0] }}
            transition={{ opacity: { duration: 0.6 }, y: { duration: 6, repeat: Infinity, ease: 'easeInOut' } }}
            className="w-[190px] sm:w-[240px] md:w-[300px] object-contain drop-shadow-[0_30px_50px_rgba(0,60,130,0.28)]"
          />
        </div>
      </div>
    </div>
  );
}
