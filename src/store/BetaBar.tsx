import type { Translation } from '../locales';

/**
 * Vaqtinchalik (2026-10-07, mijozning talabi): sayt tepasida Apple ko'k rangidagi "beta rejim"
 * qatori. Oqimda turadi va sahifa bilan aylanib ketadi — header'ning sticky'si, boshqa sticky
 * bloklar tegilmaydi. Olib tashlash: StoreLayout'dagi `<BetaBar>` qatori + HeroNotch'dagi
 * `BETA_BAR_H` ofseti + locales'dagi `betaNotice`.
 */
export const BETA_BAR_H = 36;

export default function BetaBar({ t }: { t: Translation }) {
  return (
    <div className="relative z-50 flex h-9 items-center justify-center bg-cta px-4 text-center text-label text-white">
      <span className="truncate">{t.betaNotice}</span>
    </div>
  );
}
