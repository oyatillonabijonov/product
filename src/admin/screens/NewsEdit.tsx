import { useEffect, useState } from 'react';
import type { FC } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import type { ApiNews, ApiProduct } from '../../../shared/types';
import { NEWS_SCALE_MAX, NEWS_SCALE_MIN, PRICE_TOKEN, newsProductId } from '../../../shared/news-price';
import { localeToLang } from '../../../app/lib/i18n';
import { translations } from '../../locales';
import { CurrencyProvider } from '../../store/CurrencyContext';
import { NewsTile, newsLayout } from '../../store/NewsSection';
import { createNews, deleteNews, listNews, listProducts, updateNews } from '../api';
import { errText } from '../errText';
import ImageUploader from '../ImageUploader';
import { withoutId } from '../lib/content-form';
import { formatSum } from '../lib/format';
import { Badge, Button, Card, Field, Input, LangPair, Page, Skeleton, SwitchRow } from '../ui';
import { useConfirm } from '../ui/confirm';
import { useToast } from '../ui/toast';

const LIST = '/admin/content/news';

type Form = Omit<ApiNews, 'id'>;
const EMPTY: Form = {
  badge: '', badgeRu: '', tag: '', tagRu: '', title: '', titleRu: '', text: '', textRu: '',
  cta: '', ctaRu: '', linkUrl: '', imageUrl: '', imageScale: 100, sortOrder: 0, isActive: true,
};

/** Ko'rinish saytdagi kartaning o'zi (`NewsTile`) — o'zbekcha matn bilan. */
const SITE_T = translations[localeToLang('uz')];

