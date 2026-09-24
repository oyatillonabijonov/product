import type { FC } from 'react';
import { ADMIN_LANGS, LANG_NAMES, useAdminLang } from './i18n';

/**
 * Admin tili — ixcham `UZ | RU` pill segment (sidebar pasti va Akkaunt → Ko'rinish). Tanlov darhol qo'llanadi.
 * Pill ichida pill — radiuslar o'z-o'zidan konsentrik; tanlangani `raised` (qorong'ida ham fondan ko'tariladi).
 */
const LangSwitch: FC<{ label: string }> = ({ label }) => {
  const { lang, setLang } = useAdminLang();
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex shrink-0 rounded-full bg-fill-2 p-0.5">
      {ADMIN_LANGS.map((l) => (
        <button
          key={l}
          type="button"
          role="radio"
          aria-checked={l === lang}
          aria-label={LANG_NAMES[l]}
          lang={l}
          onClick={() => { if (l !== lang) setLang(l); }}
          className={`press h-7 rounded-full px-2.5 text-label ${l === lang ? 'bg-raised text-primary' : 'text-muted hover:text-primary'}`}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
};

export default LangSwitch;
