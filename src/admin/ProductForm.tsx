import { useEffect, useState } from 'react';
import type { FC } from 'react';
import type { ApiBrand, ApiCategory, ApiDeviceModel, ApiProduct, ApiSpec, Category, Condition } from '../../shared/types';
import { deriveLegacyCategory } from '../../shared/legacy-category';
import { createProduct, getProductDetail, listBrands, listCategories, listDeviceModels, updateProduct, uploadImage } from './api';
import type { AdminVariantInput } from './api';
import ModelCombobox from './ModelCombobox';
import PriceInput from './PriceInput';
import ImageUploader from './ImageUploader';
import { generateVariants } from './lib/variant-gen';
import { normalizeImage } from './lib/image-normalize';
import { modelToSpecs, mergeSpecs } from './lib/models';
import { errText } from './errText';

const STORAGE_VALUES = ['64GB', '128GB', '256GB', '512GB', '1TB', '2TB'];
const COLOR_VALUES = ['Qora', 'Oq', 'Kulrang', "Ko'k", 'Yashil', 'Qizil', 'Tillarang', 'Pushti'];
/** Variant yorlig'i — o'qlar doim shu tartibda (Xotira · Rang). */
const AXES = ['Xotira', 'Rang'];
const variantLabel = (v: AdminVariantInput) =>
  AXES.map((ax) => v.optionValues.find((ov) => ov.optionName === ax)?.value).filter(Boolean).join(' · ');

interface FormState {
  name: string;
  category: Category;
  categoryId: string | null;
  condition: Condition;
  conditionNote: string;
  cashPriceUzs: number;
  oldPriceUzs: number;
  description: string;
  imageUrl: string;
  images: string[];
  specs: ApiSpec[];
  sortOrder: number;
  isActive: boolean;
  brandId: string | null;
  slug: string;
  options: { name: string; values: string[] }[];
  variants: AdminVariantInput[];
}

const empty: FormState = {
  name: '', category: 'iphone', categoryId: null, condition: 'yangi', conditionNote: '',
  cashPriceUzs: 0, oldPriceUzs: 0, description: '', imageUrl: '', images: [], specs: [], sortOrder: 0, isActive: true,
  brandId: null, slug: '', options: [], variants: [],
};

