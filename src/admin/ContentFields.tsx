import { useEffect, useState } from 'react';
import type { FC, ReactNode } from 'react';
import {
  ArrowSquareOut, Briefcase, ChatCircleDots, Confetti, Desktop, Eye, EyeSlash, Handshake, Headphones, Images, Info,
  ListChecks, MagnifyingGlass, MapPin, Newspaper, Package, Receipt, RocketLaunch, Scales, ShieldCheck, ShoppingBag,
  Sparkle, Star, TextAa, Trash, UsersThree, VideoCamera, WarningCircle,
} from '@phosphor-icons/react';
import { AppleLogo } from './brand-logos';
import type { Icon as PhIcon } from '@phosphor-icons/react';
import type { ParseKeys } from 'i18next';
import { useTranslation } from 'react-i18next';
import type { AssetField, AssetKey, ContentGroup, SiteAssets, SiteSection, SiteTexts } from '../lib/site-content';
import { ASSET_DEFAULTS } from '../store/SiteAssets';
import { getAssets, getTexts, saveAssets, saveTexts } from './api';
import { errText } from './errText';
import ImageUploader from './ImageUploader';
import { changedAssets, changedTexts, contentSections, initialTexts, uploadOptions, type ContentSection, type TextFieldDef } from './lib/content-form';
import { Button, Card, EmptyState, Field, Input, LangPair, Page, Skeleton, Toggle, type Hue } from './ui';
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

/** Kartalar ketma-ket paydo bo'lishi (`stagger`) — n-chi element kechikishi. */
export const delay = (n: number) => ({ ['--i' as string]: Math.min(n, 10) } as Record<string, number>);

/** Har bo'lim kartasining rangli ikonkasi — saytdagi blokni ko'z bilan topish oson bo'lsin. */
export const SECTION_META: Record<SiteSection, { icon: PhIcon; hue: Hue }> = {
  heroApple: { icon: AppleLogo, hue: 'slate' },
  heroPc: { icon: Desktop, hue: 'blue' },
  heroAudio: { icon: Headphones, hue: 'orange' },
  heroVideo: { icon: VideoCamera, hue: 'pink' },
  services: { icon: ShieldCheck, hue: 'green' },
  consult: { icon: ChatCircleDots, hue: 'teal' },
  homeTitles: { icon: TextAa, hue: 'violet' },
  productPage: { icon: Package, hue: 'blue' },
  orderCookie: { icon: Receipt, hue: 'orange' },
  logo: { icon: Sparkle, hue: 'violet' },
  contact: { icon: MapPin, hue: 'teal' },
  aboutIntro: { icon: Info, hue: 'violet' },
  aboutExperts: { icon: UsersThree, hue: 'blue' },
  aboutWarranty: { icon: ShieldCheck, hue: 'green' },
  aboutBuy: { icon: ShoppingBag, hue: 'orange' },
  aboutPersonal: { icon: Handshake, hue: 'pink' },
  aboutNear: { icon: MapPin, hue: 'teal' },
  aboutNews: { icon: Newspaper, hue: 'amber' },
  careersSeo: { icon: MagnifyingGlass, hue: 'slate' },
  careersHero: { icon: RocketLaunch, hue: 'violet' },
  careersWork: { icon: Briefcase, hue: 'blue' },
  careersLife: { icon: Confetti, hue: 'pink' },
  careersWhy: { icon: Star, hue: 'amber' },
  careersRoles: { icon: ListChecks, hue: 'green' },
  images: { icon: Images, hue: 'orange' },
  legal: { icon: Scales, hue: 'slate' },
  seo: { icon: MagnifyingGlass, hue: 'blue' },
};

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

export const AssetInput: FC<{ field: AssetField; value: string; onChange: (url: string) => void }> = ({ field, value, onChange }) => {
  const { t, i18n } = useTranslation(['site', 'content', 'common']);
  // `FC` tipsiz (`@types/react` yo'q) — kalit tipi shu yerda tiklanadi, nomsiz asset lint'da yiqiladi.
  const key: AssetKey = field.key;
  return (
    <div className="min-w-0">
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
        <p className="mt-1.5 text-sm text-text-muted">{t(`assets.${key}.hint` as ParseKeys<'site'>)}</p>
      )}
    </div>
  );
};

