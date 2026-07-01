import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { translations, type LangKey, type Translation } from '../locales';
import Header from './Header';
import Footer from './Footer';

export interface StoreContext {
  t: Translation;
  lang: LangKey;
}

export default function StoreLayout() {
  const [lang, setLang] = useState<LangKey>("O'zbek tili");
  const t = translations[lang];

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <div className="bg-[#F5F5F7] text-[#6E6E73] text-[12px]">
        <div className="max-w-[1200px] mx-auto px-4 h-9 flex items-center gap-4">
          <span className="font-semibold text-[#1B7A34]">{t.utilInstallment}</span>
          <span className="hidden sm:inline">{t.utilDiscounts}</span>
          <a href="tel:+998886043636" className="ml-auto font-medium text-[#1D1D1F]">+998 (88) 604-36-36</a>
        </div>
      </div>
      <Header t={t} lang={lang} setLang={setLang} />
      <main className="flex-1">
        <Outlet context={{ t, lang } satisfies StoreContext} />
      </main>
      <Footer t={t} />
    </div>
  );
}