/** Yangilik (landing tile'i) tahriri. `id` = 'new' yoki yangilik id'si. */
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
  const [rawProducts, setProducts] = useState([] as ApiProduct[]);
  const products = rawProducts as ApiProduct[];
  const [rawQuery, setQuery] = useState('');
  const query = rawQuery as string;

  useEffect(() => {
    listNews().then((all) => {
      setOthers(all.filter((x) => x.id !== id));
      if (isNew) return;
      const n = all.find((x) => x.id === id);
      if (!n) { setError(t('newsEdit.notFound')); return; }
      setForm(withoutId(n));
      setLoaded(true);
    }).catch(() => { if (!isNew) setError(t('shared.loadError')); });
    // Tovarlar yuklanmasa forma baribir ishlaydi — faqat qidiruv bo'sh qoladi.
    listProducts().then(setProducts).catch(() => {});
  }, [id, isNew]);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => { setForm((f: Form) => ({ ...f, [k]: v })); setDirty(true); };

  const product = products.find((p) => p.id === newsProductId(form.linkUrl));
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const matches = words.length === 0 ? [] : products
    .filter((p) => words.every((w) => p.name.toLowerCase().includes(w)))
    .sort((a, b) => Number(b.isActive) - Number(a.isActive))
    .slice(0, 8);
  const priceLinked = form.text.includes(PRICE_TOKEN);

  /** `{narx}` ni matn boshiga qo'yadi. Ruscha matn bo'sh bo'lsa tegilmaydi — sayt u holda o'zbekchasini ko'rsatadi. */
  function addPrice() {
    setForm((f: Form) => ({
      ...f,
      text: f.text.includes(PRICE_TOKEN) ? f.text : `${PRICE_TOKEN} dan. ${f.text}`.trim(),
      textRu: f.textRu === '' || f.textRu.includes(PRICE_TOKEN) ? f.textRu : `От ${PRICE_TOKEN}. ${f.textRu}`,
    }));
    setDirty(true);
  }

  // Sayt bilan bir tartib (`sort_order`, keyin id) va bir chegara: faol birinchi 3 tasi.
  const shown = [...others, { ...form, id }]
    .filter((n) => n.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder || (a.id < b.id ? -1 : 1))
    .slice(0, 3);
  const position = shown.findIndex((n) => n.id === id);
  // Narx saytdagidek: faqat tovar ko'rinadigan bo'lsa; aks holda `{narx}`li gap tushib qoladi.
  const preview: ApiNews = { ...form, id, priceUzs: product?.isActive ? product.minPriceUzs : null };

  async function save() {
    setBusy(true); setError('');
    try {
      if (isNew) {
        await createNews(form);
        setDirty(false);
        toast(t('newsEdit.toastCreated'));
        navigate(LIST, { state: { leave: true } });
      } else {
        await updateNews(id, form);
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

  const canSave = dirty && !busy && form.title.trim() !== '' && form.imageUrl !== '';

  return (
    <Page
      title={isNew ? t('newsEdit.newTitle') : form.title || t('newsEdit.untitled')}
      back={LIST}
      dirty={dirty}
      actions={<Button onClick={save} disabled={!canSave}>{busy ? t('shared.saving') : t('shared.save')}</Button>}
    >
      {!loaded && !error ? <Skeleton rows={6} /> : (
        <div className="flex flex-col gap-4">
          {error && <p className="text-para text-danger">{error}</p>}
          <Card title={t('newsEdit.preview.title')} description={t('newsEdit.preview.description')}>
            {form.imageUrl === '' ? (
              <p className="rounded-lg bg-bg px-4 py-10 text-center text-para text-muted">{t('newsEdit.preview.noImage')}</p>
            ) : (
              // Bosilmaydi: ichidagi tugma havola, tahrir paytida sahifadan chiqarib yubormasin.
              // Kichraytirilgan (`zoom`): karta va ostidagi surgich bitta ekranga sig'adi, nisbatlar saytdagidek qoladi.
              <div className="pointer-events-none rounded-lg bg-bg p-4" aria-hidden="true">
                <div className="mx-auto max-w-[760px] [zoom:0.7]">
                  <CurrencyProvider initial="UZS" rate={0} sum={SITE_T.sum}>
                    <NewsTile item={preview} locale="uz" t={SITE_T} layout={position < 0 ? 'stack' : newsLayout(shown.length, position)} />
                  </CurrencyProvider>
                </div>
              </div>
            )}
            {position < 0 && <p className="mt-3 text-label text-muted-2">{t('newsEdit.preview.notOnHome')}</p>}
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
          <Card title={t('shared.image')} description={t('newsEdit.image.description')}>
            <ImageUploader label={t('shared.image')} images={form.imageUrl ? [form.imageUrl] : []} onChange={(next) => set('imageUrl', next[0] ?? '')} />
          </Card>
          <Card title={t('newsEdit.product.title')} description={t('newsEdit.product.description')}>
            {product ? (
              <div className="flex flex-wrap items-center gap-3">
                <img src={product.imageUrl} alt="" className="size-11 rounded-xs border border-line bg-fill-2 object-cover" />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-para text-primary">{product.name}</span>
                  <span className="text-label text-muted-2">
                    {product.isActive
                      ? t('newsEdit.product.currentPrice', { price: formatSum(product.minPriceUzs, sum) })
                      : t('newsEdit.product.hiddenNote')}
                  </span>
                </span>
                {priceLinked
                  ? <Badge tone="ok">{t('newsEdit.product.priceLinked')}</Badge>
                  : <Button variant="secondary" onClick={addPrice}>{t('newsEdit.product.addPrice')}</Button>}
                <Button variant="quiet" onClick={() => set('linkUrl', '')}>{t('newsEdit.product.unlink')}</Button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <Input value={query} onChange={setQuery} placeholder={t('newsEdit.product.searchPlaceholder')} />
                {matches.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className="press flex items-center gap-3 rounded-xs px-2 py-1.5 text-left hover:bg-fill-2"
                    onClick={() => { set('linkUrl', `/product/${p.id}`); setQuery(''); }}
                  >
                    <img src={p.imageUrl} alt="" className="size-9 rounded-xs border border-line bg-fill-2 object-cover" />
                    <span className="min-w-0 flex-1 truncate text-para text-primary">{p.name}</span>
                    {!p.isActive && <Badge>{t('newsEdit.product.hidden')}</Badge>}
                    <span className="text-label text-muted-2">{formatSum(p.minPriceUzs, sum)}</span>
                  </button>
                ))}
                {words.length > 0 && matches.length === 0 && <p className="text-label text-muted-2">{t('newsEdit.product.notFound')}</p>}
              </div>
            )}
          </Card>
          <Card title={t('shared.text')}>
            <div className="flex flex-col gap-4">
              <LangPair label={t('shared.title')} required hint={t('newsEdit.text.titleHint')} uz={form.title} ru={form.titleRu} onUz={(v) => set('title', v)} onRu={(v) => set('titleRu', v)} />
              <LangPair label={t('shared.text')} kind="textarea" rows={2} hint={t('newsEdit.text.textHint')} uz={form.text} ru={form.textRu} onUz={(v) => set('text', v)} onRu={(v) => set('textRu', v)} />
              <LangPair label={t('newsEdit.text.badgeLabel')} hint={t('newsEdit.text.badgeHint')} uz={form.badge} ru={form.badgeRu} onUz={(v) => set('badge', v)} onRu={(v) => set('badgeRu', v)} />
              <LangPair label={t('newsEdit.text.tagLabel')} hint={t('newsEdit.text.tagHint')} uz={form.tag} ru={form.tagRu} onUz={(v) => set('tag', v)} onRu={(v) => set('tagRu', v)} />
              <LangPair label={t('newsEdit.text.ctaLabel')} hint={t('newsEdit.text.ctaHint')} uz={form.cta} ru={form.ctaRu} onUz={(v) => set('cta', v)} onRu={(v) => set('ctaRu', v)} />
            </div>
          </Card>
          <Card title={t('newsEdit.linkAndVisibility')}>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label={t('shared.link')} hint={t('newsEdit.linkHint')}>
                <Input value={form.linkUrl} onChange={(v) => set('linkUrl', v)} placeholder="/category/apple?tur=iphone" />
              </Field>
              <Field label={t('shared.sortOrder')} hint={t('newsEdit.sortHint')}>
                <Input type="number" value={String(form.sortOrder)} onChange={(v) => set('sortOrder', Number(v) || 0)} />
              </Field>
            </div>
            <div className="mt-2 divide-y divide-line">
              <SwitchRow label={t('shared.showOnSite')} on={form.isActive} onChange={(v) => set('isActive', v)} />
            </div>
          </Card>
          {!isNew && (
            <Card title={t('shared.dangerZone')}>
              <Button variant="destructive" onClick={remove}>{t('newsEdit.deleteButton')}</Button>
            </Card>
          )}
        </div>
      )}
    </Page>
  );
};

export default NewsEdit;
