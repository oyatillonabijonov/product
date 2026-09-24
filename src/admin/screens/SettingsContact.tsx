import { useState } from 'react';
import type { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { ContentFields, useSiteContent } from '../ContentFields';
import { errText } from '../errText';
import { phoneFromDisplay } from '../../lib/phone';
import SectionTabs from '../SectionTabs';
import { useSiteConfig } from '../useSiteConfig';
import { Button, Card, EmptyState, Field, Input, Page, Skeleton } from '../ui';
import { useToast } from '../ui/toast';

/** Sozlamalar → Aloqa: telefon, ijtimoiy havolalar, xarita koordinatasi va manzil/ish vaqti matnlari (`contact` guruhi). */
const SettingsContact: FC = () => {
  const { t } = useTranslation('settings');
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
      toast(t('shared.savedLive'));
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
      title={t('contact.title')}
      description={t('contact.description')}
      dirty={dirty}
      actions={<Button onClick={save} disabled={!canSave}>{busy ? t('shared.saving') : t('shared.save')}</Button>}
    >
      <SectionTabs section="settings" active="contact" />
      {error ? <EmptyState title={t('shared.loadErrorTitle')} text={error} />
        : !config || !content.loaded ? <Skeleton rows={8} />
        : (
          <div className="flex flex-col gap-4">
            <Card title={t('contact.social.title')} description={t('contact.social.description')}>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label={t('contact.phone.label')} required error={config.phone === '' ? t('contact.phone.required') : undefined} hint={t('contact.phone.hint', { phone: config.phone || '—' })}>
                  <Input value={config.phoneDisplay} onChange={setPhone} placeholder="+998 (90) 123-45-67" />
                </Field>
                <Field label="Telegram" hint={t('contact.telegram.hint')}>
                  <Input value={config.telegram} onChange={(v) => cfg.set('telegram', v)} placeholder="https://t.me/username" />
                </Field>
                <Field label="Instagram">
                  <Input value={config.instagram} onChange={(v) => cfg.set('instagram', v)} placeholder="https://instagram.com/username" />
                </Field>
                <Field label="WhatsApp" hint={t('contact.whatsapp.hint')}>
                  <Input value={config.whatsapp} onChange={(v) => cfg.set('whatsapp', v)} placeholder="https://wa.me/998901234567" />
                </Field>
              </div>
            </Card>
            <Card title={t('contact.map.title')} description={t('contact.map.description')}>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label={t('contact.map.coordLabel')} hint={t('contact.map.coordHint')}>
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
