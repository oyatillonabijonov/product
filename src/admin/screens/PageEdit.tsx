import { useEffect, useState } from 'react';
import type { FC } from 'react';
import { useNavigate } from 'react-router';
import type { ApiPage } from '../../../shared/types';
import { ABOUT_SLUG, LEGAL_LEDE_KEYS } from '../../lib/page-slugs';
import { createPage, deletePage, listPages, updatePage } from '../api';
import { ContentFields, useSiteContent } from '../ContentFields';
import { errText } from '../errText';
import MarkdownHelp from '../MarkdownHelp';
import { Button, Card, Field, Input, LangPair, Page, Skeleton, SwitchRow } from '../ui';
import { useConfirm } from '../ui/confirm';
import { useToast } from '../ui/toast';

const LIST = '/admin/content/pages';

interface Form { slug: string; titleUz: string; titleRu: string; contentUz: string; contentRu: string; sortOrder: number; isActive: boolean }
const EMPTY: Form = { slug: '', titleUz: '', titleRu: '', contentUz: '', contentRu: '', sortOrder: 0, isActive: true };

function toForm(p: ApiPage): Form {
  return { slug: p.slug, titleUz: p.title.uz, titleRu: p.title.ru, contentUz: p.content.uz, contentRu: p.content.ru, sortOrder: p.sortOrder, isActive: p.isActive };
}

/**
 * Sahifa tahriri. `biz-haqimizda` — markdown o'rniga `about` matnlari va fotolari; huquqiy sahifalarda sarlavha
 * ostidagi izoh (sayt matni). Shablon saqlangan slug'ga bog'liq — maxsus sahifaning slug'i o'zgarmaydi, o'chirilmaydi.
 */
