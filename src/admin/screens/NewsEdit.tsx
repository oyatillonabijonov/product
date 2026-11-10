import { useEffect, useState } from 'react';
import type { FC } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import type { ApiNews, ApiProduct, NewsPriceMode } from '../../../shared/types';
import { NEWS_SCALE_MAX, NEWS_SCALE_MIN, newsProductId } from '../../../shared/news-price';
import { localeToLang, type Locale } from '../../../app/lib/i18n';
import { translations } from '../../locales';
import { CurrencyProvider } from '../../store/CurrencyContext';
import { NewsTile, newsLayout } from '../../store/NewsSection';
import { createNews, deleteNews, listNews, listProducts, updateNews } from '../api';
import { errText } from '../errText';
import ImageUploader from '../ImageUploader';
import PriceInput from '../PriceInput';
import { withoutId } from '../lib/content-form';
import { formatSum } from '../lib/format';
import { Badge, Button, Card, Field, INPUT_CLS, Input, Page, Segmented, Skeleton, SwitchRow, Textarea } from '../ui';
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
    const chip = 'press h-11 rounded-full border border-line px-3.5 text-label text-body hover:bg-fill-2 md:h-9';
    return (
      <div>
        <Field label={label} hint={fallback ? t('newsEdit.ruFallback') : hint} required={opts.required && lang === 'uz'}>
          {opts.textarea
            ? <Textarea value={form[key]} onChange={(v) => set(key, v)} rows={2} placeholder={lang === 'ru' ? form[k] : undefined} />
            : <Input value={form[key]} onChange={(v) => set(key, v)} placeholder={lang === 'ru' ? form[k] : undefined} />}
        </Field>
        {opts.presets && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {opts.presets.map(([uz, ru]) => (
              <button key={uz} type="button" className={chip} onClick={() => fill(uz, ru)}>{lang === 'uz' ? uz : ru}</button>
            ))}
            {(form[k] !== '' || form[RU_KEY[k]] !== '') && (
              <button type="button" className={`${chip} text-muted-2`} onClick={() => fill('', '')}>{t('newsEdit.presetNone')}</button>
            )}
          </div>
        )}
      </div>
    );
  }

  const canSave = dirty && !busy && form.title.trim() !== '' && form.imageUrl !== '';

  return (
    <Page
      title={isNew ? t('newsEdit.newTitle') : form.title || t('newsEdit.untitled')}
      back={LIST}
      dirty={dirty}
      actions={<Button onClick={save} disabled={!canSave}>{busy ? t('shared.saving') : t('shared.save')}</Button>}
    >
      {!loaded && !error ? <Skeleton rows={6} /> : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_460px] lg:items-start lg:gap-6">
          {/* Jonli karta: telefonda tepada, `lg`dan o'ng ustunda va aylantirganda joyida turadi (sahifa sarlavhasi ostida). */}
          <div className="lg:sticky lg:top-32 lg:col-start-2 lg:row-start-1">
            <Card title={t('newsEdit.preview.title')} description={t('newsEdit.preview.description')}>
              {form.imageUrl === '' ? (
                <p className="rounded-lg bg-bg px-4 py-10 text-center text-para text-muted">{t('newsEdit.preview.noImage')}</p>
              ) : (
                // Bosilmaydi: ichidagi tugma havola, tahrir paytida sahifadan chiqarib yubormasin.
                // Kichraytirilgan (`zoom`): karta saytdagi enida chiziladi va ustunga sig'adi — nisbatlar saytdagidek.
                <div className="pointer-events-none rounded-lg bg-bg p-3" aria-hidden="true">
                  <div className="mx-auto max-w-[680px] [zoom:0.6]">
                    <CurrencyProvider key={lang} initial="UZS" rate={0} sum={siteT.sum}>
                      <NewsTile item={preview} locale={lang} t={siteT} layout={position < 0 ? 'stack' : newsLayout(shown.length, position)} />
                    </CurrencyProvider>
                  </div>
                </div>
              )}
              {position < 0 ? <p className="mt-3 text-label text-muted-2">{t('newsEdit.preview.notOnHome')}</p> : (
                // Bosh sahifadagi joy sxemasi: karta ko'rinishi (katta yoki yon) yangiliklar soniga bog'liq — nega shundayligi ko'rinsin.
                <div className="mt-4">
                  <p className="text-label font-medium text-muted">{t('newsEdit.place.title')}</p>
                  <div className={`mt-2 grid gap-1.5 ${shown.length > 1 ? 'grid-cols-2' : ''}`}>
                    {shown.map((n, i) => (
                      <div
                        key={n.id}
                        className={`flex min-h-10 items-center justify-center rounded-xs border-2 px-2 text-label ${
                          shown.length === 3 && i === 0 ? 'row-span-2' : ''
                        } ${n.id === id ? 'border-cta bg-cta/8 font-medium text-primary' : 'border-line text-muted-2'}`}
                      >
                        <span className="truncate">{n.title || t('newsEdit.untitled')}</span>
                      </div>
                    ))}
                  </div>
                  <p className="mt-2 text-label text-muted-2">
                    {shown.length === 1 ? t('newsEdit.place.one') : shown.length === 2 ? t('newsEdit.place.two') : position === 0 ? t('newsEdit.place.threeBig') : t('newsEdit.place.threeSmall')}
                  </p>
                </div>
              )}
            </Card>
          </div>

          <div className="flex min-w-0 flex-col gap-4 lg:col-start-1 lg:row-start-1">
            {error && <p className="text-para text-danger">{error}</p>}

            <Card title={t('newsEdit.lang.title')} description={t('newsEdit.lang.description')}>
              <Segmented
                label={t('newsEdit.lang.title')}
                value={lang}
                onChange={setLang}
                options={[{ id: 'uz', label: t('newsEdit.lang.uz') }, { id: 'ru', label: t('newsEdit.lang.ru') }]}
              />
            </Card>

            <Card title={t('newsEdit.image.title')} description={t('newsEdit.image.description')}>
              <ImageUploader label={t('shared.image')} images={form.imageUrl ? [form.imageUrl] : []} onChange={(next) => set('imageUrl', next[0] ?? '')} />
              <Field label={t('newsEdit.scale.label')} hint={t('newsEdit.scale.hint')} className="mt-4">
                <span className="flex items-center gap-3">
                  <input
                    type="range"
                    min={NEWS_SCALE_MIN}
                    max={NEWS_SCALE_MAX}
                    step={5}
                    value={form.imageScale}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => set('imageScale', Number(e.target.value))}
                    className="h-11 w-full accent-cta md:h-9"
                  />
                  <span className="w-14 text-right text-para tabular-nums text-primary">{form.imageScale}%</span>
                </span>
              </Field>
            </Card>

            <Card title={t('newsEdit.text.title')} description={t('newsEdit.text.description')}>
              <div className="flex flex-col gap-4">
                {textField('title', t('newsEdit.text.titleLabel'), t('newsEdit.text.titleHint'), { required: true })}
                {textField('text', t('newsEdit.text.textLabel'), t('newsEdit.text.textHint'), { textarea: true })}
                {textField('badge', t('newsEdit.text.badgeLabel'), t('newsEdit.text.badgeHint'), { presets: BADGES })}
                {textField('tag', t('newsEdit.text.tagLabel'), t('newsEdit.text.tagHint'), { presets: TAGS })}
              </div>
            </Card>

            <Card title={t('newsEdit.cta.title')} description={t('newsEdit.cta.description')}>
              <div className="flex flex-col gap-4">
                <Segmented
                  label={t('newsEdit.cta.title')}
                  value={ctaMode}
                  onChange={changeCta}
                  options={[
                    { id: 'product', label: t('newsEdit.cta.product') },
                    { id: 'link', label: t('newsEdit.cta.link') },
                    { id: 'none', label: t('newsEdit.cta.none') },
                  ]}
                />
                {ctaMode === 'none' && <p className="text-para text-muted">{t('newsEdit.cta.noneNote')}</p>}
                {ctaMode === 'link' && (
                  <Field label={t('newsEdit.cta.linkLabel')} hint={t('newsEdit.cta.linkHint')}>
                    <Input value={form.linkUrl} onChange={(v) => set('linkUrl', v)} placeholder="/category/apple" />
                  </Field>
                )}
                {ctaMode === 'product' && (linkedId ? (
                  <div className="flex flex-wrap items-center gap-3">
                    {product && <img src={product.imageUrl} alt="" className="size-11 rounded-xs border border-line bg-fill-2 object-cover" />}
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-para text-primary">{product ? product.name : products ? t('newsEdit.cta.missing') : '…'}</span>
                      {product && (
                        <span className="text-label text-muted-2">
                          {product.isActive ? formatSum(product.minPriceUzs, sum) : t('newsEdit.cta.hidden')}
                        </span>
                      )}
                    </span>
                    <Button variant="secondary" onClick={() => set('linkUrl', '')}>{t('newsEdit.cta.change')}</Button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <Field label={t('newsEdit.cta.searchLabel')} hint={t('newsEdit.cta.searchHint')}>
                      <Input value={query} onChange={setQuery} placeholder={t('newsEdit.cta.searchPlaceholder')} />
                    </Field>
                    {matches.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        className="press flex items-center gap-3 rounded-xs px-2 py-1.5 text-left hover:bg-fill-2"
                        onClick={() => { set('linkUrl', `/product/${p.id}`); setQuery(''); }}
                      >
                        <img src={p.imageUrl} alt="" className="size-9 rounded-xs border border-line bg-fill-2 object-cover" />
                        <span className="min-w-0 flex-1 truncate text-para text-primary">{p.name}</span>
                        {!p.isActive && <Badge>{t('newsEdit.cta.hidden')}</Badge>}
                        <span className="text-label text-muted-2">{formatSum(p.minPriceUzs, sum)}</span>
                      </button>
                    ))}
                    {words.length > 0 && matches.length === 0 && <p className="text-label text-muted-2">{t('newsEdit.cta.notFound')}</p>}
                  </div>
                ))}
                {ctaMode !== 'none' && textField('cta', t('newsEdit.cta.textLabel'), t('newsEdit.cta.textHint'), { presets: CTAS })}
              </div>
            </Card>

            <Card title={t('newsEdit.price.title')} description={t('newsEdit.price.description')}>
              <div className="flex flex-col gap-4">
                <Segmented
                  label={t('newsEdit.price.title')}
                  value={form.priceMode}
                  onChange={(v) => set('priceMode', v as NewsPriceMode)}
                  options={[
                    { id: 'none', label: t('newsEdit.price.none') },
                    { id: 'product', label: t('newsEdit.price.product') },
                    { id: 'manual', label: t('newsEdit.price.manual') },
                  ]}
                />
                {form.priceMode === 'none' && <p className="text-para text-muted">{t('newsEdit.price.noneNote')}</p>}
                {form.priceMode === 'product' && (
                  <p className="text-para text-muted">
                    {!linkedId
                      ? t('newsEdit.price.needProduct')
                      : product && !product.isActive
                        ? t('newsEdit.price.hiddenNote')
                        : t('newsEdit.price.productNote', { price: product ? formatSum(product.minPriceUzs, sum) : '…' })}
                  </p>
                )}
                {form.priceMode === 'manual' && (
                  <Field label={t('newsEdit.price.manualLabel')} hint={t('newsEdit.price.manualHint')}>
                    <PriceInput value={form.manualPriceUzs ?? 0} onChange={(v) => set('manualPriceUzs', v > 0 ? v : null)} placeholder="21 000 000" className={INPUT_CLS} />
                  </Field>
                )}
              </div>
            </Card>

            <Card title={t('newsEdit.visibility.title')}>
              <div className="divide-y divide-line">
                <SwitchRow label={t('shared.showOnSite')} on={form.isActive} onChange={(v) => set('isActive', v)} />
              </div>
              <Field label={t('shared.sortOrder')} hint={t('newsEdit.visibility.sortHint')} className="mt-4 max-w-xs">
                <Input type="number" value={String(form.sortOrder)} onChange={(v) => set('sortOrder', Number(v) || 0)} />
              </Field>
            </Card>

            {!isNew && (
              <Card title={t('shared.dangerZone')}>
                <Button variant="destructive" onClick={remove}>{t('newsEdit.deleteButton')}</Button>
              </Card>
            )}
          </div>
        </div>
      )}
    </Page>
  );
};

export default NewsEdit;
