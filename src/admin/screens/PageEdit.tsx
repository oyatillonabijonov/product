import { useEffect, useState } from 'react';
import type { FC } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation('content');
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
      if (!p) { setError(t('pageEdit.notFound')); return; }
      setInitial(p);
      setForm(toForm(p));
      setLoaded(true);
    }).catch(() => setError(t('shared.loadError')));
  }, [id, isNew]);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => { setForm((f: Form) => ({ ...f, [k]: v })); setDirty(true); };

  async function save() {
    setBusy(true); setError('');
    // Ruscha sarlavha serverda majburiy: bo'sh qolsa o'zbekchasi yoziladi
    // (saytdagi "ruscha bo'lmasa o'zbekchasi" qoidasi).
    const payload: Partial<ApiPage> = {
      slug: form.slug.trim(),
      title: { uz: form.titleUz, ru: form.titleRu.trim() || form.titleUz },
      content: { uz: form.contentUz, ru: form.contentRu },
      sortOrder: form.sortOrder,
      isActive: form.isActive,
    };
    try {
      if (isNew) {
        await createPage(payload);
        setDirty(false);
        toast(t('pageEdit.toastCreated'));
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
      toast(t('shared.savedLive'));
    } catch (e) {
      setError(errText(e));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!initial) return;
    const ok = await confirm({
      title: t('pageEdit.confirmDelete', { name: initial.title.uz }),
      message: t('pageEdit.confirmDeleteMessage'),
      confirmLabel: t('shared.delete'), destructive: true,
    });
    if (!ok) return;
    try {
      await deletePage(id);
      setDirty(false);
      toast(t('pageEdit.toastDeleted'));
      navigate(LIST, { state: { leave: true } });
    } catch (e) {
      toast(errText(e), 'error');
    }
  }

  const canSave = (dirty || content.dirty) && !busy && form.titleUz.trim() !== '' && form.slug.trim() !== '';

  return (
    <Page
      title={isNew ? t('pageEdit.newTitle') : form.titleUz || initial?.title.uz || t('pageEdit.untitled')}
      back={LIST}
      dirty={dirty || content.dirty}
      actions={(
        <>
          {initial?.isActive && <Button variant="quiet" href={`/page/${savedSlug}`} external>{t('shared.viewOnSite')}</Button>}
          <Button onClick={save} disabled={!canSave}>{busy ? t('shared.saving') : t('shared.save')}</Button>
        </>
      )}
    >
      {!loaded && !error ? <Skeleton rows={6} /> : (
        <div className="flex flex-col gap-4">
          {error && <p className="text-para text-danger">{error}</p>}
          <Card title={t('shared.title')} description={isAbout ? t('pageEdit.aboutTitleHint') : undefined}>
            <LangPair label={t('shared.title')} required uz={form.titleUz} ru={form.titleRu} onUz={(v) => set('titleUz', v)} onRu={(v) => set('titleRu', v)} />
          </Card>
          {special && <ContentFields content={content} />}
          {!isAbout && (
            <Card title={t('shared.text')} description={t('pageEdit.contentDescription')}>
              <div className="flex flex-col gap-3">
                <LangPair label={t('shared.text')} kind="textarea" rows={16} mono uz={form.contentUz} ru={form.contentRu} onUz={(v) => set('contentUz', v)} onRu={(v) => set('contentRu', v)} />
                <MarkdownHelp />
              </div>
            </Card>
          )}
          <Card title={t('shared.slugAndVisibility')}>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label={t('shared.slug')} required hint={special ? t('pageEdit.slugRequiredHint') : t('pageEdit.slugHint')}>
                {/* i18n: ma'lumot — tarjima qilinmaydi (placeholder — saytdagi haqiqiy sahifa slug'i) */}
                <Input value={form.slug} onChange={(v) => set('slug', v)} disabled={special} placeholder="qaytarish" />
              </Field>
              <Field label={t('shared.sortOrder')} hint={t('pageEdit.sortHint')}>
                <Input type="number" value={String(form.sortOrder)} onChange={(v) => set('sortOrder', Number(v) || 0)} />
              </Field>
            </div>
            <div className="mt-2 divide-y divide-line">
              <SwitchRow label={t('shared.showOnSite')} hint={t('pageEdit.visibilityHint')} on={form.isActive} onChange={(v) => set('isActive', v)} />
            </div>
          </Card>
          {!isNew && !special && (
            <Card title={t('shared.dangerZone')}>
              <Button variant="destructive" onClick={remove}>{t('pageEdit.deleteButton')}</Button>
            </Card>
          )}
        </div>
      )}
    </Page>
  );
};

export default PageEdit;
