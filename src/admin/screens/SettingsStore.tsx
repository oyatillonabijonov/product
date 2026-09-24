import { useState } from 'react';
import type { FC } from 'react';
import type { ParseKeys } from 'i18next';
import { useTranslation } from 'react-i18next';
import type { PaymentMode } from '../../../shared/types';
import { ContentFields, useSiteContent } from '../ContentFields';
import { errText } from '../errText';
import SectionTabs from '../SectionTabs';
import { useSiteConfig } from '../useSiteConfig';
import { Button, Card, EmptyState, Field, Input, Page, Segmented, Skeleton } from '../ui';
import { useToast } from '../ui/toast';

const MODES: { id: string; labelKey: ParseKeys<'settings'> }[] = [
  { id: 'cash', labelKey: 'store.modes.cash' },
  { id: 'both', labelKey: 'store.modes.both' },
  { id: 'installment', labelKey: 'store.modes.installment' },
];

/** Sozlamalar → Do'kon: nom, narx rejimi, logolar va favicon, mahsulot sahifasidagi va'dalar (`store` guruhi). */
const SettingsStore: FC = () => {
  const { t } = useTranslation('settings');
  const cfg = useSiteConfig();
  const content = useSiteContent('store');
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

  const dirty = cfg.dirty || content.dirty;
  const canSave = dirty && !busy && (config?.name.trim() ?? '') !== '';
  const error = cfg.error || content.error;

  return (
    <Page
      title={t('store.title')}
      description={t('store.description')}
      dirty={dirty}
      actions={<Button onClick={save} disabled={!canSave}>{busy ? t('shared.saving') : t('shared.save')}</Button>}
    >
      <SectionTabs section="settings" active="store" />
      {error ? <EmptyState title={t('shared.loadErrorTitle')} text={error} />
        : !config || !content.loaded ? <Skeleton rows={8} />
        : (
          <div className="flex flex-col gap-4">
            <Card title={t('store.title')}>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label={t('store.name.label')} required error={config.name.trim() === '' ? t('store.name.required') : undefined} hint={t('store.name.hint')}>
                  <Input value={config.name} onChange={(v) => cfg.set('name', v)} />
                </Field>
              </div>
              <div className="mt-4">
                <p className="mb-1.5 text-label font-medium text-muted">{t('store.paymentMode.label')}</p>
                <Segmented
                  label={t('store.paymentMode.label')}
                  value={config.paymentMode}
                  onChange={(v) => cfg.set('paymentMode', v as PaymentMode)}
                  options={MODES.map((m) => ({ id: m.id, label: t(m.labelKey) }))}
                />
                <p className="mt-1 text-label text-muted-2">{t('store.paymentMode.hint')}</p>
              </div>
            </Card>
            <ContentFields content={content} only={['logo']} />
            <ContentFields content={content} only={['productPage', 'orderCookie']} />
          </div>
        )}
    </Page>
  );
};

export default SettingsStore;
