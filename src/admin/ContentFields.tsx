import { useEffect, useState } from 'react';
import type { FC, ReactNode } from 'react';
import type { AssetField, AssetKey, ContentGroup, SiteAssets, SiteTexts } from '../lib/site-content';
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
  const [rawMeta, setMeta] = useState(null as Meta | null);
  const meta = rawMeta as Meta | null;
  const [rawBase, setBase] = useState(NONE);
  const base = rawBase as Values;
  const [rawDraft, setDraft] = useState(NONE);
  const draft = rawDraft as Values;
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([getTexts(), getAssets()])
      .then(([t, a]) => {
        const values: Values = { texts: initialTexts(t.fields, t.values), assets: a.values };
        setMeta({ fields: t.fields, assetFields: a.fields });
        setBase(values);
        setDraft(values);
      })
      .catch(() => setError("Sahifani yangilab qayta urinib ko'ring"));
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

const AssetInput: FC<{ field: AssetField; value: string; onChange: (url: string) => void }> = ({ field, value, onChange }) => (
  <div>
    <ImageUploader
      label={field.label}
      kind={field.kind}
      images={value ? [value] : []}
      onChange={(next) => onChange(next[0] ?? '')}
      normalize={uploadOptions(field.key)}
      accept={field.key === 'favicon' ? 'image/png' : undefined}
      fallback={ASSET_DEFAULTS[field.key] || undefined}
    />
    {field.hint && <p className="mt-1 text-label text-muted-2">{field.hint}</p>}
  </div>
);

/** Bo'limlar kartalari: matn — uz/ru juftligi, rasm/video — yuklagich (fayl o'chirilsa standart qaytadi). */
export const ContentFields: FC<{ content: SiteContent }> = ({ content }) => {
  if (content.error) return <EmptyState title="Sayt matnlari yuklanmadi" text={content.error} />;
  if (!content.loaded) return <Skeleton rows={6} />;
  return (
    <>
      {content.sections.map((s) => (
        <Card key={s.title} title={s.title}>
          <div className="flex flex-col gap-4">
            {s.texts.map((f) => (
              <LangPair
                key={f.key}
                label={f.label}
                hint={f.hint}
                kind={f.kind}
                rows={3}
                uz={content.texts[f.key]?.uz ?? ''}
                ru={content.texts[f.key]?.ru ?? ''}
                onUz={(v) => content.setText(f.key, 'uz', v)}
                onRu={(v) => content.setText(f.key, 'ru', v)}
                ruHint="Bo'sh qolsa standart matn chiqadi"
              />
            ))}
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
  const content = useSiteContent(group);
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    try {
      await content.save();
      toast("Saqlandi · saytda 1–5 daqiqada ko'rinadi");
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
      description="Maydon bo'shatilsa yoki fayl o'chirilsa saytdagi standart matn va rasm qaytadi."
      dirty={content.dirty}
      actions={(
        <>
          <Button variant="quiet" href={siteHref} external>Saytda ko'rish</Button>
          <Button onClick={save} disabled={!content.dirty || busy}>{busy ? 'Saqlanmoqda…' : 'Saqlash'}</Button>
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
