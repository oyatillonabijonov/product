import { useState } from 'react';
import type { FC } from 'react';
import { ContentFields, useSiteContent } from '../ContentFields';
import { errText } from '../errText';
import { phoneFromDisplay } from '../lib/phone';
import SectionTabs from '../SectionTabs';
import { useSiteConfig } from '../useSiteConfig';
import { Button, Card, EmptyState, Field, Input, Page, Skeleton } from '../ui';
import { useToast } from '../ui/toast';

/** Sozlamalar → Aloqa: telefon, ijtimoiy havolalar, xarita koordinatasi va manzil/ish vaqti matnlari (`contact` guruhi). */
const SettingsContact: FC = () => {
  const cfg = useSiteConfig();
  const content = useSiteContent('contact');
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const config = cfg.config;

  async function save() {
    setBusy(true);
    try {
      if (cfg.dirty) await cfg.save();
      if (content.dirty) await content.save();
      toast("Saqlandi · saytda 1–5 daqiqada ko'rinadi");
    } catch (e) {
      toast(errText(e), 'error');
    } finally {
      setBusy(false);
    }
  }

  // Egasi faqat ko'rinishini yozadi; bosiladigan raqam shundan chiqariladi (server uni majburiy deb tekshiradi).
  function setPhone(display: string) {
    cfg.set('phoneDisplay', display);
    cfg.set('phone', phoneFromDisplay(display));
  }

  const dirty = cfg.dirty || content.dirty;
  const canSave = dirty && !busy && (config?.phone ?? '') !== '';
  const error = cfg.error || content.error;

  return (
    <Page
      title="Aloqa"
      description="Footer va aloqa tugmalarida chiqadigan ma'lumotlar. Matn maydoni bo'shatilsa standart qaytadi."
      dirty={dirty}
      actions={<Button onClick={save} disabled={!canSave}>{busy ? 'Saqlanmoqda…' : 'Saqlash'}</Button>}
    >
      <SectionTabs section="settings" active="contact" />
      {error ? <EmptyState title="Sozlamalar yuklanmadi" text={error} />
        : !config || !content.loaded ? <Skeleton rows={8} />
        : (
          <div className="flex flex-col gap-4">
            <Card title="Telefon va ijtimoiy tarmoqlar" description="Bo'sh qoldirilgan havola saytda chiqmaydi.">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Telefon" required hint={`Saytda shunday chiqadi; bosilganda ${config.phone || '—'} raqamiga qo'ng'iroq ochiladi`}>
                  <Input value={config.phoneDisplay} onChange={setPhone} placeholder="+998 (90) 123-45-67" />
                </Field>
                <Field label="Telegram" hint="https://t.me/… yoki / bilan boshlanadigan yo'l">
                  <Input value={config.telegram} onChange={(v) => cfg.set('telegram', v)} placeholder="https://t.me/username" />
                </Field>
                <Field label="Instagram">
                  <Input value={config.instagram} onChange={(v) => cfg.set('instagram', v)} placeholder="https://instagram.com/username" />
                </Field>
                <Field label="WhatsApp" hint="To'ldiriilsa mobil aloqa tugmasida WhatsApp chiqadi">
                  <Input value={config.whatsapp} onChange={(v) => cfg.set('whatsapp', v)} placeholder="https://wa.me/998901234567" />
                </Field>
              </div>
            </Card>
            <Card title="Xarita" description="Footer'dagi «Xaritada ko'rish» havolasi shu koordinataga olib boradi.">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Koordinata" hint="Yandex Xaritada do'konni toping → o'ng tugma → koordinatani nusxalang (lon,lat)">
                  <Input value={config.mapLl} onChange={(v) => cfg.set('mapLl', v)} placeholder="69.240562,41.311081" />
                </Field>
              </div>
            </Card>
            <ContentFields content={content} />
          </div>
        )}
    </Page>
  );
};

export default SettingsContact;
