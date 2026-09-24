import { useEffect, useState } from 'react';
import type { FC } from 'react';
import { useNavigate } from 'react-router';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { ApiCategory, ApiProductType } from '../../../shared/types';
import { createType, deleteType, listCategories, listTypes, updateType, type AdminTypeInput } from '../api';
import { errText } from '../errText';
import ImageUploader from '../ImageUploader';
import { Badge, Button, Card, Field, INPUT_CLS, Input, Page, Select, Skeleton } from '../ui';
import { useConfirm } from '../ui/confirm';
import { useToast } from '../ui/toast';

const LIST = '/admin/products/types';

/** Nomdan id — serverdagi `slugify` bilan bir xil qoida (kichik lotin, raqam, `-`). */
function slugId(label: string): string {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

interface Form { categoryId: string; id: string; label: string; labelRu: string; iconUrl: string; billzAliases: string[]; sortOrder: number }
const EMPTY: Form = { categoryId: '', id: '', label: '', labelRu: '', iconUrl: '', billzAliases: [], sortOrder: 0 };

/** Tur tahriri. `id` = 'new' yoki `${categoryId}/${typeId}` (yaratilgandan keyin id/yo'nalish o'zgarmaydi). */
const TypeEdit: FC<{ id: string }> = ({ id }) => {
  const { t } = useTranslation(['products', 'common']);
  const isNew = id === 'new';
  const [catParam, typeParam] = isNew ? ['', ''] : id.split('/');
  const navigate = useNavigate();
  const toast = useToast();
  const confirm = useConfirm();
  const [rawForm, setForm] = useState(EMPTY as Form);
  const form = rawForm as Form;
  const [rawCats, setCats] = useState([] as ApiCategory[]);
  const cats = rawCats as ApiCategory[];
  const [rawCurrent, setCurrent] = useState(null as ApiProductType | null);
  const current = rawCurrent as ApiProductType | null;
  const [loaded, setLoaded] = useState(isNew);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [alias, setAlias] = useState('');

  useEffect(() => {
    listCategories().then(setCats).catch(() => setError(t('typeEdit.categoriesLoadError')));
    if (isNew) return;
    listTypes().then((all) => {
      const found = all.find((x) => x.categoryId === catParam && x.id === typeParam);
      if (!found) { setError(t('typeEdit.notFound')); return; }
      setCurrent(found);
      setForm({ categoryId: found.categoryId, id: found.id, label: found.label, labelRu: found.labelRu, iconUrl: found.iconUrl, billzAliases: found.billzAliases, sortOrder: found.sortOrder });
      setLoaded(true);
    }).catch(() => setError(t('shared.loadError')));
  }, [isNew, catParam, typeParam]);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => { setForm((f: Form) => ({ ...f, [k]: v })); setDirty(true); };

  function addAlias() {
    const a = alias.trim();
    setAlias('');
    if (!a || form.billzAliases.some((x) => x.toLowerCase() === a.toLowerCase())) return;
    set('billzAliases', [...form.billzAliases, a]);
  }

  async function save() {
    setBusy(true); setError('');
    const body: AdminTypeInput = {
      id: form.id || undefined, categoryId: form.categoryId, label: form.label, labelRu: form.labelRu,
      iconUrl: form.iconUrl, billzAliases: form.billzAliases, sortOrder: form.sortOrder,
    };
    try {
      if (isNew) {
        const created = await createType(body);
        setDirty(false);
        toast(t('typeEdit.toastCreated'));
        navigate(`${LIST}/${created.categoryId}/${created.id}`, { replace: true, state: { leave: true } });
      } else {
        const saved = await updateType(catParam, typeParam, body);
        setCurrent(saved);
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
    if (!current) return;
    const n = current.productCount;
    const ok = await confirm({
      title: t('typeEdit.confirmDelete', { name: current.label }),
      message: n > 0 ? t('typeEdit.confirmDeleteWithProducts', { count: n }) : t('typeEdit.confirmDeleteEmpty'),
      confirmLabel: t('shared.delete'), destructive: true,
    });
    if (!ok) return;
    try {
      await deleteType(catParam, typeParam);
      setDirty(false);
      toast(t('typeEdit.toastDeleted'));
      navigate(LIST, { state: { leave: true } });
    } catch (e) {
      toast(errText(e), 'error');
    }
  }

  const title = isNew ? t('typeEdit.newType') : current?.label ?? t('typeEdit.fallbackTitle');
  const canSave = dirty && !busy && form.label.trim() !== '' && form.categoryId !== '' && form.iconUrl !== '';

  return (
    <Page
      title={title}
      back={LIST}
      dirty={dirty}
      actions={<Button onClick={save} disabled={!canSave}>{busy ? t('shared.saving') : t('shared.save')}</Button>}
    >
      {!loaded && !error ? <Skeleton rows={4} /> : (
        <div className="flex flex-col gap-4">
          {error && <p className="text-para text-danger">{error}</p>}
          <Card title={t('shared.basicInfo')}>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label={t('typeEdit.categoryFieldLabel')} required>
                <Select value={form.categoryId} onChange={(v) => set('categoryId', v)} disabled={!isNew}>
                  <option value="">{t('shared.selectPlaceholder')}</option>
                  {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Select>
              </Field>
              <Field label="ID" hint={isNew ? t('typeEdit.idHintNew') : t('typeEdit.idHintExisting')} required>
                <Input value={form.id} onChange={(v) => set('id', v)} placeholder={slugId(form.label)} disabled={!isNew} />
              </Field>
              <Field label={t('shared.name')} required>
                <Input value={form.label} onChange={(v) => set('label', v)} />
              </Field>
              <Field label={t('typeEdit.nameRuLabel')} hint={t('common:ruHint')}>
                <Input value={form.labelRu} onChange={(v) => set('labelRu', v)} />
              </Field>
              <Field label={t('shared.sortOrder')} hint={t('typeEdit.sortHint')}>
                <Input type="number" value={String(form.sortOrder)} onChange={(v) => set('sortOrder', Number(v) || 0)} />
              </Field>
            </div>
          </Card>

          <Card title={t('typeEdit.icon.title')} description={t('typeEdit.icon.desc')}>
            <ImageUploader
              label={t('typeEdit.icon.title')}
              images={form.iconUrl ? [form.iconUrl] : []}
              onChange={(next) => set('iconUrl', next[0] ?? '')}
              normalize={{ maxSize: 220, maxHeight: 136, quality: 0.8 }}
              accept="image/png,image/webp"
            />
          </Card>

          <Card title={t('shared.billzAliases')} description={t('typeEdit.aliasesDesc')}>
            <div className="flex flex-wrap gap-2">
              {form.billzAliases.map((a) => (
                <span key={a} className="inline-flex items-center gap-1">
                  <Badge>{a}</Badge>
                  <button type="button" aria-label={t('typeEdit.aliasRemoveLabel', { alias: a })} onClick={() => set('billzAliases', form.billzAliases.filter((x) => x !== a))} className="press rounded-full p-1 text-muted-2 hover:text-primary">
                    <X aria-hidden className="size-3.5" />
                  </button>
                </span>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              {/* Kit `Input`i onKeyDown bermaydi — native input o'sha `INPUT_CLS` bilan (Enter alias qo'shadi). */}
              <input
                value={alias}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAlias(e.target.value)}
                onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') { e.preventDefault(); addAlias(); } }}
                placeholder={t('typeEdit.aliasPlaceholder')}
                className={INPUT_CLS}
              />
              <Button variant="secondary" onClick={addAlias}>{t('typeEdit.addAliasButton')}</Button>
            </div>
          </Card>

          {!isNew && current && (
            <Card title={t('shared.dangerZone')} description={t('typeEdit.dangerDesc')}>
              <Button variant="destructive" onClick={remove}>{t('typeEdit.deleteButton')}</Button>
            </Card>
          )}
        </div>
      )}
    </Page>
  );
};

export default TypeEdit;
