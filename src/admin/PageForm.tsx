import { useState } from 'react';
import type { FC } from 'react';
import type { ApiPage, LocalizedText } from '../../shared/types';
import { createPage, updatePage } from './api';
import { errText } from './errText';

const EMPTY: LocalizedText = { uz: '', ru: '', en: '', uzCyrl: '' };
const LANGS: { key: keyof LocalizedText; label: string }[] = [
  { key: 'uz', label: "O'zbek (lotin)" },
  { key: 'ru', label: 'Русский' },
  { key: 'en', label: 'English' },
  { key: 'uzCyrl', label: 'Ўзбек (кирилл)' },
];

const PageForm: FC<{ initial: ApiPage | null; onSaved: () => void; onCancel: () => void }> = ({ initial, onSaved, onCancel }) => {
  const [slug, setSlug] = useState(initial?.slug ?? '');
  const [title, setTitle] = useState<LocalizedText>(initial?.title ?? EMPTY);
  const [content, setContent] = useState<LocalizedText>(initial?.content ?? EMPTY);
  const [sortOrder, setSortOrder] = useState(initial?.sortOrder ?? 0);
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function save() {
    const SLUG_RE = /^[a-z0-9-]+$/;
    if (!SLUG_RE.test(slug.trim())) { setError(errText(new Error(slug.trim() ? 'slug_invalid' : 'slug_required'))); return; }
    for (const l of LANGS) {
      if (!title[l.key].trim()) { setError(`Sarlavha (${l.label}) majburiy`); return; }
    }
    setBusy(true); setError('');
    try {
      const body = { slug, title, content, sortOrder, isActive };
      if (initial) await updatePage(initial.id, body);
      else await createPage(body);
      onSaved();
    } catch (e) { setError(errText(e)); }
    finally { setBusy(false); }
  }

  return (
    <div className="bg-white rounded-2xl p-5 mb-4 shadow-[--shadow-apple] space-y-4">
      <h3 className="font-semibold">{initial ? 'Sahifani tahrirlash' : 'Yangi sahifa'}</h3>
      <div className="flex items-center gap-4 flex-wrap">
        <label className="text-[13px] text-[#6E6E73]">Slug
          <input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="masalan: faq" className="ml-2 border border-[#E5E5EA] rounded-xl px-3 py-2 text-[14px]" />
        </label>
        <label className="text-[13px] text-[#6E6E73]">Tartib
          <input type="number" value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value))} className="ml-2 w-20 border border-[#E5E5EA] rounded-xl px-2 py-1.5" />
        </label>
        <label className="text-[13px] text-[#6E6E73] flex items-center gap-2">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} /> Faol
        </label>
      </div>
      {LANGS.map((l) => (
        <div key={l.key} className="space-y-2">
          <div className="text-[13px] font-semibold text-[#1D1D1F]">{l.label}</div>
          <input value={title[l.key]} onChange={(e) => setTitle({ ...title, [l.key]: e.target.value })} placeholder="Sarlavha" className="w-full border border-[#E5E5EA] rounded-xl px-3 py-2 text-[14px]" />
          <textarea value={content[l.key]} onChange={(e) => setContent({ ...content, [l.key]: e.target.value })} rows={6} placeholder="Matn (markdown: ## sarlavha, **qalin**, - ro'yxat, [link](/url))" className="w-full border border-[#E5E5EA] rounded-xl px-3 py-2 text-[14px] font-mono" />
        </div>
      ))}
      {error && <p className="text-[13px] text-[#E8462D]">{error}</p>}
      <div className="flex gap-2">
        <button onClick={save} disabled={busy} className="px-5 py-2.5 bg-[#0071E3] text-white font-semibold rounded-full disabled:opacity-50">Saqlash</button>
        <button onClick={onCancel} className="px-5 py-2.5 text-[#6E6E73] font-semibold rounded-full">Bekor qilish</button>
      </div>
    </div>
  );
};

export default PageForm;
