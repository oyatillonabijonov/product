import { useEffect, useState } from 'react';
import type { FC, ReactNode } from 'react';
import type { ParseKeys } from 'i18next';
import { useTranslation } from 'react-i18next';
import type { AssetField, AssetKey, ContentGroup, SiteAssets, SiteSection, SiteTexts } from '../lib/site-content';
import { ASSET_DEFAULTS } from '../store/SiteAssets';
import { getAssets, getTexts, saveAssets, saveTexts } from './api';
import { errText } from './errText';
import ImageUploader from './ImageUploader';
import { changedAssets, changedTexts, contentSections, initialTexts, uploadOptions, type ContentSection, type TextFieldDef } from './lib/content-form';
import { Button, Card, EmptyState, LangPair, Page, Skeleton } from './ui';
import { useToast } from './ui/toast';

export interface SiteContent {
  loaded: boolean;
  error: string;
  sections: ContentSection[];
  texts: SiteTexts;
  assets: SiteAssets;
  dirty: boolean;
  setText: (key: string, lang: 'uz' | 'ru', value: string) => void;
  setAsset: (key: AssetKey, url: string) => void;
  /** Faqat o'zgarganini yuboradi; xato bo'lsa tashlaydi (ekran toast chiqaradi). */
  save: () => Promise<void>;
}

interface Meta { fields: TextFieldDef[]; assetFields: AssetField[] }
interface Values { texts: SiteTexts; assets: SiteAssets }
const NONE: Values = { texts: {}, assets: {} };

/**
 * Sayt matnlari va rasmlari (`site_texts`/`site_assets`) formasi: hammasini bir marta yuklaydi, `group` (va `keys`)
 * bo'yicha kartalarga bo'ladi, qoralamani ushlaydi. Landing muharriri, vakansiyalar sahifasi, "Biz haqimizda" va
 * huquqiy sahifalar izohi shundan foydalanadi.
 */
export function useSiteContent(group: ContentGroup, keys?: string[]): SiteContent {
  const { t } = useTranslation('content');
  const [rawMeta, setMeta] = useState(null as Meta | null);
  const meta = rawMeta as Meta | null;
  const [rawBase, setBase] = useState(NONE);
  const base = rawBase as Values;
  const [rawDraft, setDraft] = useState(NONE);
  const draft = rawDraft as Values;
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([getTexts(), getAssets()])
      .then(([res, a]) => {
        const values: Values = { texts: initialTexts(res.fields, res.values), assets: a.values };
        setMeta({ fields: res.fields, assetFields: a.fields });
        setBase(values);
        setDraft(values);
      })
      .catch(() => setError(t('contentFields.refreshError')));
  }, []);

  const textChanges = changedTexts(base.texts, draft.texts);
  const assetChanges = changedAssets(base.assets, draft.assets);

  async function save() {
    if (!meta) return;
    let next = base;
    if (Object.keys(textChanges).length > 0) {
      const res = await saveTexts(textChanges);
      next = { ...next, texts: initialTexts(meta.fields, res.values) };
    }
    if (Object.keys(assetChanges).length > 0) {
      const res = await saveAssets(assetChanges);
      next = { ...next, assets: res.values };
    }
    // ponytail: saqlash paytida yozilgan harf yo'qoladi (so'rov qisqa, tugma band) — kerak bo'lsa faqat yuborilgan kalitlarni almashtirish.
    setBase(next);
    setDraft(next);
  }

  return {
    loaded: meta !== null,
    error: error as string,
    sections: meta ? contentSections(group, meta.fields, meta.assetFields, keys) : [],
    texts: draft.texts,
    assets: draft.assets,
    dirty: Object.keys(textChanges).length > 0 || Object.keys(assetChanges).length > 0,
    setText: (key, lang, value) => setDraft((d: Values) => ({ ...d, texts: { ...d.texts, [key]: { ...d.texts[key], [lang]: value } } })),
    setAsset: (key, url) => setDraft((d: Values) => ({ ...d, assets: { ...d.assets, [key]: url } })),
    save,
  };
}