/** Bitta sayt matni — uz/ru juftligi; nom va izoh `site:fields.<kalit>`dan. */
export const SiteTextInput: FC<{ content: SiteContent; field: TextFieldDef; rows?: number; lang?: 'uz' | 'ru' }> = ({ content, field, rows = 3, lang }) => {
  const { t, i18n } = useTranslation(['site', 'content']);
  const labelKey = `fields.${field.key}.label` as ParseKeys<'site'>;
  const hintKey = `fields.${field.key}.hint` as ParseKeys<'site'>;
  return (
    <LangPair
      label={t(labelKey)}
      hint={i18n.exists(`site:${hintKey}`) ? t(hintKey) : undefined}
      kind={field.kind}
      rows={rows}
      uz={content.texts[field.key]?.uz ?? ''}
      ru={content.texts[field.key]?.ru ?? ''}
      onUz={(v) => content.setText(field.key, 'uz', v)}
      onRu={(v) => content.setText(field.key, 'ru', v)}
      ruHint={t('content:contentFields.ruHint')}
      lang={lang}
    />
  );
};

/** Bo'lim kartasi: rangli ikonka, nom, saytdagi joyi; ichida matnlar, keyin rasm/videolar. */
export const SectionCard: FC<{ content: SiteContent; section: ContentSection; children?: ReactNode; lang?: 'uz' | 'ru' }> = ({ content, section, children, lang }) => {
  const { t, i18n } = useTranslation(['site']);
  // `FC` props tipsiz — bo'lim tipi shu yerda tiklanadi (kalitlar lint'da tekshiriladi).
  const s: ContentSection = section;
  const meta = SECTION_META[s.id];
  return (
    <Card
      icon={meta.icon}
      hue={meta.hue}
      title={t(`sections.${s.id}`)}
      description={i18n.exists(`site:sectionHints.${s.id}`) ? t(`sectionHints.${s.id}` as ParseKeys<'site'>) : undefined}
    >
      <div className="flex flex-col gap-5">
        {s.texts.map((f) => <SiteTextInput key={f.key} content={content} field={f} lang={lang} />)}
        {s.assets.length > 0 && (
          <div className={`grid gap-4 sm:grid-cols-2 ${s.texts.length > 0 ? 'border-t border-border pt-5' : ''}`}>
            {s.assets.map((f) => (
              <AssetInput key={f.key} field={f} value={content.assets[f.key] ?? ''} onChange={(url) => content.setAsset(f.key, url)} />
            ))}
          </div>
        )}
        {children}
      </div>
    </Card>
  );
};

/**
 * Bo'limlar kartalari: matn — uz/ru juftligi, rasm/video — yuklagich (fayl o'chirilsa standart qaytadi).
 * `only` — faqat shu id'li bo'limlar (bitta guruhning kartalarini ekranda ajratib qo'yish uchun).
 */
export const ContentFields: FC<{ content: SiteContent; only?: SiteSection[]; lang?: 'uz' | 'ru' }> = ({ content, only, lang }) => {
  const { t } = useTranslation(['site', 'content', 'common']);
  if (content.error) return <EmptyState icon={<WarningCircle />} title={t('content:contentFields.loadErrorTitle')} text={content.error} />;
  if (!content.loaded) return <Skeleton rows={6} />;
  return (
    <>
      {content.sections.filter((s: ContentSection) => !only || only.includes(s.id)).map((s: ContentSection, i: number) => (
        <div key={s.id} className="stagger" style={delay(i)}>
          <SectionCard content={content} section={s} lang={lang} />
        </div>
      ))}
    </>
  );
};

/**
 * Faqat sayt matnlari va rasmlaridan iborat ekran (landing muharriri, vakansiyalar sahifasi). `render` berilsa
 * kartalar o'rniga u chiziladi (landing — bloklar saytdagi tartibda).
 */
export const ContentPage: FC<{
  group: ContentGroup;
  title: string;
  siteHref: string;
  back?: string;
  description?: string;
  top?: ReactNode;
  render?: (content: SiteContent) => ReactNode;
}> = ({ group, title, siteHref, back, description, top, render }) => {
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

  const body = content.error || !content.loaded || !render ? <ContentFields content={content} /> : render(content);
  return (
    <Page
      title={title}
      back={back}
      description={description ?? t('contentFields.pageDescription')}
      dirty={content.dirty}
      actions={(
        <>
          <Button variant="outline" href={siteHref} external className="max-sm:hidden"><ArrowSquareOut />{t('shared.viewOnSite')}</Button>
          <Button onClick={save} disabled={!content.dirty || busy}>{busy ? t('shared.saving') : t('shared.save')}</Button>
        </>
      )}
    >
      {top}
      {/* Forma kenglikda cho'zilmaydi — keng ekranda ham maydonlar o'qilishi qulay enda qoladi. */}
      <div className="flex max-w-5xl flex-col gap-4">{body}</div>
    </Page>
  );
};

/* ---------- Kontent tahrir ekranlarining umumiy qismlari (banner, maqola, sahifa, vakansiya) ---------- */

