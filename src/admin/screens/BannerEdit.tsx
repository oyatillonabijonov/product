import { useEffect, useState } from 'react';
import type { FC } from 'react';
import { useNavigate } from 'react-router';
import type { ApiBanner } from '../../../shared/types';
import { createBanner, deleteBanner, listBanners, updateBanner } from '../api';
import { errText } from '../errText';
import ImageUploader from '../ImageUploader';
import { PHOTO_UPLOAD, withoutId } from '../lib/content-form';
import { Button, Card, Field, Input, Page, Skeleton, SwitchRow } from '../ui';
import { useConfirm } from '../ui/confirm';
import { useToast } from '../ui/toast';

const LIST = '/admin/content/banners';

type Form = Omit<ApiBanner, 'id'>;
const EMPTY: Form = { imageUrl: '', linkUrl: '', altText: '', sortOrder: 0, isActive: true };

/** Banner tahriri. `id` = 'new' yoki banner id'si. */
const BannerEdit: FC<{ id: string }> = ({ id }) => {
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
    listBanners().then((all) => {
      const b = all.find((x) => x.id === id);
      if (!b) { setError('Banner topilmadi'); return; }
      setForm(withoutId(b));
      setLoaded(true);
    }).catch(() => setError('Yuklashda xatolik'));
  }, [id, isNew]);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => { setForm((f: Form) => ({ ...f, [k]: v })); setDirty(true); };

  async function save() {
    setBusy(true); setError('');
    try {
      if (isNew) {
        await createBanner(form);
        setDirty(false);
        toast("Banner qo'shildi");
        navigate(LIST, { state: { leave: true } });
      } else {
        await updateBanner(id, form);
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
      title: "Bannerni o'chirish",
      message: "Banner slayderdan olib tashlanadi. Faqat yashirish kerak bo'lsa «Saytda ko'rsatilsin»ni o'chiring.",
      confirmLabel: "O'chirish", destructive: true,
    });
    if (!ok) return;
    try {
      await deleteBanner(id);
      setDirty(false);
      toast("Banner o'chirildi");
      navigate(LIST, { state: { leave: true } });
    } catch (e) {
      toast(errText(e), 'error');
    }
  }

  const canSave = dirty && !busy && form.imageUrl !== '';

  return (
    <Page
      title={isNew ? 'Yangi banner' : form.altText || 'Banner'}
      back={LIST}
      dirty={dirty}
      actions={<Button onClick={save} disabled={!canSave}>{busy ? 'Saqlanmoqda…' : 'Saqlash'}</Button>}
    >
      {!loaded && !error ? <Skeleton rows={4} /> : (
        <div className="flex flex-col gap-4">
          {error && <p className="text-para text-danger">{error}</p>}
          <Card title="Rasm" description="Keng rasm, 3:1 (masalan 2400×800); mobilda chetlari biroz kesiladi. Rasm majburiy.">
            <ImageUploader label="Banner rasmi" images={form.imageUrl ? [form.imageUrl] : []} onChange={(next) => set('imageUrl', next[0] ?? '')} normalize={PHOTO_UPLOAD} />
          </Card>
          <Card title="Ma'lumot">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Havola" hint="/chegirmalar yoki https://… — bo'sh bo'lsa banner bosilmaydi">
                <Input value={form.linkUrl} onChange={(v) => set('linkUrl', v)} placeholder="/chegirmalar" />
              </Field>
              <Field label="Rasm tavsifi" hint="Ko'rmaydiganlar va qidiruv tizimlari uchun; ro'yxatda nom bo'lib chiqadi">
                <Input value={form.altText} onChange={(v) => set('altText', v)} />
              </Field>
              <Field label="Tartib" hint="Kichigi oldin">
                <Input type="number" value={String(form.sortOrder)} onChange={(v) => set('sortOrder', Number(v) || 0)} />
              </Field>
            </div>
            <div className="mt-2 divide-y divide-line">
              <SwitchRow label="Saytda ko'rsatilsin" on={form.isActive} onChange={(v) => set('isActive', v)} />
            </div>
          </Card>
          {!isNew && (
            <Card title="Xavfli zona">
              <Button variant="destructive" onClick={remove}>Bannerni o'chirish</Button>
            </Card>
          )}
        </div>
      )}
    </Page>
  );
};

export default BannerEdit;