const ProductForm: FC<{
  initial: ApiProduct | null;
  onSaved: () => void;
  onCancel: () => void;
}> = ({ initial, onSaved, onCancel }) => {
  const [form, setForm] = useState<FormState>(empty);
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [brands, setBrands] = useState<ApiBrand[]>([]);
  const [models, setModels] = useState<ApiDeviceModel[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [dirty, setDirty] = useState(false);
  // Tahrirda detail yuklanmaguncha saqlash bloklanadi — bo'sh forma ustidan
  // PUT (replace-all) mavjud mahsulotni o'chirib yuborardi.
  const [loadState, setLoadState] = useState<'ready' | 'loading' | 'error'>('ready');
  const [loadRetry, setLoadRetry] = useState(0);
  const [colorDraft, setColorDraft] = useState('');
  const [busyRow, setBusyRow] = useState<number | null>(null);

  useEffect(() => { listCategories().then(setCategories).catch(() => setError('Kategoriyalar yuklanmadi')); }, []);
  useEffect(() => { listBrands().then(setBrands).catch(() => setError('Brendlar yuklanmadi')); }, []);
  useEffect(() => { listDeviceModels().then(setModels).catch(() => {}); }, []);

  // Saqlanmagan o'zgarish bo'lsa sahifa yopilishi/yangilanishida ogohlantirish
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  useEffect(() => {
    if (!initial) { setForm(empty); setLoadState('ready'); return; }
    let stale = false; // tez ketma-ket ochilganda eski javob formani to'ldirmasin
    setLoadState('loading');
    getProductDetail(initial.id).then((d) => {
      if (stale) return;
      const gallery = d.images.filter((u) => u !== d.imageUrl);
      const optionValueMap = new Map<string, { optionName: string; value: string }>();
      for (const o of d.options) {
        for (const v of o.values) optionValueMap.set(v.id, { optionName: o.name, value: v.value });
      }
      setForm({
        name: d.name, category: d.category, categoryId: d.categoryId, condition: d.condition,
        conditionNote: d.conditionNote ?? '', cashPriceUzs: d.cashPriceUzs, oldPriceUzs: d.oldPriceUzs ?? 0,
        description: d.description ?? '', imageUrl: d.imageUrl, images: gallery, specs: d.specs,
        sortOrder: d.sortOrder, isActive: d.isActive,
        brandId: d.brandId, slug: d.slug ?? '',
        options: d.options.map((o) => ({ name: o.name, values: o.values.map((v) => v.value) })),
        variants: d.variants.map((v) => ({
          sku: v.sku, cashPriceUzs: v.cashPriceUzs, oldPriceUzs: v.oldPriceUzs, imageUrl: v.imageUrl, inStock: v.inStock,
          optionValues: v.optionValueIds.map((id) => optionValueMap.get(id)).filter((x): x is { optionName: string; value: string } => x !== undefined),
        })),
      });
      setLoadState('ready');
    }).catch(() => { if (!stale) setLoadState('error'); });
    return () => { stale = true; };
  }, [initial, loadRetry]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setDirty(true);
  }

  function pickModel(m: ApiDeviceModel) {
    setDirty(true);
    setForm((f) => ({
      ...f,
      name: m.name,
      brandId: m.brandId,
      categoryId: m.categoryId,
      category: m.legacyCategory,
      specs: mergeSpecs(f.specs, modelToSpecs(m)),
    }));
  }

  /** Bitta o'q (Xotira/Rang) qiymatlarini yangilab, variantlarni qayta generatsiya qiladi. */
  function setAxisValues(f: FormState, axis: string, values: string[]): FormState {
    const others = f.options.filter((o) => o.name !== axis);
    const options = values.length ? [...others, { name: axis, values }] : others;
    return { ...f, options, variants: generateVariants(options, f.variants) };
  }

  function toggleStorage(v: string) {
    setDirty(true);
    setForm((f) => {
      const current = f.options.find((o) => o.name === 'Xotira')?.values ?? [];
      const next = (current.includes(v) ? current.filter((x) => x !== v) : [...current, v])
        .sort((a, b) => STORAGE_VALUES.indexOf(a) - STORAGE_VALUES.indexOf(b));
      return setAxisValues(f, 'Xotira', next);
    });
  }

  function toggleColor(v: string) {
    setDirty(true);
    setForm((f) => {
      const current = f.options.find((o) => o.name === 'Rang')?.values ?? [];
      const next = current.includes(v) ? current.filter((x) => x !== v) : [...current, v];
      return setAxisValues(f, 'Rang', next);
    });
  }

  function addCustomColor() {
    const c = colorDraft.trim();
    setColorDraft('');
    if (!c) return;
    setDirty(true);
    setForm((f) => {
      const current = f.options.find((o) => o.name === 'Rang')?.values ?? [];
      if (current.includes(c)) return f;
      return setAxisValues(f, 'Rang', [...current, c]);
    });
  }

  function updateVariant(i: number, patch: Partial<AdminVariantInput>) {
    setDirty(true);
    setForm((f) => ({ ...f, variants: f.variants.map((v, j) => (j === i ? { ...v, ...patch } : v)) }));
  }

  async function uploadVariantImage(i: number, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusyRow(i);
    try {
      const { imageUrl } = await uploadImage(await normalizeImage(file));
      updateVariant(i, { imageUrl });
    } finally {
      setBusyRow(null);
    }
  }

  async function save() {
    if (!form.name.trim()) { setError('Mahsulot nomini kiriting.'); return; }
    if (!(form.cashPriceUzs > 0 || form.variants.some((v) => v.cashPriceUzs > 0))) {
      setError('Naqd narx yoki kamida bitta variant narxini kiriting.');
      return;
    }
    // Option bor-u, birorta variant narxlanmagan bo'lsa — mahsulot sahifasida
    // ishlamaydigan chiplar chiqadi; jim saqlamaymiz.
    if (
      form.options.some((o) => o.name.trim() && o.values.length) &&
      !form.variants.some((v) => v.cashPriceUzs > 0)
    ) {
      setError("Variant narxlarini kiriting yoki o'lchovlarni olib tashlang.");
      return;
    }
    setBusy(true);
    setError('');
    try {
      const pricedVariants = form.variants.filter((v) => v.cashPriceUzs > 0);
      const cashPriceUzs =
        form.cashPriceUzs > 0
          ? form.cashPriceUzs
          : pricedVariants.length
            ? Math.min(...pricedVariants.map((v) => v.cashPriceUzs))
            : 0;
      const payload = {
        name: form.name, category: form.category, categoryId: form.categoryId, condition: form.condition,
        conditionNote: form.conditionNote || null, cashPriceUzs,
        oldPriceUzs: form.oldPriceUzs > 0 ? form.oldPriceUzs : null, description: form.description || null,
        imageUrl: form.imageUrl, images: form.images,
        specs: form.specs.filter((s) => s.label.trim() !== '' && s.value.trim() !== ''),
        sortOrder: form.sortOrder, isActive: form.isActive,
        brandId: form.brandId, slug: form.slug || null,
        options: form.options.filter((o) => o.name.trim() && o.values.length),
        variants: form.variants.filter((v) => v.cashPriceUzs > 0),
      };
      if (initial) await updateProduct(initial.id, payload);
      else await createProduct(payload);
      setDirty(false);
      onSaved();
    } catch (err) {
      setError(errText(err));
    } finally {
      setBusy(false);
    }
  }

  const input = 'w-full border border-line rounded-xl px-3 py-2 focus:outline-none focus:border-accent';

  if (initial && loadState !== 'ready') {
    return (
      <div className="bg-white rounded-[20px] p-6 mb-6 shadow-apple">
        <h3 className="font-semibold mb-4">Mahsulotni tahrirlash</h3>
        {loadState === 'loading' ? (
          <div className="text-[14px] text-muted">Yuklanmoqda…</div>
        ) : (
          <div className="text-[14px] text-danger">
            Mahsulot ma'lumotlari yuklanmadi — saqlash bloklandi.
            <button onClick={() => setLoadRetry((r) => r + 1)} className="ml-2 font-semibold underline underline-offset-2">Qayta urinish</button>
          </div>
        )}
        <button onClick={onCancel} className="mt-4 px-6 py-2.5 text-muted font-semibold rounded-full border border-line">Bekor qilish</button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-[20px] p-6 mb-6 shadow-apple">
      <h3 className="font-semibold mb-4">{initial ? 'Mahsulotni tahrirlash' : 'Yangi mahsulot'}</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <label className="text-[13px] text-muted">Nomi / Model qidirish <span className="text-danger">*</span>
          <ModelCombobox
            models={models}
            value={form.name}
            onChange={(t) => set('name', t)}
            onPick={pickModel}
            className={input}
          />
        </label>
        <label className="text-[13px] text-muted">Brend
          <select className={input} value={form.brandId ?? ''} onChange={(e) => set('brandId', e.target.value || null)}>
            <option value="">— tanlang —</option>
            {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </label>
        <label className="text-[13px] text-muted">Kategoriya (storefront)
          <select
            className={input}
            value={form.categoryId ?? ''}
            onChange={(e) => {
              setDirty(true);
              setForm((f) => ({ ...f, categoryId: e.target.value || null, category: deriveLegacyCategory(e.target.value || null) }));
            }}
          >
            <option value="">— tanlang —</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <label className="text-[13px] text-muted">Naqd narx (so'm) <span className="text-danger">*</span>
          <PriceInput className={input} value={form.cashPriceUzs} onChange={(v) => set('cashPriceUzs', v)} />
        </label>
        <label className="text-[13px] text-muted">Eski narx (ixtiyoriy)
          <PriceInput className={input} value={form.oldPriceUzs} onChange={(v) => set('oldPriceUzs', v)} />
        </label>
        <label className="flex items-center gap-2 text-[14px] text-primary">
          <input
            type="checkbox"
            checked={form.condition === 'ishlatilgan'}
            onChange={(e) => {
              // Ishlatilgan — bitta dona, variant yo'q. Yangiga qaytса ham chiplardan qayta yasaladi.
              setDirty(true);
              setForm((f) => (e.target.checked
                ? { ...f, condition: 'ishlatilgan', options: [], variants: [] }
                : { ...f, condition: 'yangi' }));
            }}
          />
          Ishlatilgan
        </label>
      </div>

      {form.condition === 'yangi' && (
        <div className="mt-5 border border-line rounded-2xl p-4">
          <div className="text-[14px] font-semibold">Variantlar</div>
          <div className="text-[12px] text-muted mb-3">Xotira va rangni tanlang — har birikma alohida narxli variant bo'ladi. Tanlamasangiz, yuqoridagi bitta narx ishlaydi (aksessuar uchun).</div>

          <div className="text-[13px] text-muted mb-2">Xotira</div>
          <div className="flex flex-wrap gap-2">
            {STORAGE_VALUES.map((v) => {
              const selected = (form.options.find((o) => o.name === 'Xotira')?.values ?? []).includes(v);
              return (
                <button key={v} type="button" onClick={() => toggleStorage(v)}
                  className={`rounded-full px-4 py-1.5 text-[13px] font-semibold border transition-colors ${selected ? 'bg-accent text-white border-accent' : 'border-line text-primary hover:border-accent'}`}>
                  {v}
                </button>
              );
            })}
          </div>

          <div className="text-[13px] text-muted mb-2 mt-4">Rang</div>
          <div className="flex flex-wrap gap-2 items-center">
            {(() => {
              const cur = form.options.find((o) => o.name === 'Rang')?.values ?? [];
              const custom = cur.filter((c) => !COLOR_VALUES.includes(c));
              return [...COLOR_VALUES, ...custom].map((c) => {
                const selected = cur.includes(c);
                return (
                  <button key={c} type="button" onClick={() => toggleColor(c)}
                    className={`rounded-full px-4 py-1.5 text-[13px] font-semibold border transition-colors ${selected ? 'bg-accent text-white border-accent' : 'border-line text-primary hover:border-accent'}`}>
                    {c}
                  </button>
                );
              });
            })()}
            <input
              placeholder="+ boshqa rang"
              className="border border-line rounded-full px-3 py-1.5 text-[13px] w-32 focus:outline-none focus:border-accent"
              value={colorDraft}
              onChange={(e) => setColorDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomColor(); } }}
              onBlur={addCustomColor}
            />
          </div>

          {form.variants.length > 0 && (
            <div className="mt-4">
              <div className="text-[13px] text-muted mb-2">Har variant narxi va rasmi</div>
              <div className="space-y-2">
                {form.variants.map((v, i) => (
                  <div key={i} className="flex items-center gap-3 border border-line rounded-xl p-2.5 flex-wrap">
                    <span className="text-[13px] font-semibold min-w-[110px]">{variantLabel(v)}</span>
                    <PriceInput placeholder="Narx" className="w-40 border border-line rounded-xl px-3 py-2 focus:outline-none focus:border-accent" value={v.cashPriceUzs} onChange={(n) => updateVariant(i, { cashPriceUzs: n })} />
                    {v.imageUrl ? <img src={v.imageUrl} alt="" className="w-10 h-10 object-contain rounded-lg bg-bg border border-line" /> : null}
                    <label className={`text-[13px] font-semibold cursor-pointer ${busyRow === i ? 'text-muted' : 'text-accent'}`}>
                      {busyRow === i ? 'Yuklanmoqda…' : v.imageUrl ? 'Rasmni almashtirish' : '+ rasm'}
                      <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" disabled={busyRow === i} onChange={(e) => uploadVariantImage(i, e)} />
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="mt-4">
        <ImageUploader
          label="Asosiy rasm"
          images={form.imageUrl ? [form.imageUrl] : []}
          onChange={(next) => set('imageUrl', next[0] ?? '')}
        />
      </div>

      <div className="mt-4">
        <ImageUploader
          label="Galereya (qo'shimcha rasmlar)"
          images={form.images}
          onChange={(next) => set('images', next)}
          multiple
          reorderable
        />
      </div>

      <div className="mt-4">
        <div className="text-[13px] text-muted mb-2">Xususiyatlar</div>
        <div className="space-y-2">
          {form.specs.map((s, i) => (
            <div key={i} className="flex gap-2">
              <input placeholder="Nomi (Xotira)" className={input} value={s.label} onChange={(e) => set('specs', form.specs.map((x, j) => j === i ? { ...x, label: e.target.value } : x))} />
              <input placeholder="Qiymati (256GB)" className={input} value={s.value} onChange={(e) => set('specs', form.specs.map((x, j) => j === i ? { ...x, value: e.target.value } : x))} />
              <button onClick={() => set('specs', form.specs.filter((_, j) => j !== i))} className="text-danger px-2">×</button>
            </div>
          ))}
        </div>
        <button onClick={() => set('specs', [...form.specs, { label: '', value: '' }])} className="text-[13px] text-accent font-semibold mt-2">+ xususiyat qo'shish</button>
      </div>

      <label className="mt-4 flex items-center gap-2 text-[14px]">
        <input type="checkbox" checked={form.isActive} onChange={(e) => set('isActive', e.target.checked)} />
        Saytda ko'rsatilsin
      </label>

      <div className="sticky bottom-0 -mx-6 -mb-6 mt-6 px-6 py-4 bg-white/95 backdrop-blur border-t border-line rounded-b-[20px] flex flex-wrap items-center gap-3">
        <button onClick={save} disabled={busy} className="px-6 py-2.5 bg-accent text-white font-semibold rounded-full disabled:opacity-60">{busy ? 'Saqlanmoqda…' : 'Saqlash'}</button>
        <button onClick={() => { if (!dirty || window.confirm("Saqlanmagan o'zgarishlar bor. Bekor qilinsinmi?")) onCancel(); }} className="px-6 py-2.5 text-muted font-semibold rounded-full">Bekor qilish</button>
        {error && <span className="text-[13px] text-danger">{error}</span>}
      </div>
    </div>
  );
};

export default ProductForm;