/** Ikki ustun: chapda forma kartalari, `xl`dan o'ngda joyida turadigan panel (ko'rinish va holat). */
export const EditColumns: FC<{ main: ReactNode; aside: ReactNode }> = ({ main, aside }) => (
  <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start">
    <div className="flex min-w-0 flex-col gap-4">{main}</div>
    <aside className="flex min-w-0 flex-col gap-4 xl:sticky xl:top-28">{aside}</aside>
  </div>
);

/** Saqlash xatosi — forma tepasida. */
export const FormError: FC<{ text: string }> = ({ text }) => (
  <p role="alert" className="flex items-start gap-2.5 rounded-control bg-danger-soft px-4 py-3 text-base text-danger-strong">
    <WarningCircle weight="fill" className="mt-[calc(0.5lh-9px)] size-[18px] shrink-0 text-danger" />
    {text}
  </p>
);

/** Ko'rinish paneli sarlavhasi bilan karta — ichiga saytdagi ko'rinishning nusxasi qo'yiladi. */
export const PreviewCard: FC<{ description?: string; children: ReactNode }> = ({ description, children }) => {
  const { t } = useTranslation('content');
  return (
    <Card icon={Eye} hue="violet" title={t('shared.previewTitle')} description={description}>
      {children}
    </Card>
  );
};

/** «Saytda ko'rinadi / Yashirin» qatori switch bilan — yashil fon holatni bir qarashda aytadi. */
export const LiveSwitch: FC<{ on: boolean; onChange: (v: boolean) => void }> = ({ on, onChange }) => {
  const { t } = useTranslation('content');
  return (
    <div className={`flex items-center justify-between gap-3 rounded-control px-3.5 py-3 transition-colors duration-200 ${on ? 'bg-success-soft' : 'bg-surface-sunken'}`}>
      <span className="flex min-w-0 items-center gap-2.5">
        <span aria-hidden className={`size-2.5 shrink-0 rounded-full ${on ? 'bg-success' : 'bg-text-faint'}`} />
        <span className={`text-base font-medium ${on ? 'text-success-strong' : 'text-text-muted'}`}>{on ? t('publish.live') : t('publish.off')}</span>
      </span>
      <Toggle on={on} onChange={onChange} label={t('shared.showOnSite')} />
    </div>
  );
};

/**
 * Holat paneli: saytda ko'rinadi/yashirin (switch), manzil, tartib raqami, o'chirish. Holat formadagi qiymat —
 * saytga «Saqlash»dan keyin tushadi.
 */
export const PublishCard: FC<{
  active: boolean;
  onActive: (v: boolean) => void;
  activeHint?: string;
  sortOrder: number;
  onSort: (n: number) => void;
  sortHint: string;
  /** Saytdagi manzil (`/page/slug`); `siteHref` bo'lsa havola bo'lib chiqadi. */
  address?: string;
  siteHref?: string;
  onDelete?: () => void;
  deleteLabel?: string;
}> = ({ active, onActive, activeHint, sortOrder, onSort, sortHint, address, siteHref, onDelete, deleteLabel }) => {
  const { t } = useTranslation('content');
  return (
    <Card icon={active ? Eye : EyeSlash} hue={active ? 'green' : 'slate'} title={t('publish.title')} description={t('publish.description')}>
      <div className="flex flex-col gap-4">
        <LiveSwitch on={active} onChange={onActive} />
        {activeHint && <p className="-mt-2 text-sm text-text-muted">{activeHint}</p>}
        {address !== undefined && (
          <div className="flex flex-col gap-1">
            <span className="text-sm font-semibold text-text">{t('publish.address')}</span>
            {siteHref ? (
              <a href={siteHref} target="_blank" rel="noopener noreferrer" className="group flex min-w-0 items-center gap-1.5 text-base text-text-muted transition-colors hover:text-text">
                <span className="truncate font-mono text-sm">{address}</span>
                <ArrowSquareOut className="size-4 shrink-0 text-text-faint transition-colors group-hover:text-text" />
              </a>
            ) : (
              <span className="truncate font-mono text-sm text-text-muted">{address || t('publish.notSaved')}</span>
            )}
          </div>
        )}
        <Field label={t('shared.sortOrder')} hint={sortHint}>
          <Input type="number" value={String(sortOrder)} onChange={(v) => onSort(Number(v) || 0)} />
        </Field>
        {onDelete && (
          <div className="border-t border-border pt-4">
            <Button variant="dangerSoft" onClick={onDelete} className="w-full"><Trash />{deleteLabel}</Button>
          </div>
        )}
      </div>
    </Card>
  );
};
