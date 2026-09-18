import { useState } from 'react';
import type { FC } from 'react';
import type { PaymentMode } from '../../../shared/types';
import { ContentFields, useSiteContent } from '../ContentFields';
import { errText } from '../errText';
import SectionTabs from '../SectionTabs';
import { useSiteConfig } from '../useSiteConfig';
import { Button, Card, EmptyState, Field, Input, Page, Segmented, Skeleton } from '../ui';
import { useToast } from '../ui/toast';

const MODES = [
  { id: 'cash', label: 'Faqat naqd' },
  { id: 'both', label: "Naqd + muddatli" },
  { id: 'installment', label: 'Faqat muddatli' },
];

/** Sozlamalar → Do'kon: nom, narx rejimi, logolar va favicon, mahsulot sahifasidagi va'dalar (`store` guruhi). */
const SettingsStore: FC = () => {
  const cfg = useSiteConfig();
  const content = useSiteContent('store');
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const config = cfg.config;

  async function save() {
    setBusy(true);
    try {
      if (cfg.dirty) await cfg.save();
      if (content.dirty) await content.save();
      toast("Saqlandi · saytda 1–5 daqiqada ko'rinadi");
    } catch (e) {
      toast(errText(e), 'error');
    } finally {
      setBusy(false);
    }
  }

  const dirty = cfg.dirty || content.dirty;
  const canSave = dirty && !busy && (config?.name.trim() ?? '') !== '';
  const error = cfg.error || content.error;

  return (
    <Page
      title="Do'kon"
      description="Do'kon nomi, narx rejimi, logolar va mahsulot sahifasidagi va'dalar. Matn maydoni bo'shatilsa standart qaytadi."
      dirty={dirty}
      actions={<Button onClick={save} disabled={!canSave}>{busy ? 'Saqlanmoqda…' : 'Saqlash'}</Button>}
    >
      <SectionTabs section="settings" active="store" />
      {error ? <EmptyState title="Sozlamalar yuklanmadi" text={error} />
        : !config || !content.loaded ? <Skeleton rows={8} />
        : (
          <div className="flex flex-col gap-4">
            <Card title="Do'kon">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Do'kon nomi" required hint="Sayt sarlavhasida, footer'da va Telegram xabarlarida chiqadi">
                  <Input value={config.name} onChange={(v) => cfg.set('name', v)} />
                </Field>
              </div>
              <div className="mt-4">
                <p className="mb-1.5 text-label font-medium text-muted">Narx ko'rsatish rejimi</p>
                <Segmented
                  label="Narx ko'rsatish rejimi"
                  value={config.paymentMode}
                  onChange={(v) => cfg.set('paymentMode', v as PaymentMode)}
                  options={MODES}
                />
                <p className="mt-1 text-label text-muted-2">Mahsulot narxi qanday ko'rsatiladi. «Faqat naqd» — oylik to'lov qatori va muddatli tugma chiqmaydi.</p>
              </div>
            </Card>
            <ContentFields content={content} only={['Logo va favicon']} />
            <ContentFields content={content} only={['Mahsulot sahifasi', 'Buyurtma va cookie']} />
          </div>
        )}
    </Page>
  );
};

export default SettingsStore;
