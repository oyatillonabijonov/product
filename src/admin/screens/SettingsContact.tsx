import { useState } from 'react';
import type { FC, ReactNode } from 'react';
import { ArrowSquareOut, Clock, Eye, InstagramLogo, MapPin, MapTrifold, Phone, TelegramLogo } from '@phosphor-icons/react';
import type { Icon as PhIcon } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import { SiteTextInput, useSiteContent } from '../ContentFields';
import { errText } from '../errText';
import { phoneFromDisplay } from '../../lib/phone';
import type { ContentSection } from '../lib/content-form';
import SectionTabs from '../SectionTabs';
import { useSiteConfig } from '../useSiteConfig';
import { Button, Card, EmptyState, Field, IconTile, Input, Page, Skeleton, type Hue } from '../ui';
import { useToast } from '../ui/toast';

const st = (i: number) => ({ ['--i' as string]: i } as Record<string, number>);
/** Saytdagidek: footer xaritasi `lon,lat` qatoridan yasaladi (`src/store/Footer.tsx`). */
const COORD_RE = /^\s*-?\d{1,3}(\.\d+)?\s*,\s*-?\d{1,3}(\.\d+)?\s*$/;
const mapHref = (ll: string) => `https://yandex.com/maps/?ll=${encodeURIComponent(ll)}&z=17&pt=${ll},pm2rdm`;
const mapWidget = (ll: string) => `https://yandex.com/map-widget/v1/?ll=${encodeURIComponent(ll)}&z=16&pt=${encodeURIComponent(ll)},pm2rdm`;
/** Havolaning o'qiladigan qismi: protokolsiz, oxirgi `/`siz. */
const shortUrl = (url: string) => url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');

/** Jonli ko'rinishdagi bitta aloqa qatori. */
const PreviewRow: FC<{ icon: PhIcon; hue: Hue; label: string; value: ReactNode }> = ({ icon, hue, label, value }) => (
  <li className="flex items-center gap-3 py-3">
    <IconTile icon={icon} hue={hue} soft size="sm" />
    <span className="min-w-0">
      <span className="block text-sm text-text-muted">{label}</span>
      <span className="block truncate text-base font-medium text-text">{value}</span>
    </span>
  </li>
);

/** Sozlamalar → Aloqa: telefon, ijtimoiy havolalar, xarita koordinatasi va manzil/ish vaqti matnlari (`contact` guruhi). */
const SettingsContact: FC = () => {
  const { t, i18n } = useTranslation('settings');
  const { t: ts } = useTranslation('site');
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
  const addressSection = content.sections.find((s: ContentSection) => s.id === 'contact');
  // Jonli ko'rinish admin tilida; ruschasi bo'sh bo'lsa sayt ham o'zbekchasiga tushadi.
  const text = (key: string) => {
    const v = content.texts[key];
    return (i18n.language === 'ru' ? v?.ru || v?.uz : v?.uz) ?? '';
  };
  const ll = config?.mapLl.trim() ?? '';
  const validLl = COORD_RE.test(ll);
  const address = [text('footerAddressText1'), text('footerAddressText2')].filter(Boolean).join(' ');
  const time = text('footerTime');
  const hasContacts = Boolean(config && (config.phoneDisplay || config.telegram || config.instagram));

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
          <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
            <div className="flex min-w-0 flex-col gap-4">
              <div className="stagger" style={st(0)}>
                <Card icon={Phone} hue="green" title={t('contact.social.title')} description={t('contact.social.description')}>
                  <div className="grid gap-4 sm:grid-cols-2">
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
              </div>

              <div className="stagger" style={st(1)}>
                <Card icon={Clock} hue="teal" title={ts('sections.contact')} description={t('contact.addressDesc')}>
                  <div className="flex flex-col gap-5">
                    {addressSection?.texts.map((f) => <SiteTextInput key={f.key} content={content} field={f} />)}
                  </div>
                </Card>
              </div>

              <div className="stagger" style={st(2)}>
                <Card
                  icon={MapTrifold} hue="orange" title={t('contact.map.title')} description={t('contact.map.description')}
                  actions={validLl ? (
                    <Button variant="outline" size="sm" href={mapHref(ll)} external>
                      <ArrowSquareOut />
                      <span className="max-sm:hidden">{t('contact.map.open')}</span>
                    </Button>
                  ) : undefined}
                >
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label={t('contact.map.coordLabel')} hint={t('contact.map.coordHint')}>
                      <Input value={config.mapLl} onChange={(v) => cfg.set('mapLl', v)} placeholder="69.240562,41.311081" invalid={ll !== '' && !validLl} />
                    </Field>
                  </div>
                </Card>
              </div>
            </div>

            <aside className="stagger lg:sticky lg:top-28" style={st(3)}>
              <Card icon={Eye} hue="violet" title={t('contact.preview.title')} description={t('contact.preview.description')}>
                <div className="rounded-control bg-surface p-5">
                  <p className="text-base font-bold text-text">{t('contact.title')}</p>
                  {hasContacts ? (
                    <ul className="mt-1 divide-y divide-border">
                      {config.phoneDisplay && <PreviewRow icon={Phone} hue="green" label={t('contact.phone.label')} value={<span className="tabular-nums">{config.phoneDisplay}</span>} />}
                      {config.telegram && <PreviewRow icon={TelegramLogo} hue="blue" label="Telegram" value={shortUrl(config.telegram)} />}
                      {config.instagram && <PreviewRow icon={InstagramLogo} hue="pink" label="Instagram" value={shortUrl(config.instagram)} />}
                    </ul>
                  ) : (
                    <p className="mt-2 text-sm text-text-faint">{t('contact.preview.empty')}</p>
                  )}
                  {(address || time) && (
                    <div className="mt-3 flex flex-col gap-2 border-t border-border pt-4 text-sm text-text-muted">
                      {address && <p className="flex gap-2"><MapPin weight="fill" className="mt-0.5 size-4 shrink-0 text-text-muted" />{address}</p>}
                      {time && <p className="flex gap-2"><Clock weight="fill" className="mt-0.5 size-4 shrink-0 text-text-muted" />{time}</p>}
                    </div>
                  )}
                </div>
                {validLl && (
                  <div className="overflow-hidden rounded-control bg-surface">
                    <iframe key={ll} title={t('contact.preview.mapLink')} src={mapWidget(ll)} loading="lazy" className="block h-44 w-full" />
                  </div>
                )}
              </Card>
            </aside>
          </div>
        )}
    </Page>
  );
};

export default SettingsContact;
