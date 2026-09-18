import { useEffect, useState } from 'react';
import type { FC } from 'react';
import { X } from 'lucide-react';
import type { ApiSettings, Term } from '../../../shared/types';
import { storeRate } from '../../../shared/usd-rate';
import { monthlyPayment } from '../../lib/installment';
import { getSettings, updateSettings } from '../api';
import { errText } from '../errText';
import { formatSum } from '../lib/format';
import SectionTabs from '../SectionTabs';
import { Button, Card, EmptyState, Field, Input, Page, Skeleton } from '../ui';
import { useToast } from '../ui/toast';

/** Namuna narx — muddat qatorida oylik to'lov qanday chiqishini ko'rsatadi. */
const SAMPLE = 10_000_000;

/** Sozlamalar → To'lov va kurs: boshlang'ich to'lov, muddatlar va ustama, dollar kursi. */
const SettingsPayment: FC = () => {
  const toast = useToast();
  const [rawSettings, setSettings] = useState(null as ApiSettings | null);
  const settings = rawSettings as ApiSettings | null;
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getSettings().then(setSettings).catch(() => setError("Sahifani yangilab qayta urinib ko'ring"));
  }, []);

  const patch = (fn: (prev: ApiSettings) => ApiSettings) => {
    setSettings((prev: ApiSettings | null) => (prev ? fn(prev) : prev));
    setDirty(true);
  };
  const setTerm = (i: number, key: keyof Term, value: number) =>
    patch((prev) => ({ ...prev, terms: prev.terms.map((t, j) => (j === i ? { ...t, [key]: value } : t)) }));

  async function save() {
    if (!settings) return;
    setBusy(true);
    try {
      // Kursni server hisoblaydi (ustama kiritilgan bo'lsa) — formaga saqlangan holat qaytadi.
      setSettings(await updateSettings(settings));
      setDirty(false);
      toast("Saqlandi · saytda 1–5 daqiqada ko'rinadi");
    } catch (e) {
      toast(errText(e), 'error');
    } finally {
      setBusy(false);
    }
  }

  const canSave = dirty && !busy && (settings?.terms.length ?? 0) > 0;

  return (
    <Page
      title="To'lov va kurs"
      description="Muddatli to'lov kalkulyatori va Billz narxlari uchun dollar kursi."
      dirty={dirty as boolean}
      actions={<Button onClick={save} disabled={!canSave}>{busy ? 'Saqlanmoqda…' : 'Saqlash'}</Button>}
    >
      <SectionTabs section="settings" active="payment" />
      {error ? <EmptyState title="Sozlamalar yuklanmadi" text={error} />
        : !settings ? <Skeleton rows={8} />
        : (
          <div className="flex flex-col gap-4">
            <Card title="Boshlang'ich to'lov" description="Mahsulot sahifasidagi slayder shu oraliqda suriladi.">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Eng kam (%)" hint="Sukut bo'yicha shu foiz hisoblanadi">
                  <Input type="number" value={String(settings.downPaymentPercent)} onChange={(v) => patch((p) => ({ ...p, downPaymentPercent: Number(v) || 0 }))} />
                </Field>
                <Field label="Eng ko'p (%)" hint="Eng kamdan katta va 100 dan kichik bo'lsin">
                  <Input type="number" value={String(settings.downPaymentMaxPercent)} onChange={(v) => patch((p) => ({ ...p, downPaymentMaxPercent: Number(v) || 0 }))} />
                </Field>
              </div>
            </Card>

            <Card title="Muddatlar va ustama" description={`Oylik to'lov namunasi ${formatSum(SAMPLE)} narxli mahsulot uchun.`}>
              <div className="flex flex-col gap-3">
                {settings.terms.map((t, i) => (
                  <div key={i} className="flex flex-wrap items-center gap-3">
                    <label className="flex items-center gap-2 text-para text-muted">
                      <span className="w-14">Muddat</span>
                      <span className="w-24"><Input type="number" value={String(t.months)} onChange={(v) => setTerm(i, 'months', Number(v) || 0)} /></span>
                      oy
                    </label>
                    <label className="flex items-center gap-2 text-para text-muted">
                      <span className="w-14">Ustama</span>
                      <span className="w-24"><Input type="number" value={String(Math.round(t.markup * 100))} onChange={(v) => setTerm(i, 'markup', (Number(v) || 0) / 100)} /></span>
                      %
                    </label>
                    <span className="text-para text-primary">{formatSum(monthlyPayment(SAMPLE, t, SAMPLE * (settings.downPaymentPercent / 100)))}/oy</span>
                    <span className="ml-auto">
                      <Button variant="quiet" ariaLabel={`${t.months} oylik muddatni o'chirish`} onClick={() => patch((p) => ({ ...p, terms: p.terms.filter((_, j) => j !== i) }))}>
                        <X aria-hidden className="size-4" />
                      </Button>
                    </span>
                  </div>
                ))}
                {settings.terms.length === 0 && <p className="text-para text-danger">Kamida bitta muddat kerak — aks holda saqlab bo'lmaydi.</p>}
                <div>
                  <Button variant="secondary" onClick={() => patch((p) => ({ ...p, terms: [...p.terms, { months: 12, markup: 0 }] }))}>Muddat qo'shish</Button>
                </div>
              </div>
            </Card>

            <Card title="Dollar kursi" description="Billz narxlari USD'da keladi; saytdagi so'm narxlar shu kurs bilan hisoblanadi.">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Ustama (%)" hint="Bo'sh qoldirsangiz kurs qo'lda kiritiladi; kiritilsa Markaziy bank kursiga qo'shiladi va har 6 soatda yangilanadi">
                  <Input
                    type="number"
                    value={settings.usdMarkupPercent === null ? '' : String(settings.usdMarkupPercent)}
                    onChange={(v) => patch((p) => ({ ...p, usdMarkupPercent: v === '' ? null : Number(v) || 0 }))}
                    placeholder="o'chiq"
                  />
                </Field>
                {settings.usdMarkupPercent === null || settings.usdCbuRate === null ? (
                  <Field label="Kurs (so'm)" hint="1 dollar necha so'm">
                    <Input type="number" value={String(settings.usdToUzs)} onChange={(v) => patch((p) => ({ ...p, usdToUzs: Number(v) || 0 }))} />
                  </Field>
                ) : (
                  <Field label="Do'kon kursi" hint="Markaziy bank kursi + ustama; avtomatik yangilanadi">
                    <Input value={formatSum(storeRate(settings.usdCbuRate, settings.usdMarkupPercent))} onChange={() => {}} disabled />
                  </Field>
                )}
              </div>
              <p className="mt-2 text-label text-muted-2">
                {settings.usdCbuRate !== null
                  ? `Markaziy bank: ${formatSum(settings.usdCbuRate)} (${settings.usdRateDate})`
                  : 'Markaziy bank kursi hali olinmadi.'}
              </p>
            </Card>
          </div>
        )}
    </Page>
  );
};

export default SettingsPayment;
