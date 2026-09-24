import { useState } from 'react';
import type { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { ContentFields, useSiteContent } from '../ContentFields';
import { errText } from '../errText';
import ImageUploader from '../ImageUploader';
import SectionTabs from '../SectionTabs';
import { useSiteConfig } from '../useSiteConfig';
import { Button, Card, EmptyState, Field, Input, Page, Skeleton, Textarea } from '../ui';
import { useToast } from '../ui/toast';

/** Sozlamalar → SEO: qidiruv tizimlari uchun sarlavha/tavsif, ulashish rasmi va katalog tavsif shabloni (`seo` guruhi). */
const SettingsSeo: FC = () => {
  const { t } = useTranslation('settings');
  const cfg = useSiteConfig();
  const content = useSiteContent('seo');
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
  const error = cfg.error || content.error;

  return (
    <Page
      title="SEO"
      description={t('seo.description')}
      dirty={dirty}
      actions={<Button onClick={save} disabled={!dirty || busy}>{busy ? t('shared.saving') : t('shared.save')}</Button>}
    >
      <SectionTabs section="settings" active="seo" />
      {error ? <EmptyState title={t('shared.loadErrorTitle')} text={error} />
        : !config || !content.loaded ? <Skeleton rows={8} />
        : (
          <div className="flex flex-col gap-4">
            <Card title={t('seo.meta.title')}>
              <div className="flex flex-col gap-4">
                <Field label={t('seo.meta.suffixLabel')} hint={t('seo.meta.suffixHint')}>
                  <Input value={config.seoTitleSuffix} onChange={(v) => cfg.set('seoTitleSuffix', v)} />
                </Field>
                <Field label={t('seo.meta.descLabel')} hint={t('seo.meta.descHint')}>
                  <Textarea value={config.seoDescription} onChange={(v) => cfg.set('seoDescription', v)} rows={3} />
                </Field>
              </div>
            </Card>
            <Card title={t('seo.ogImage.title')} description={t('seo.ogImage.description')}>
              <ImageUploader
                label={t('seo.ogImage.title')}
                images={config.ogImage ? [config.ogImage] : []}
                onChange={(next) => cfg.set('ogImage', next[0] ?? '')}
                normalize={false}
                accept="image/png,image/jpeg"
              />
              <p className="mt-1 text-label text-muted-2">{t('seo.ogImage.hint')}</p>
            </Card>
            <ContentFields content={content} />
          </div>
        )}
    </Page>
  );
};

export default SettingsSeo;
