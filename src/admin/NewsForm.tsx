import { useState } from 'react';
import type { FC } from 'react';
import type { ApiNews } from '../../shared/types';
import { createNews, updateNews } from './api';
import { errText } from './errText';
import ImageUploader from './ImageUploader';

const input = 'rounded-sm w-full border border-line-2 px-3 py-2 text-[14px]';

type Form = Omit<ApiNews, 'id'>;

/** uz/ru juftligi bitta qatorda — chapda o'zbekcha, o'ngda ruscha. */
const Pair: FC<{ label: string; hint?: string; uz: string; ru: string; onUz: (v: string) => void; onRu: (v: string) => void }> = ({
  label, hint, uz, ru, onUz, onRu,
}) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
    <label className="text-[13px] text-muted">{label} (uz){hint && <span className="text-muted-2"> — {hint}</span>}
      <input value={uz} onChange={(e) => onUz(e.target.value)} className={input} />
    </label>
    <label className="text-[13px] text-muted">{label} (ru)
      <input value={ru} onChange={(e) => onRu(e.target.value)} className={input} />
    </label>
  </div>
);

const NewsForm: FC<{ initial: ApiNews | null; onSaved: () => void; onCancel: () => void }> = ({ initial, onSaved, onCancel }) => {
  const [form, setForm] = useState<Form>({
    badge: initial?.badge ?? '', badgeRu: initial?.badgeRu ?? '',
    tag: initial?.tag ?? '', tagRu: initial?.tagRu ?? '',
    title: initial?.title ?? '', titleRu: initial?.titleRu ?? '',
    text: initial?.text ?? '', textRu: initial?.textRu ?? '',
    cta: initial?.cta ?? '', ctaRu: initial?.ctaRu ?? '',
    linkUrl: initial?.linkUrl ?? '', imageUrl: initial?.imageUrl ?? '',
    sortOrder: initial?.sortOrder ?? 0, isActive: initial?.isActive ?? true,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const f = form as Form;
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm({ ...f, [k]: v });

  async function save() {
    if (!f.title.trim()) { setError('Sarlavha majburiy'); return; }
    if (!f.imageUrl) { setError('Rasm majburiy'); return; }
    setBusy(true); setError('');
    try {
      if (initial) await updateNews(initial.id, f);
      else await createNews(f);
      onSaved();
    } catch (e) { setError(errText(e)); }
    finally { setBusy(false); }
  }

  return (
    <div className="rounded-md bg-white p-5 mb-4 space-y-3">
      <h3 className="font-semibold">{initial ? 'Yangilikni tahrirlash' : 'Yangi yangilik'}</h3>

      <ImageUploader
        label="Rasm — shaffof fonli PNG/WebP (mahsulot renderi), qorong'i temada ham toza turadi"
        images={f.imageUrl ? [f.imageUrl] : []}
        onChange={(next) => set('imageUrl', next[0] ?? '')}
      />

      <Pair label="Sarlavha" uz={f.title} ru={f.titleRu} onUz={(v) => set('title', v)} onRu={(v) => set('titleRu', v)} />
      <Pair label="Matn" hint="bir-ikki qator" uz={f.text} ru={f.textRu} onUz={(v) => set('text', v)} onRu={(v) => set('textRu', v)} />
      <Pair label="Yorliq" hint="to'q sariq, masalan «Yangi»" uz={f.badge} ru={f.badgeRu} onUz={(v) => set('badge', v)} onRu={(v) => set('badgeRu', v)} />
      <Pair label="Teg" hint="yashil, masalan «Tez orada»" uz={f.tag} ru={f.tagRu} onUz={(v) => set('tag', v)} onRu={(v) => set('tagRu', v)} />
      <Pair label="Tugma matni" hint="bo'sh bo'lsa «Batafsil»" uz={f.cta} ru={f.ctaRu} onUz={(v) => set('cta', v)} onRu={(v) => set('ctaRu', v)} />

      <label className="block text-[13px] text-muted">Havola — bo'sh bo'lsa tugma chiqmaydi
        <input value={f.linkUrl} onChange={(e) => set('linkUrl', e.target.value)} placeholder="masalan: /category/apple?tur=iphone" className={input} />
      </label>

      <div className="flex flex-wrap items-center gap-4">
        <label className="text-[13px] text-muted">Tartib
          <input type="number" value={f.sortOrder} onChange={(e) => set('sortOrder', Number(e.target.value))} className="rounded-sm ml-2 w-20 border border-line-2 px-2 py-1.5" />
        </label>
        <label className="text-[13px] text-muted flex items-center gap-2">
          <input type="checkbox" checked={f.isActive} onChange={(e) => set('isActive', e.target.checked)} /> Faol
        </label>
      </div>

      {error && <p className="text-[13px] text-danger">{error}</p>}
      <div className="flex gap-2">
        <button onClick={save} disabled={busy} className="press px-5 py-2.5 bg-accent text-white font-semibold rounded-full disabled:opacity-50">Saqlash</button>
        <button onClick={onCancel} className="press px-5 py-2.5 text-muted font-semibold rounded-full">Bekor qilish</button>
      </div>
    </div>
  );
};

export default NewsForm;
