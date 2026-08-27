import { useState } from 'react';
import type { FC } from 'react';
import { Phone, Send, MessageCircle, X } from 'lucide-react';
import type { Translation } from '../locales';
import type { ApiSiteConfig } from '../../shared/types';
import { safeHref } from '../lib/safe-href';
import { ymGoal } from '../lib/metrica';

/** Mobil suzuvchi aloqa tugmasi — bu bozorda mijozlarning katta qismi forma emas,
 * qo'ng'iroq/Telegram'ni afzal ko'radi. Desktopda header/footer kontaktlari yetarli. */
const ContactFab: FC<{ t: Translation; config: ApiSiteConfig }> = ({ t, config }) => {
  const [open, setOpen] = useState(false);
  const tgHref = safeHref(config.telegram);
  if (!config.phone && !tgHref) return null;

  return (
    <div className="md:hidden fixed bottom-5 right-4 z-40 flex flex-col items-end gap-2.5">
      {open && (
        <>
          <div className="fixed inset-0 -z-10" onClick={() => setOpen(false)} />
          {tgHref && (
            <a
              href={tgHref}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => ymGoal(config.yandexMetricaId, 'contact_telegram')}
              className="flex items-center gap-2 bg-surface border border-line-2 shadow-apple-hover rounded-full pl-4 pr-1.5 py-1.5 text-[14px] font-semibold text-primary"
            >
              {t.orderContactTg}
              <span className="w-9 h-9 rounded-full bg-accent text-bg flex items-center justify-center"><Send className="w-4 h-4" /></span>
            </a>
          )}
          {config.phone && (
            <a
              href={`tel:${config.phone}`}
              onClick={() => ymGoal(config.yandexMetricaId, 'contact_call')}
              className="flex items-center gap-2 bg-surface border border-line-2 shadow-apple-hover rounded-full pl-4 pr-1.5 py-1.5 text-[14px] font-semibold text-primary"
            >
              {config.phoneDisplay || config.phone}
              <span className="w-9 h-9 rounded-full bg-trust text-bg flex items-center justify-center"><Phone className="w-4 h-4" /></span>
            </a>
          )}
        </>
      )}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={t.footerContact}
        aria-expanded={open}
        className="w-13 h-13 min-w-[52px] min-h-[52px] rounded-full bg-accent text-bg shadow-apple-hover flex items-center justify-center active:scale-95 transition-transform"
      >
        {open ? <X className="w-5 h-5" /> : <MessageCircle className="w-5 h-5" />}
      </button>
    </div>
  );
};

export default ContactFab;
