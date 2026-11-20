import { useState } from 'react';
import type { FC } from 'react';
import type { ParseKeys } from 'i18next';
import { CalendarDots, ChatCircleText, Check, Coins, Money, Package, PaintBrush, Storefront, Tag, X } from '@phosphor-icons/react';
import type { Icon as PhIcon } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import type { PaymentMode } from '../../../shared/types';
import type { AssetKey, SiteSection } from '../../lib/site-content';
import { ASSET_DEFAULTS } from '../../store/SiteAssets';
import { AssetInput, SiteTextInput, useSiteContent, type SiteContent } from '../ContentFields';
import { errText } from '../errText';
import type { ContentSection } from '../lib/content-form';
import SectionTabs from '../SectionTabs';
import { useSiteConfig } from '../useSiteConfig';
import { Button, Card, EmptyState, Field, IconTile, Input, Page, Skeleton, type Hue } from '../ui';
import { useToast } from '../ui/toast';

const MODES: { id: PaymentMode; labelKey: ParseKeys<'settings'>; hintKey: ParseKeys<'settings'>; icon: PhIcon; hue: Hue }[] = [
  { id: 'cash', labelKey: 'store.modes.cash', hintKey: 'store.modeHints.cash', icon: Money, hue: 'green' },
  { id: 'both', labelKey: 'store.modes.both', hintKey: 'store.modeHints.both', icon: Coins, hue: 'violet' },
  { id: 'installment', labelKey: 'store.modes.installment', hintKey: 'store.modeHints.installment', icon: CalendarDots, hue: 'blue' },
];

const st = (i: number) => ({ ['--i' as string]: i } as Record<string, number>);

/** Logo sahnasi: sayt header'ining kichik maketi — chapda logo, o'ngda menyu o'rnidagi chiziqlar. */
const LogoStage: FC<{ src: string; dark?: boolean; label: string }> = ({ src, dark, label }) => (
  <figure className="flex flex-col gap-2">
    <div className={`flex h-28 items-center justify-between gap-4 overflow-hidden rounded-control px-5 ${dark ? 'bg-black' : 'bg-white'}`}>
      <img src={src} alt="" className="h-7 max-w-[60%] object-contain object-left" />
      <span aria-hidden className="flex min-w-0 items-center gap-2">
        {['w-7', 'w-9', 'w-6'].map((w) => <span key={w} className={`h-1.5 shrink rounded-full ${w} ${dark ? 'bg-white/20' : 'bg-black/10'}`} />)}
      </span>
    </div>
    <figcaption className="text-sm text-text-muted">{label}</figcaption>
  </figure>
);

/** Brauzer tabi maketi — favicon va do'kon nomi. */
const TabStage: FC<{ favicon: string; name: string; label: string }> = ({ favicon, name, label }) => (
  <figure className="flex flex-col gap-2">
    <div className="flex h-28 flex-col justify-end overflow-hidden rounded-control bg-surface-sunken px-3">
      <div className="flex w-full max-w-[240px] items-center gap-2 rounded-t-item bg-surface px-3 py-2.5">
        <img src={favicon} alt="" className="size-4 shrink-0 rounded-[3px] object-contain" />
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-text">{name}</span>
        <X aria-hidden weight="bold" className="size-3 shrink-0 text-text-faint" />
      </div>
      <div className="-mx-3 h-7 bg-surface" />
    </div>
    <figcaption className="text-sm text-text-muted">{label}</figcaption>
  </figure>
);

/** Sayt matnlari bo'limi (`store` guruhi) — rangli ikonkali karta, ichida uz/ru juftliklari. */
const TextSectionCard: FC<{ content: SiteContent; id: SiteSection; icon: PhIcon; hue: Hue; description: string }> = ({ content, id, icon, hue, description }) => {
  const { t } = useTranslation('site');
  // `FC` tipsiz (`@types/react` yo'q) — bo'lim id tipi shu yerda tiklanadi.
  const sid: SiteSection = id;
  const section = content.sections.find((s: ContentSection) => s.id === sid);
  if (!section) return null;
  return (
    <Card icon={icon} hue={hue} title={t(`sections.${sid}`)} description={description}>
      <div className="flex flex-col gap-5">
        {section.texts.map((f) => <SiteTextInput key={f.key} content={content} field={f} />)}
      </div>
    </Card>
  );
};

