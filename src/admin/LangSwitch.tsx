import type { FC } from 'react';
import { ADMIN_LANGS, LANG_NAMES, useAdminLang } from './i18n';

/**
 * Admin tili — ixcham `UZ | RU` pill segment (sidebar pasti va Akkaunt → Ko'rinish). Tanlov darhol qo'llanadi.
 * Tanlangani `primary` (ERP faol chip).
 */
const LangSwitch: FC<{ label: string }> = ({ label }) => {
  const { lang, setLang } = useAdminLang();
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex shrink-0 gap-0.5 rounded-full bg-surface-sunken p-0.5">
      {ADMIN_LANGS.map((l) => (
        <button
          key={l}
          type="button"
          role="radio"
          aria-checked={l === lang}
          aria-label={LANG_NAMES[l]}
          lang={l}
          onClick={() => { if (l !== lang) setLang(l); }}
          className={`h-7 rounded-full px-2.5 text-sm font-medium transition-colors ${l === lang ? 'bg-elevated text-text' : 'text-text-faint hover:text-text'}`}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
};

export default LangSwitch;