const AssetInput: FC<{ field: AssetField; value: string; onChange: (url: string) => void }> = ({ field, value, onChange }) => {
  const { t, i18n } = useTranslation(['site', 'content', 'common']);
  // `FC` tipsiz (`@types/react` yo'q) — kalit tipi shu yerda tiklanadi, nomsiz asset lint'da yiqiladi.
  const key: AssetKey = field.key;
  return (
    <div>
      <ImageUploader
        label={t(`assets.${key}.label`)}
        kind={field.kind}
        images={value ? [value] : []}
        onChange={(next) => onChange(next[0] ?? '')}
        normalize={uploadOptions(field.key)}
        accept={field.key === 'favicon' ? 'image/png' : undefined}
        fallback={ASSET_DEFAULTS[field.key] || undefined}
      />
      {i18n.exists(`site:assets.${key}.hint`) && (
        <p className="mt-1 text-label text-muted-2">{t(`assets.${key}.hint` as ParseKeys<'site'>)}</p>
      )}
    </div>
  );
};

/**
 * Bo'limlar kartalari: matn — uz/ru juftligi, rasm/video — yuklagich (fayl o'chirilsa standart qaytadi).
 * `only` — faqat shu id'li bo'limlar (bitta guruhning kartalarini ekranda ajratib qo'yish uchun).
 */
export const ContentFields: FC<{ content: SiteContent; only?: SiteSection[] }> = ({ content, only }) => {
  const { t, i18n } = useTranslation(['site', 'content', 'common']);
  if (content.error) return <EmptyState title={t('content:contentFields.loadErrorTitle')} text={content.error} />;
  if (!content.loaded) return <Skeleton rows={6} />;
  return (
    <>
      {content.sections.filter((s: ContentSection) => !only || only.includes(s.id)).map((s: ContentSection) => (
        <Card key={s.id} title={t(`sections.${s.id}`)}>
          <div className="flex flex-col gap-4">
            {s.texts.map((f) => {
              const labelKey = `fields.${f.key}.label` as ParseKeys<'site'>;
              const hintKey = `fields.${f.key}.hint` as ParseKeys<'site'>;
              return (
                <LangPair
                  key={f.key}
                  label={t(labelKey)}
                  hint={i18n.exists(`site:${hintKey}`) ? t(hintKey) : undefined}
                  kind={f.kind}
                  rows={3}
                  uz={content.texts[f.key]?.uz ?? ''}
                  ru={content.texts[f.key]?.ru ?? ''}
                  onUz={(v) => content.setText(f.key, 'uz', v)}
                  onRu={(v) => content.setText(f.key, 'ru', v)}
                  ruHint={t('content:contentFields.ruHint')}
                />
              );
            })}
            {s.assets.length > 0 && (
              <div className="grid gap-4 sm:grid-cols-2">
                {s.assets.map((f) => (
                  <AssetInput key={f.key} field={f} value={content.assets[f.key] ?? ''} onChange={(url) => content.setAsset(f.key, url)} />
                ))}
              </div>
            )}
          </div>
        </Card>
      ))}
    </>
  );
};

/** Faqat sayt matnlari va rasmlaridan iborat ekran (landing muharriri, vakansiyalar sahifasi). */
export const ContentPage: FC<{ group: ContentGroup; title: string; siteHref: string; back?: string; top?: ReactNode; footer?: ReactNode }> = ({
  group, title, siteHref, back, top, footer,
}) => {
  const { t } = useTranslation('content');
  const content = useSiteContent(group);
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    try {
      await content.save();
      toast(t('shared.savedLive'));
    } catch (e) {
      toast(errText(e), 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Page
      title={title}
      back={back}
      description={t('contentFields.pageDescription')}
      dirty={content.dirty}
      actions={(
        <>
          <Button variant="quiet" href={siteHref} external>{t('shared.viewOnSite')}</Button>
          <Button onClick={save} disabled={!content.dirty || busy}>{busy ? t('shared.saving') : t('shared.save')}</Button>
        </>
      )}
    >
      {top}
      <div className="flex flex-col gap-4">
        <ContentFields content={content} />
        {footer}
      </div>
    </Page>
  );
};
