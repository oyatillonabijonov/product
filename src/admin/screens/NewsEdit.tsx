import { useEffect, useState } from 'react';
import type { FC, ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { Eye, EyeSlash, House, Image as ImageIcon, Info, LinkSimple, MagnifyingGlass, Package, PencilSimple, Prohibit, Translate, Trash } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import type { ApiNews, ApiProduct, NewsPriceMode } from '../../../shared/types';
import { NEWS_SCALE_MAX, NEWS_SCALE_MIN, newsProductId } from '../../../shared/news-price';
import { localeToLang, type Locale } from '../../../app/lib/i18n';
import { translations } from '../../locales';
import StorePreview from '../StorePreview';
import { CurrencyProvider } from '../../store/CurrencyContext';
import { NewsTile, newsLayout } from '../../store/NewsSection';
import { createNews, deleteNews, listNews, listProducts, updateNews } from '../api';
import { errText } from '../errText';
import ImageUploader from '../ImageUploader';
import PriceInput from '../PriceInput';
import { delay, FormError, LiveSwitch } from '../ContentFields';
import { withoutId } from '../lib/content-form';
import { formatSum } from '../lib/format';
import { Badge, Button, Card, Field, HUE_DOT, INPUT_CLS, Input, Page, Segmented, Skeleton, Textarea, type Hue } from '../ui';
import { useConfirm } from '../ui/confirm';
import { useToast } from '../ui/toast';

const LIST = '/admin/content/news';

type Form = Omit<ApiNews, 'id'>;
const EMPTY: Form = {
  badge: '', badgeRu: '', tag: '', tagRu: '', title: '', titleRu: '', text: '', textRu: '',
  cta: '', ctaRu: '', linkUrl: '', imageUrl: '', imageScale: 100, sortOrder: 0, isActive: true,
  priceMode: 'none', manualPriceUzs: null,
};

/** Ikki tilli maydonlar: o'zbekcha kalit → ruscha jufti. */
const RU_KEY = { title: 'titleRu', text: 'textRu', badge: 'badgeRu', tag: 'tagRu', cta: 'ctaRu' } as const;
type TextKey = keyof typeof RU_KEY;

/** Tayyor matnlar [o'zbekcha, ruscha] — bosilsa ikkala tilga birdan yoziladi. Bazaga tushadigan matn, admin tiliga bog'liq emas. */
type Preset = readonly [string, string];
const BADGES: Preset[] = [['Yangi', 'Новинка'], ['Chegirma', 'Скидка'], ['Xit', 'Хит']];
const TAGS: Preset[] = [['Sotuvda', 'В продаже'], ['Tez orada', 'Скоро'], ['Oldindan buyurtma', 'Предзаказ']];
const CTAS: Preset[] = [['Xarid qilish', 'Купить'], ['Batafsil', 'Подробнее'], ['Oldindan buyurtma', 'Предзаказ']];

/** Tugma qayerga olib boradi: tovar sahifasi, boshqa havola yoki tugmasiz. */
type CtaMode = 'product' | 'link' | 'none';
const ctaModeOf = (linkUrl: string): CtaMode => (linkUrl === '' ? 'none' : newsProductId(linkUrl) ? 'product' : 'link');

/** Raqamli qadam kartasi: rangli raqam, nom va izoh; ostida maydonlar. Raqamlar matnda ham tilga olinadi («5-qadam»). */
const Step: FC<{ n: number; hue: Hue; title: string; description?: string; children: ReactNode }> = ({ n, hue, title, description, children }) => (
  <section className="flex min-w-0 flex-col gap-5 rounded-surface border border-border bg-surface p-6">
    <div className="flex items-start gap-3">
      <span className={`grid size-8 shrink-0 place-items-center rounded-full text-base font-semibold tabular-nums text-white ${HUE_DOT[hue]}`}>{n}</span>
      <div className="min-w-0 pt-0.5">
        <h2 className="text-md font-bold text-text">{title}</h2>
        {description && <p className="mt-0.5 text-sm leading-relaxed text-text-muted">{description}</p>}
      </div>
    </div>
    {children}
  </section>
);

/** Qadam ichidagi izoh qatori (narx/tugma rejimi nima qilishini aytadi). */
const Note: FC<{ children: ReactNode }> = ({ children }) => (
  <p className="flex items-start gap-2 rounded-control bg-surface-sunken px-3 py-2.5 text-base text-text-muted">
    <Info className="mt-[calc(0.5lh-8px)] size-4 shrink-0 text-text-faint" />
    <span>{children}</span>
  </p>
);

/**
 * Yangilik (landing tile'i) tahriri. `id` = 'new' yoki yangilik id'si. Chapda qadamlar, o'ngda joyida turadigan
 * jonli karta (saytdagi `NewsTile`ning o'zi) — tanlangan tilda.
 */
const NewsEdit: FC<{ id: string }> = ({ id }) => {
  const { t } = useTranslation('content');
  const sum = useTranslation('common').t('sum');
  const isNew = id === 'new';
  const navigate = useNavigate();
  const toast = useToast();
  const confirm = useConfirm();
  const [rawForm, setForm] = useState(EMPTY as Form);
  const form = rawForm as Form;
  const [loaded, setLoaded] = useState(isNew);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  // Boshqa yangiliklar — bu karta bosh sahifada qaysi ko'rinishda (katta/yon) chiqishini bilish uchun.
  const [rawOthers, setOthers] = useState([] as ApiNews[]);
  const others = rawOthers as ApiNews[];
  const [rawProducts, setProducts] = useState(null as ApiProduct[] | null);
  const products = rawProducts as ApiProduct[] | null;
  const [rawQuery, setQuery] = useState('');
  const query = rawQuery as string;
  const [rawLang, setLang] = useState('uz');
  const lang = rawLang as Locale;
  // Yangi kartada odatiy yo'l — tovar haqida; mavjudida havoladan aniqlanadi.
  const [rawCtaMode, setCtaMode] = useState('product');
  const ctaMode = rawCtaMode as CtaMode;

  useEffect(() => {
    listNews().then((all) => {
      setOthers(all.filter((x) => x.id !== id));
      if (isNew) return;
      const n = all.find((x) => x.id === id);
      if (!n) { setError(t('newsEdit.notFound')); return; }
      setForm(withoutId(n));
      setCtaMode(ctaModeOf(n.linkUrl));
      setLoaded(true);
    }).catch(() => { if (!isNew) setError(t('shared.loadError')); });
    // Tovarlar yuklanmasa forma baribir ishlaydi — faqat qidiruv bo'sh qoladi.
    listProducts().then(setProducts).catch(() => setProducts([]));
  }, [id, isNew]);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => { setForm((f: Form) => ({ ...f, [k]: v })); setDirty(true); };

  const linkedId = newsProductId(form.linkUrl);
  const product = products?.find((p) => p.id === linkedId);
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const matches = words.length === 0 ? [] : (products ?? [])
    .filter((p) => words.every((w) => p.name.toLowerCase().includes(w)))
    .sort((a, b) => Number(b.isActive) - Number(a.isActive))
    .slice(0, 8);

  /** Rejim almashganda havola tozalanadi; tovar narxi tovarsiz qolmasin. */
  function changeCta(mode: string) {
    setCtaMode(mode);
    setForm((f: Form) => ({ ...f, linkUrl: '', priceMode: f.priceMode === 'product' ? 'none' : f.priceMode }));
    setDirty(true);
  }

  // Sayt bilan bir tartib (`sort_order`, keyin id) va bir chegara: faol birinchi 3 tasi.
  const shown = [...others, { ...form, id }]
    .filter((n) => n.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder || (a.id < b.id ? -1 : 1))
    .slice(0, 3);
  const position = shown.findIndex((n) => n.id === id);
  // Narx saytdagidek: qo'lda kiritilgani yoki ko'rinadigan tovarniki; yashirin tovarda narx chiqmaydi.
  const priceUzs = form.priceMode === 'manual' ? form.manualPriceUzs : product?.isActive ? product.minPriceUzs : null;
  const preview: ApiNews = { ...form, id, priceUzs };
  const siteT = translations[localeToLang(lang)];

  async function save() {
    setBusy(true); setError('');
    try {
      if (isNew) {
        await createNews(form);
        setDirty(false);
        toast(t('newsEdit.toastCreated'));
        navigate(LIST, { state: { leave: true } });
      } else {
        // Server manbasiz narx rejimini «ko'rsatilmasin»ga qaytaradi — forma saqlangan holatni ko'rsatsin.
        setForm(withoutId(await updateNews(id, form)));
        setDirty(false);
        toast(t('shared.savedLive'));
      }
    } catch (e) {
      setError(errText(e));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    const ok = await confirm({
      title: t('newsEdit.confirmDelete', { name: form.title }),
      message: t('newsEdit.confirmDeleteMessage'),
      confirmLabel: t('shared.delete'), destructive: true,
    });
    if (!ok) return;
    try {
      await deleteNews(id);
      setDirty(false);
      toast(t('newsEdit.toastDeleted'));
      navigate(LIST, { state: { leave: true } });
    } catch (e) {
      toast(errText(e), 'error');
    }
  }

  /**
   * Tanlangan tildagi bitta maydon. Ruschada bo'sh maydon ichida o'zbekchasi xira ko'rinadi — sayt shuni chiqaradi.
   * Tayyor matn bosilsa ikkala tilga birdan yoziladi.
   */
  function textField(k: TextKey, label: string, hint: string, opts: { textarea?: boolean; required?: boolean; presets?: Preset[] } = {}) {
    const key = lang === 'uz' ? k : RU_KEY[k];
    const fallback = lang === 'ru' && form[key] === '' && form[k] !== '';
    const fill = (uz: string, ru: string) => { setForm((f: Form) => ({ ...f, [k]: uz, [RU_KEY[k]]: ru })); setDirty(true); };
    const chip = 'h-control-sm rounded-full px-3 text-sm font-medium transition-colors duration-150';
    const idle = 'bg-surface-sunken text-text-muted hover:bg-surface-sunken-hover hover:text-text';
    return (
      <div>
        <Field label={label} hint={fallback ? t('newsEdit.ruFallback') : hint} required={opts.required && lang === 'uz'}>
          {opts.textarea
            ? <Textarea value={form[key]} onChange={(v) => set(key, v)} rows={2} placeholder={lang === 'ru' ? form[k] : undefined} />
            : <Input value={form[key]} onChange={(v) => set(key, v)} placeholder={lang === 'ru' ? form[k] : undefined} />}
        </Field>
        {opts.presets && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {opts.presets.map(([uz, ru]) => {
              const on = form[k] === uz && form[RU_KEY[k]] === ru;
              return (
                <button key={uz} type="button" aria-pressed={on} className={`${chip} ${on ? 'bg-accent-soft text-accent-text' : idle}`} onClick={() => fill(uz, ru)}>
                  {lang === 'uz' ? uz : ru}
                </button>
              );
            })}
            {(form[k] !== '' || form[RU_KEY[k]] !== '') && (
              <button type="button" className={`${chip} text-text-faint hover:text-text`} onClick={() => fill('', '')}>{t('newsEdit.presetNone')}</button>
            )}
          </div>
        )}
      </div>
    );
  }

  const canSave = dirty && !busy && form.title.trim() !== '' && form.imageUrl !== '';
  const placeText = shown.length === 1 ? t('newsEdit.place.one') : shown.length === 2 ? t('newsEdit.place.two') : position === 0 ? t('newsEdit.place.threeBig') : t('newsEdit.place.threeSmall');

  return (
    <Page
      title={isNew ? t('newsEdit.newTitle') : form.title || t('newsEdit.untitled')}
      back={LIST}
      dirty={dirty}
      actions={<Button onClick={save} disabled={!canSave}>{busy ? t('shared.saving') : t('shared.save')}</Button>}
    >
      {!loaded && !error ? <Skeleton rows={6} /> : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_440px] xl:items-start">
          {/* Jonli karta: telefonda tepada, `xl`dan o'ng ustunda va aylantirganda joyida turadi (sahifa sarlavhasi ostida). */}
          <div className="stagger xl:sticky xl:top-28 xl:col-start-2 xl:row-start-1" style={delay(0)}>
            <Card icon={Eye} hue="violet" title={t('newsEdit.preview.title')} description={t('newsEdit.preview.description')}>
              {form.imageUrl === '' ? (
                <p className="flex flex-col items-center gap-2 rounded-control bg-surface-sunken px-4 py-10 text-center text-base text-text-muted">
                  <ImageIcon className="size-7 text-text-faint" />{t('newsEdit.preview.noImage')}
                </p>
              ) : (
                /* Saytdagi karta o'zi oq — kulrang karta ichida oq «orolcha» bo'lib turadi (qo'shimcha fon kerak emas).
                   Bosilmaydi: ichidagi tugma havola, tahrir paytida sahifadan chiqarib yubormasin.
                   Kichraytirilgan (`zoom`): karta saytdagi enida chiziladi va ustunga sig'adi — nisbatlar saytdagidek. */
                <div className="pointer-events-none" aria-hidden="true">
                  <div className="mx-auto max-w-[680px] [zoom:0.6]">
                    <StorePreview>
                      <CurrencyProvider key={lang} initial="UZS" rate={0} sum={siteT.sum}>
                        <NewsTile item={preview} locale={lang} t={siteT} layout={position < 0 ? 'stack' : newsLayout(shown.length, position)} />
                      </CurrencyProvider>
                    </StorePreview>
                  </div>
                </div>
              )}
              {position < 0 ? <Note>{t('newsEdit.preview.notOnHome')}</Note> : (
                // Bosh sahifadagi joy sxemasi: karta ko'rinishi (katta yoki yon) yangiliklar soniga bog'liq — nega shundayligi ko'rinsin.
                <div className="rounded-control bg-surface-sunken p-4">
                  <p className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-text">
                    <House weight="fill" className="size-4 text-text-faint" />{t('newsEdit.place.title')}
                  </p>
                  <div className={`grid gap-1.5 ${shown.length > 1 ? 'grid-cols-2' : ''} ${shown.length === 3 ? 'h-28 grid-rows-2' : 'h-16'}`}>
                    {shown.map((n, i) => {
                      const me = n.id === id;
                      return (
                        <div
                          key={n.id}
                          className={`flex min-w-0 flex-col justify-center rounded-item px-2.5 text-sm transition-colors ${shown.length === 3 && i === 0 ? 'row-span-2' : ''} ${
                            me ? 'bg-accent text-text-on-primary' : 'bg-surface-sunken text-text-muted'
                          }`}
                        >
                          {me && <span className="text-xs font-medium text-text-on-primary/75">{t('newsEdit.place.current')}</span>}
                          <span className="truncate font-medium">{n.title || t('newsEdit.untitled')}</span>
                        </div>
                      );
                    })}
                  </div>
                  <p className="mt-3 flex items-start gap-1.5 text-sm leading-relaxed text-text-muted">
                    <Info className="mt-[calc(0.5lh-8px)] size-4 shrink-0 text-text-faint" />{placeText}
                  </p>
                </div>
              )}
            </Card>
          </div>

          <div className="flex min-w-0 flex-col gap-4 xl:col-start-1 xl:row-start-1">
            {error && <FormError text={error} />}

            <div className="stagger" style={delay(1)}>
              <Card icon={Translate} hue="slate" title={t('newsEdit.lang.title')} description={t('newsEdit.lang.description')}>
                <Segmented
                  label={t('newsEdit.lang.title')}
                  value={lang}
                  onChange={setLang}
                  options={[{ id: 'uz', label: t('newsEdit.lang.uz') }, { id: 'ru', label: t('newsEdit.lang.ru') }]}
                />
              </Card>
            </div>

            <div className="stagger" style={delay(2)}>
              <Step n={1} hue="orange" title={t('newsEdit.steps.image')} description={t('newsEdit.image.description')}>
                <ImageUploader label={t('shared.image')} images={form.imageUrl ? [form.imageUrl] : []} onChange={(next) => set('imageUrl', next[0] ?? '')} />
                <div className="rounded-control bg-surface-sunken p-4">
                  <Field label={t('newsEdit.scale.label')} hint={t('newsEdit.scale.hint')}>
                    <span className="flex items-center gap-3">
                      <input
                        type="range"
                        min={NEWS_SCALE_MIN}
                        max={NEWS_SCALE_MAX}
                        step={5}
                        value={form.imageScale}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => set('imageScale', Number(e.target.value))}
                        className="h-11 w-full accent-accent md:h-9"
                      />
                      <span className="inline-flex h-7 min-w-14 items-center justify-center rounded-full bg-surface-sunken px-2 text-base font-semibold tabular-nums text-text">{form.imageScale}%</span>
                    </span>
                  </Field>
                </div>
              </Step>
            </div>

            <div className="stagger" style={delay(3)}>
              <Step n={2} hue="violet" title={t('newsEdit.steps.text')} description={t('newsEdit.text.description')}>
                <div className="flex flex-col gap-5">
                  {textField('title', t('newsEdit.text.titleLabel'), t('newsEdit.text.titleHint'), { required: true })}
                  {textField('text', t('newsEdit.text.textLabel'), t('newsEdit.text.textHint'), { textarea: true })}
                  {textField('badge', t('newsEdit.text.badgeLabel'), t('newsEdit.text.badgeHint'), { presets: BADGES })}
                  {textField('tag', t('newsEdit.text.tagLabel'), t('newsEdit.text.tagHint'), { presets: TAGS })}
                </div>
              </Step>
            </div>

            <div className="stagger" style={delay(4)}>
              <Step n={3} hue="blue" title={t('newsEdit.steps.cta')} description={t('newsEdit.cta.description')}>
                <div className="flex flex-col gap-4">
                  <Segmented
                    label={t('newsEdit.steps.cta')}
                    value={ctaMode}
                    onChange={changeCta}
                    options={[
                      { id: 'product', label: t('newsEdit.cta.product'), icon: Package },
                      { id: 'link', label: t('newsEdit.cta.link'), icon: LinkSimple },
                      { id: 'none', label: t('newsEdit.cta.none'), icon: Prohibit },
                    ]}
                  />
                  {ctaMode === 'none' && <Note>{t('newsEdit.cta.noneNote')}</Note>}
                  {ctaMode === 'link' && (
                    <Field label={t('newsEdit.cta.linkLabel')} hint={t('newsEdit.cta.linkHint')}>
                      <Input value={form.linkUrl} onChange={(v) => set('linkUrl', v)} placeholder="/category/apple" />
                    </Field>
                  )}
                  {ctaMode === 'product' && (linkedId ? (
                    <div className="flex flex-wrap items-center gap-3 rounded-control bg-surface-sunken p-3">
                      <span className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-item bg-surface-sunken">
                        {product ? <img src={product.imageUrl} alt="" className="size-full object-contain p-0.5" /> : <Package className="size-5 text-text-faint" />}
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate text-base font-medium text-text">{product ? product.name : products ? t('newsEdit.cta.missing') : '…'}</span>
                        {product && (
                          <span className="text-sm tabular-nums text-text-muted">
                            {product.isActive ? formatSum(product.minPriceUzs, sum) : t('newsEdit.cta.hidden')}
                          </span>
                        )}
                      </span>
                      <Button variant="outline" size="sm" onClick={() => set('linkUrl', '')}>{t('newsEdit.cta.change')}</Button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <Field label={t('newsEdit.cta.searchLabel')} hint={t('newsEdit.cta.searchHint')}>
                        <span className="relative block">
                          <MagnifyingGlass aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-muted" />
                          <Input value={query} onChange={setQuery} placeholder={t('newsEdit.cta.searchPlaceholder')} className="pl-9" />
                        </span>
                      </Field>
                      {matches.length > 0 && (
                        <div className="flex flex-col overflow-hidden rounded-control bg-surface-sunken">
                          {matches.map((p) => (
                            <button
                              key={p.id}
                              type="button"
                              className="flex items-center gap-3 border-b border-border px-3 py-2 text-left transition-colors last:border-b-0 hover:bg-surface-sunken"
                              onClick={() => { set('linkUrl', `/product/${p.id}`); setQuery(''); }}
                            >
                              <span className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-item bg-surface-sunken">
                                <img src={p.imageUrl} alt="" className="size-full object-contain p-0.5" />
                              </span>
                              <span className="min-w-0 flex-1 truncate text-base text-text">{p.name}</span>
                              {!p.isActive && <Badge>{t('newsEdit.cta.hidden')}</Badge>}
                              <span className="whitespace-nowrap text-sm tabular-nums text-text-muted">{formatSum(p.minPriceUzs, sum)}</span>
                            </button>
                          ))}
                        </div>
                      )}
                      {words.length > 0 && matches.length === 0 && <p className="text-sm text-text-muted">{t('newsEdit.cta.notFound')}</p>}
                    </div>
                  ))}
                  {ctaMode !== 'none' && textField('cta', t('newsEdit.cta.textLabel'), t('newsEdit.cta.textHint'), { presets: CTAS })}
                </div>
              </Step>
            </div>

            <div className="stagger" style={delay(5)}>
              <Step n={4} hue="green" title={t('newsEdit.steps.price')} description={t('newsEdit.price.description')}>
                <div className="flex flex-col gap-4">
                  <Segmented
                    label={t('newsEdit.steps.price')}
                    value={form.priceMode}
                    onChange={(v) => set('priceMode', v as NewsPriceMode)}
                    options={[
                      { id: 'none', label: t('newsEdit.price.none'), icon: EyeSlash },
                      { id: 'product', label: t('newsEdit.price.product'), icon: Package },
                      { id: 'manual', label: t('newsEdit.price.manual'), icon: PencilSimple },
                    ]}
                  />
                  {form.priceMode === 'none' && <Note>{t('newsEdit.price.noneNote')}</Note>}
                  {form.priceMode === 'product' && (
                    <Note>
                      {!linkedId
                        ? t('newsEdit.price.needProduct')
                        : product && !product.isActive
                          ? t('newsEdit.price.hiddenNote')
                          : t('newsEdit.price.productNote', { price: product ? formatSum(product.minPriceUzs, sum) : '…' })}
                    </Note>
                  )}
                  {form.priceMode === 'manual' && (
                    <Field label={t('newsEdit.price.manualLabel')} hint={t('newsEdit.price.manualHint')} className="md:max-w-sm">
                      <PriceInput value={form.manualPriceUzs ?? 0} onChange={(v) => set('manualPriceUzs', v > 0 ? v : null)} placeholder="21 000 000" className={INPUT_CLS} />
                    </Field>
                  )}
                </div>
              </Step>
            </div>

            <div className="stagger" style={delay(6)}>
              <Step n={5} hue="teal" title={t('newsEdit.steps.visibility')}>
                <div className="flex flex-col gap-4">
                  <LiveSwitch on={form.isActive} onChange={(v) => set('isActive', v)} />
                  <Field label={t('shared.sortOrder')} hint={t('newsEdit.visibility.sortHint')} className="md:max-w-xs">
                    <Input type="number" value={String(form.sortOrder)} onChange={(v) => set('sortOrder', Number(v) || 0)} />
                  </Field>
                  {!isNew && (
                    <div className="border-t border-border pt-4">
                      <Button variant="dangerSoft" onClick={remove}><Trash />{t('newsEdit.deleteButton')}</Button>
                    </div>
                  )}
                </div>
              </Step>
            </div>
          </div>
        </div>
      )}
    </Page>
  );
};

export default NewsEdit;