/** Sozlamalar → Do'kon: nom, narx rejimi, logolar va favicon, mahsulot sahifasidagi va'dalar (`store` guruhi). */
const SettingsStore: FC = () => {
  const { t } = useTranslation('settings');
  const { t: ts } = useTranslation('site');
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
  const asset = (key: AssetKey) => content.assets[key] || ASSET_DEFAULTS[key];
  const logoAssets = content.sections.find((s: ContentSection) => s.id === 'logo')?.assets ?? [];

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
            <div className="grid gap-4 xl:grid-cols-2">
              <div className="stagger" style={st(0)}>
                <Card icon={Storefront} hue="violet" title={t('store.title')} description={t('store.identityDesc')} className="h-full">
                  <div className="grid items-start gap-4 sm:grid-cols-2">
                    <Field label={t('store.name.label')} required error={config.name.trim() === '' ? t('store.name.required') : undefined} hint={t('store.name.hint')}>
                      <Input value={config.name} onChange={(v) => cfg.set('name', v)} />
                    </Field>
                    <TabStage favicon={asset('favicon')} name={config.name || '—'} label={t('store.logoCard.inTab')} />
                  </div>
                </Card>
              </div>

              <div className="stagger" style={st(1)}>
                <Card icon={Tag} hue="orange" title={t('store.paymentMode.label')} description={t('store.paymentMode.hint')} className="h-full">
                  <div role="radiogroup" aria-label={t('store.paymentMode.label')} className="grid gap-3 sm:grid-cols-3">
                    {MODES.map((m) => {
                      const on = config.paymentMode === m.id;
                      return (
                        <button
                          key={m.id}
                          type="button"
                          role="radio"
                          aria-checked={on}
                          onClick={() => { if (!on) cfg.set('paymentMode', m.id); }}
                          className={`flex flex-col items-start gap-4 rounded-control p-4 text-left transition-colors duration-200 ${
                            on ? 'bg-accent-soft' : 'bg-surface-sunken hover:bg-surface-sunken-hover'
                          }`}
                        >
                          <span className="flex w-full items-center justify-between">
                            <IconTile icon={m.icon} hue={m.hue} soft={!on} />
                            <span aria-hidden className={`grid size-5 place-items-center rounded-full transition-colors duration-200 ${on ? 'bg-accent text-white' : 'bg-surface'}`}>
                              <Check weight="bold" className={`size-3 transition-transform duration-200 ease-spring ${on ? 'scale-100' : 'scale-0'}`} />
                            </span>
                          </span>
                          <span>
                            <span className={`block text-base font-semibold ${on ? 'text-accent-text' : 'text-text'}`}>{t(m.labelKey)}</span>
                            <span className="mt-0.5 block text-sm leading-relaxed text-text-muted">{t(m.hintKey)}</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </Card>
              </div>
            </div>

            <div className="stagger" style={st(2)}>
              <Card icon={PaintBrush} hue="pink" title={ts('sections.logo')} description={t('store.logoCard.description')}>
                <div className="grid gap-3 sm:grid-cols-2">
                  <LogoStage src={asset('logo')} label={t('store.logoCard.onLight')} />
                  <LogoStage src={asset('logoDark')} dark label={t('store.logoCard.onDark')} />
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  {logoAssets.map((f) => (
                    <AssetInput key={f.key} field={f} value={content.assets[f.key] ?? ''} onChange={(url) => content.setAsset(f.key, url)} />
                  ))}
                </div>
              </Card>
            </div>

            <div className="grid items-start gap-4 xl:grid-cols-2">
              <div className="stagger" style={st(3)}>
                <TextSectionCard content={content} id="productPage" icon={Package} hue="blue" description={t('store.sectionHints.productPage')} />
              </div>
              <div className="stagger" style={st(4)}>
                <TextSectionCard content={content} id="orderCookie" icon={ChatCircleText} hue="green" description={t('store.sectionHints.orderCookie')} />
              </div>
            </div>
          </div>
        )}
    </Page>
  );
};

export default SettingsStore;
