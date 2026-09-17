import { useEffect, useState } from 'react';
import type { FC } from 'react';
import { useNavigate } from 'react-router';
import type { ApiNews } from '../../../shared/types';
import { createNews, deleteNews, listNews, updateNews } from '../api';
import { errText } from '../errText';
import ImageUploader from '../ImageUploader';
import { withoutId } from '../lib/content-form';
import { Button, Card, Field, Input, LangPair, Page, Skeleton, SwitchRow } from '../ui';
import { useConfirm } from '../ui/confirm';
import { useToast } from '../ui/toast';

const LIST = '/admin/content/news';

type Form = Omit<ApiNews, 'id'>;
const EMPTY: Form = {
  badge: '', badgeRu: '', tag: '', tagRu: '', title: '', titleRu: '', text: '', textRu: '',
  cta: '', ctaRu: '', linkUrl: '', imageUrl: '', sortOrder: 0, isActive: true,
};

/** Yangilik (landing tile'i) tahriri. `id` = 'new' yoki yangilik id'si. */
const NewsEdit: FC<{ id: string }> = ({ id }) => {
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

  useEffect(() => {
    if (isNew) return;
    listNews().then((all) => {
      const n = all.find((x) => x.id === id);
      if (!n) { setError('Yangilik topilmadi'); return; }
      setForm(withoutId(n));
      setLoaded(true);
    }).catch(() => setError('Yuklashda xatolik'));
  }, [id, isNew]);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => { setForm((f: Form) => ({ ...f, [k]: v })); setDirty(true); };

  async function save() {
    setBusy(true); setError('');
    try {
      if (isNew) {
        await createNews(form);
        setDirty(false);
        toast("Yangilik qo'shildi");
        navigate(LIST, { state: { leave: true } });
      } else {
        await updateNews(id, form);
        setDirty(false);
        toast("Saqlandi · saytda 1–5 daqiqada ko'rinadi");
      }
    } catch (e) {
      setError(errText(e));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    const ok = await confirm({
      title: `«${form.title}» yangiligini o'chirish`,
      message: "Bosh sahifadan olib tashlanadi. Faqat yashirish kerak bo'lsa «Saytda ko'rsatilsin»ni o'chiring.",
      confirmLabel: "O'chirish", destructive: true,
    });
    if (!ok) return;
    try {
      await deleteNews(id);
      setDirty(false);
      toast("Yangilik o'chirildi");
      navigate(LIST, { state: { leave: true } });
    } catch (e) {
      toast(errText(e), 'error');
    }
  }

  const canSave = dirty && !busy && form.title.trim() !== '' && form.imageUrl !== '';

  return (
    <Page
      title={isNew ? 'Yangi yangilik' : form.title || 'Yangilik'}
      back={LIST}
      dirty={dirty}
      actions={<Button onClick={save} disabled={!canSave}>{busy ? 'Saqlanmoqda…' : 'Saqlash'}</Button>}
    >
      {!loaded && !error ? <Skeleton rows={6} /> : (
        <div className="flex flex-col gap-4">
          {error && <p className="text-para text-danger">{error}</p>}
          <Card title="Rasm" description="Shaffof fonli PNG yoki WebP (mahsulot renderi) — qorong'i mavzuda ham toza turadi. Rasm majburiy.">
            <ImageUploader label="Rasm" images={form.imageUrl ? [form.imageUrl] : []} onChange={(next) => set('imageUrl', next[0] ?? '')} />
          </Card>
          <Card title="Matn">
            <div className="flex flex-col gap-4">
              <LangPair label="Sarlavha" required hint="80 belgigacha" uz={form.title} ru={form.titleRu} onUz={(v) => set('title', v)} onRu={(v) => set('titleRu', v)} />
              <LangPair label="Matn" kind="textarea" rows={2} hint="Bir-ikki qator, 200 belgigacha" uz={form.text} ru={form.textRu} onUz={(v) => set('text', v)} onRu={(v) => set('textRu', v)} />
              <LangPair label="Yorliq" hint="To'q sariq, masalan «Yangi»" uz={form.badge} ru={form.badgeRu} onUz={(v) => set('badge', v)} onRu={(v) => set('badgeRu', v)} />
              <LangPair label="Teg" hint="Yashil, masalan «Tez orada»" uz={form.tag} ru={form.tagRu} onUz={(v) => set('tag', v)} onRu={(v) => set('tagRu', v)} />
              <LangPair label="Tugma matni" hint="Bo'sh bo'lsa «Batafsil»" uz={form.cta} ru={form.ctaRu} onUz={(v) => set('cta', v)} onRu={(v) => set('ctaRu', v)} />
            </div>
          </Card>
          <Card title="Havola va ko'rinish">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Havola" hint="Bo'sh bo'lsa tugma chiqmaydi">
                <Input value={form.linkUrl} onChange={(v) => set('linkUrl', v)} placeholder="/category/apple?tur=iphone" />
              </Field>
              <Field label="Tartib" hint="Bosh sahifada birinchi 3 ta faoli chiqadi — kichigi oldin">
                <Input type="number" value={String(form.sortOrder)} onChange={(v) => set('sortOrder', Number(v) || 0)} />
              </Field>
            </div>
            <div className="mt-2 divide-y divide-line">
              <SwitchRow label="Saytda ko'rsatilsin" on={form.isActive} onChange={(v) => set('isActive', v)} />
            </div>
          </Card>
          {!isNew && (
            <Card title="Xavfli zona">
              <Button variant="destructive" onClick={remove}>Yangilikni o'chirish</Button>
            </Card>
          )}
        </div>
      )}
    </Page>
  );
};

export default NewsEdit;
