import { useState } from 'react';
import type { FC } from 'react';
import { ImageSquare, MagnifyingGlass, ShareNetwork, SquaresFour } from '@phosphor-icons/react';
import { GoogleLogo, TelegramLogo } from '../brand-logos';
import { useTranslation } from 'react-i18next';
import { ASSET_DEFAULTS } from '../../store/SiteAssets';
import { SiteTextInput, useSiteContent } from '../ContentFields';
import { errText } from '../errText';
import ImageUploader from '../ImageUploader';
import type { ContentSection } from '../lib/content-form';
import SectionTabs from '../SectionTabs';
import { useSiteConfig } from '../useSiteConfig';
import { Button, Card, EmptyState, Field, Input, Page, Skeleton, Textarea } from '../ui';
import { useToast } from '../ui/toast';

const st = (i: number) => ({ ['--i' as string]: i } as Record<string, number>);
/** Google natijasida ko'rinadigan taxminiy chegaralar (belgi). */
const TITLE_MAX = 60;
const DESC_MAX = 160;
const clip = (s: string, max: number) => (s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s);

/** Belgi hisoblagichi: chegaradan oshsa sariq. */
const Counter: FC<{ n: number; max: number }> = ({ n, max }) => (
  <span className={`text-xs font-medium tabular-nums ${n > max ? 'text-warning-text' : 'text-text-faint'}`}>{n} / {max}</span>
);

/** Sozlamalar → SEO: qidiruv tizimlari uchun sarlavha/tavsif, ulashish rasmi va katalog tavsif shabloni (`seo` guruhi). */
const SettingsSeo: FC = () => {
  const { t } = useTranslation('settings');
  const { t: ts } = useTranslation('site');
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
  // Bosh sahifa sarlavhasi — qo'shimchaning o'zi; bo'sh bo'lsa server do'kon nomini yozadi (`pageTitle`).
  const title = config ? (config.seoTitleSuffix.trim() || config.name) : '';
  const desc = config?.seoDescription.trim() ?? '';
  const host = typeof window === 'undefined' ? '' : window.location.host;
  const favicon = content.assets.favicon || ASSET_DEFAULTS.favicon;
  const catalogSection = content.sections.find((s: ContentSection) => s.id === 'seo');

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
            <div className="grid items-start gap-4 xl:grid-cols-2">
              <div className="stagger" style={st(0)}>
                <Card icon={MagnifyingGlass} hue="blue" title={t('seo.meta.title')}>
                  <div className="flex flex-col gap-4">
                    <Field label={t('seo.meta.suffixLabel')} hint={t('seo.meta.suffixHint')}>
                      <div className="flex flex-col gap-1">
                        <Input value={config.seoTitleSuffix} onChange={(v) => cfg.set('seoTitleSuffix', v)} placeholder={config.name} />
                        <span className="self-end"><Counter n={title.length} max={TITLE_MAX} /></span>
                      </div>
                    </Field>
                    <Field label={t('seo.meta.descLabel')} hint={desc.length > DESC_MAX ? t('seo.preview.tooLong', { max: DESC_MAX }) : t('seo.meta.descHint')}>
                      <div className="flex flex-col gap-1">
                        <Textarea value={config.seoDescription} onChange={(v) => cfg.set('seoDescription', v)} rows={4} />
                        <span className="self-end"><Counter n={desc.length} max={DESC_MAX} /></span>
                      </div>
                    </Field>
                  </div>
                </Card>
              </div>

              <div className="stagger" style={st(1)}>
                <Card icon={GoogleLogo} hue="green" title={t('seo.preview.googleTitle')} description={t('seo.preview.googleDesc')}>
                  <div className="rounded-control bg-surface p-5">
                    <div className="flex items-center gap-3">
                      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-surface-sunken">
                        <img src={favicon} alt="" className="size-4 object-contain" />
                      </span>
                      <span className="min-w-0 leading-tight">
                        <span className="block truncate text-sm text-text">{config.name}</span>
                        <span className="block truncate text-xs text-text-muted">https://{host}</span>
                      </span>
                    </div>
                    <p className="mt-2 line-clamp-2 text-lg leading-snug text-info-text">{clip(title, TITLE_MAX) || '—'}</p>
                    <p className="mt-1 line-clamp-3 text-sm leading-relaxed text-text-muted">{clip(desc, DESC_MAX) || '—'}</p>
                  </div>
                </Card>
              </div>
            </div>

            <div className="stagger" style={st(2)}>
              <Card icon={ShareNetwork} hue="pink" title={t('seo.ogImage.title')} description={t('seo.ogImage.description')}>
                <div className="grid gap-5 lg:grid-cols-2 lg:gap-6">
                  <div>
                    <ImageUploader
                      label={t('seo.ogImage.title')}
                      images={config.ogImage ? [config.ogImage] : []}
                      onChange={(next) => cfg.set('ogImage', next[0] ?? '')}
                      normalize={false}
                      accept="image/png,image/jpeg"
                    />
                    <p className="mt-1 text-sm text-text-muted">{t('seo.ogImage.hint')}</p>
                  </div>
                  <figure className="flex flex-col gap-2">
                    <figcaption className="flex items-center gap-1.5 text-sm font-semibold text-text-muted">
                      <TelegramLogo weight="fill" className="size-4 text-c-blue" />{t('seo.preview.shareTitle')}
                    </figcaption>
                    <div className="rounded-surface bg-surface-sunken p-3 sm:p-4">
                      <div className="ml-auto max-w-[360px] rounded-overlay rounded-br-item bg-surface p-2.5">
                        <p className="truncate px-1 text-sm text-info-text">https://{host}</p>
                        <div className="relative mt-1.5 flex gap-2 overflow-hidden rounded-item bg-c-blue/8 py-2 pl-3.5 pr-2.5">
                          <span aria-hidden className="absolute inset-y-0 left-0 w-[3px] bg-c-blue" />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-c-blue">{config.name}</p>
                            <p className="mt-0.5 text-sm font-semibold text-text">{title || '—'}</p>
                            {desc && <p className="mt-0.5 line-clamp-3 text-sm text-text-muted">{desc}</p>}
                            {config.ogImage ? (
                              <img src={config.ogImage} alt="" className="mt-2 aspect-[1200/630] w-full rounded-item object-cover" />
                            ) : (
                              <div className="mt-2 flex aspect-[1200/630] w-full flex-col items-center justify-center gap-1.5 rounded-item bg-surface-sunken text-sm text-text-faint">
                                <ImageSquare className="size-6" />{t('seo.preview.noImage')}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </figure>
                </div>
              </Card>
            </div>

            {catalogSection && (
              <div className="stagger" style={st(3)}>
                <Card icon={SquaresFour} hue="violet" title={ts('sections.seo')} description={t('seo.catalogDesc')}>
                  <div className="flex flex-col gap-5">
                    {catalogSection.texts.map((f) => <SiteTextInput key={f.key} content={content} field={f} />)}
                  </div>
                </Card>
              </div>
            )}
          </div>
        )}
    </Page>
  );
};

export default SettingsSeo;
