import { useState } from 'react';
import type { FC } from 'react';
import { ContentFields, useSiteContent } from '../ContentFields';
import { errText } from '../errText';
import ImageUploader from '../ImageUploader';
import SectionTabs from '../SectionTabs';
import { useSiteConfig } from '../useSiteConfig';
import { Button, Card, EmptyState, Field, Input, Page, Skeleton, Textarea } from '../ui';
import { useToast } from '../ui/toast';

/** Sozlamalar → SEO: qidiruv tizimlari uchun sarlavha/tavsif, ulashish rasmi va katalog tavsif shabloni (`seo` guruhi). */
const SettingsSeo: FC = () => {
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
      toast("Saqlandi · saytda 1–5 daqiqada ko'rinadi");
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
      description="Qidiruv tizimlari va ijtimoiy tarmoqlarda sayt qanday ko'rinadi."
      dirty={dirty}
      actions={<Button onClick={save} disabled={!dirty || busy}>{busy ? 'Saqlanmoqda…' : 'Saqlash'}</Button>}
    >
      <SectionTabs section="settings" active="seo" />
      {error ? <EmptyState title="Sozlamalar yuklanmadi" text={error} />
        : !config || !content.loaded ? <Skeleton rows={8} />
        : (
          <div className="flex flex-col gap-4">
            <Card title="Sarlavha va tavsif">
              <div className="flex flex-col gap-4">
                <Field label="Sarlavha qo'shimchasi" hint="Har bir sahifa sarlavhasi oxiriga qo'shiladi; bo'sh qolsa do'kon nomi ishlatiladi">
                  <Input value={config.seoTitleSuffix} onChange={(v) => cfg.set('seoTitleSuffix', v)} />
                </Field>
                <Field label="Bosh sahifa tavsifi" hint="Google natijalarida sayt ostidagi matn">
                  <Textarea value={config.seoDescription} onChange={(v) => cfg.set('seoDescription', v)} rows={3} />
                </Field>
              </div>
            </Card>
            <Card title="Ulashish rasmi" description="Havola Telegram, WhatsApp yoki ijtimoiy tarmoqda tashlanganda shu rasm chiqadi. 1200×630, PNG yoki JPG — rasm o'zgarishsiz yuklanadi.">
              <ImageUploader
                label="Ulashish rasmi"
                images={config.ogImage ? [config.ogImage] : []}
                onChange={(next) => cfg.set('ogImage', next[0] ?? '')}
                normalize={false}
                accept="image/png,image/jpeg"
              />
              <p className="mt-1 text-label text-muted-2">Bo'sh qolsa ulashishda rasm ko'rsatilmaydi.</p>
            </Card>
            <ContentFields content={content} />
          </div>
        )}
    </Page>
  );
};

export default SettingsSeo;
