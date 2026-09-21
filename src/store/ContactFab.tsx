import { useState } from 'react';
import type { FC } from 'react';
import { Phone, Send, MessageCircle, X } from 'lucide-react';
import type { Translation } from '../locales';
import type { ApiSiteConfig } from '../../shared/types';
import { safeHref } from '../../shared/safe-href';
import { ymGoal } from '../lib/metrica';

/** Mobil suzuvchi aloqa tugmasi — bu bozorda mijozlarning katta qismi forma emas,
 * qo'ng'iroq/Telegram/WhatsApp'ni afzal ko'radi. Desktopda header/footer kontaktlari yetarli.
 * WhatsApp — faqat admin'da havola kiritilgan bo'lsa (`config.whatsapp`). */
const ContactFab: FC<{ t: Translation; config: ApiSiteConfig }> = ({ t, config }) => {
  const [open, setOpen] = useState(false);
  const tgHref = safeHref(config.telegram);
  const waHref = safeHref(config.whatsapp);
  if (!config.phone && !tgHref && !waHref) return null;

  return (
    <div className="md:hidden fixed bottom-[calc(5.25rem+env(safe-area-inset-bottom))] right-4 z-40 flex flex-col items-end gap-2.5">
      {open && (
        <>
          <div className="fixed inset-0 -z-10" onClick={() => setOpen(false)} />
          {waHref && (
            <a
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => ymGoal(config.yandexMetricaId, 'contact_whatsapp')}
              className=" press flex items-center gap-2 bg-surface border border-line-2 rounded-full pl-4 pr-1.5 py-1.5 text-label font-semibold text-primary"
            >
              WhatsApp
              <span className="w-9 h-9 rounded-full bg-[#25D366] text-white flex items-center justify-center"><MessageCircle className="w-4 h-4" /></span>
            </a>
          )}
          {tgHref && (
            <a
              href={tgHref}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => ymGoal(config.yandexMetricaId, 'contact_telegram')}
              className=" press flex items-center gap-2 bg-surface border border-line-2 rounded-full pl-4 pr-1.5 py-1.5 text-label font-semibold text-primary"
            >
              {t.orderContactTg}
              <span className="w-9 h-9 rounded-full bg-accent text-bg flex items-center justify-center"><Send className="w-4 h-4" /></span>
            </a>
          )}
          {config.phone && (
            <a
              href={`tel:${config.phone}`}
              onClick={() => ymGoal(config.yandexMetricaId, 'contact_call')}
              className=" press flex items-center gap-2 bg-surface border border-line-2 rounded-full pl-4 pr-1.5 py-1.5 text-label font-semibold text-primary"
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
        className=" press w-13 h-13 min-w-[52px] min-h-[52px] rounded-full bg-accent text-bg flex items-center justify-center active:scale-95 transition-transform"
      >
        {open ? <X className="w-5 h-5" /> : <MessageCircle className="w-5 h-5" />}
      </button>
    </div>
  );
};

export default ContactFab;