const PageEdit: FC<{ id: string }> = ({ id }) => {
  const isNew = id === 'new';
  const navigate = useNavigate();
  const toast = useToast();
  const confirm = useConfirm();
  const [rawForm, setForm] = useState(EMPTY as Form);
  const form = rawForm as Form;
  const [rawInitial, setInitial] = useState(null as ApiPage | null);
  const initial = rawInitial as ApiPage | null;
  const [loaded, setLoaded] = useState(isNew);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const savedSlug = initial?.slug ?? '';
  const isAbout = savedSlug === ABOUT_SLUG;
  const ledeKey = LEGAL_LEDE_KEYS[savedSlug];
  const special = isAbout || Boolean(ledeKey);
  // Oddiy sahifada kalit ro'yxati bo'sh — sayt matni kartasi chizilmaydi.
  const content = useSiteContent(isAbout ? 'about' : 'legal', isAbout ? undefined : ledeKey ? [ledeKey] : []);

  useEffect(() => {
    if (isNew) return;
    listPages().then((all) => {
      const p = all.find((x) => x.id === id);
      if (!p) { setError('Sahifa topilmadi'); return; }
      setInitial(p);
      setForm(toForm(p));
      setLoaded(true);
    }).catch(() => setError('Yuklashda xatolik'));
  }, [id, isNew]);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => { setForm((f: Form) => ({ ...f, [k]: v })); setDirty(true); };

  async function save() {
    setBusy(true); setError('');
    // en/uzCyrl ustunlari saytda chiqmaydi — eski qiymat saqlanadi. Ruscha sarlavha serverda majburiy:
    // bo'sh qolsa o'zbekchasi yoziladi (saytdagi "ruscha bo'lmasa o'zbekchasi" qoidasi).
    const payload: Partial<ApiPage> = {
      slug: form.slug.trim(),
      title: { uz: form.titleUz, ru: form.titleRu.trim() || form.titleUz, en: initial?.title.en ?? '', uzCyrl: initial?.title.uzCyrl ?? '' },
      content: { uz: form.contentUz, ru: form.contentRu, en: initial?.content.en ?? '', uzCyrl: initial?.content.uzCyrl ?? '' },
      sortOrder: form.sortOrder,
      isActive: form.isActive,
    };
    try {
      if (isNew) {
        await createPage(payload);
        setDirty(false);
        toast("Sahifa qo'shildi");
        navigate(LIST, { state: { leave: true } });
        return;
      }
      if (dirty) {
        const saved = await updatePage(id, payload);
        setInitial(saved);
        setForm(toForm(saved));
        setDirty(false);
      }
      if (content.dirty) await content.save();
      toast("Saqlandi · saytda 1–5 daqiqada ko'rinadi");
    } catch (e) {
      setError(errText(e));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!initial) return;
    const ok = await confirm({
      title: `«${initial.title.uz}» sahifasini o'chirish`,
      message: "Sahifa saytdan va footer'dan olib tashlanadi. Faqat yashirish kerak bo'lsa «Saytda ko'rsatilsin»ni o'chiring.",
      confirmLabel: "O'chirish", destructive: true,
    });
    if (!ok) return;
    try {
      await deletePage(id);
      setDirty(false);
      toast("Sahifa o'chirildi");
      navigate(LIST, { state: { leave: true } });
    } catch (e) {
      toast(errText(e), 'error');
    }
  }

  const canSave = (dirty || content.dirty) && !busy && form.titleUz.trim() !== '' && form.slug.trim() !== '';

  return (
    <Page
      title={isNew ? 'Yangi sahifa' : form.titleUz || initial?.title.uz || 'Sahifa'}
      back={LIST}
      dirty={dirty || content.dirty}
      actions={(
        <>
          {initial?.isActive && <Button variant="quiet" href={`/page/${savedSlug}`} external>Saytda ko'rish</Button>}
          <Button onClick={save} disabled={!canSave}>{busy ? 'Saqlanmoqda…' : 'Saqlash'}</Button>
        </>
      )}
    >
      {!loaded && !error ? <Skeleton rows={6} /> : (
        <div className="flex flex-col gap-4">
          {error && <p className="text-para text-danger">{error}</p>}
          <Card title="Sarlavha" description={isAbout ? 'Sahifa tepasida va footer havolasida chiqadi; matn va fotolar quyida.' : undefined}>
            <LangPair label="Sarlavha" required uz={form.titleUz} ru={form.titleRu} onUz={(v) => set('titleUz', v)} onRu={(v) => set('titleRu', v)} />
          </Card>
          {special && <ContentFields content={content} />}
          {!isAbout && (
            <Card title="Matn" description="Sahifaning asosiy matni.">
              <div className="flex flex-col gap-3">
                <LangPair label="Matn" kind="textarea" rows={16} mono uz={form.contentUz} ru={form.contentRu} onUz={(v) => set('contentUz', v)} onRu={(v) => set('contentRu', v)} />
                <MarkdownHelp />
              </div>
            </Card>
          )}
          <Card title="Manzil va ko'rinish">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Slug" required hint={special ? "Maxsus sahifa — manzili o'zgarmaydi" : "Saytdagi /page/<slug> manzili: kichik lotin harflari, raqam va «-»"}>
                <Input value={form.slug} onChange={(v) => set('slug', v)} disabled={special} placeholder="qaytarish" />
              </Field>
              <Field label="Tartib" hint="Footer'dagi o'rni — kichigi oldin">
                <Input type="number" value={String(form.sortOrder)} onChange={(v) => set('sortOrder', Number(v) || 0)} />
              </Field>
            </div>
            <div className="mt-2 divide-y divide-line">
              <SwitchRow label="Saytda ko'rsatilsin" hint="O'chirilsa sahifa ochilmaydi va footer'da chiqmaydi" on={form.isActive} onChange={(v) => set('isActive', v)} />
            </div>
          </Card>
          {!isNew && !special && (
            <Card title="Xavfli zona">
              <Button variant="destructive" onClick={remove}>Sahifani o'chirish</Button>
            </Card>
          )}
        </div>
      )}
    </Page>
  );
};

export default PageEdit;
