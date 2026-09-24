import { useEffect, useState } from 'react';
import type { FC } from 'react';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation(['settings', 'common']);
  const toast = useToast();
  const [rawSettings, setSettings] = useState(null as ApiSettings | null);
  const settings = rawSettings as ApiSettings | null;
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getSettings().then(setSettings).catch(() => setError(t('shared.retryLoad')));
  }, []);

  const patch = (fn: (prev: ApiSettings) => ApiSettings) => {
    setSettings((prev: ApiSettings | null) => (prev ? fn(prev) : prev));
    setDirty(true);
  };
  const setTerm = (i: number, key: keyof Term, value: number) =>
    patch((prev) => ({ ...prev, terms: prev.terms.map((term, j) => (j === i ? { ...term, [key]: value } : term)) }));

  async function save() {
    if (!settings) return;
    setBusy(true);
    try {
      // Kursni server hisoblaydi (ustama kiritilgan bo'lsa) — formaga saqlangan holat qaytadi.
      setSettings(await updateSettings(settings));
      setDirty(false);
      toast(t('shared.savedLive'));
    } catch (e) {
      toast(errText(e), 'error');
    } finally {
      setBusy(false);
    }
  }

  const canSave = dirty && !busy && (settings?.terms.length ?? 0) > 0;

  return (
    <Page
      title={t('payment.title')}
      description={t('payment.description')}
      dirty={dirty as boolean}
      actions={<Button onClick={save} disabled={!canSave}>{busy ? t('shared.saving') : t('shared.save')}</Button>}
    >
      <SectionTabs section="settings" active="payment" />
      {error ? <EmptyState title={t('shared.loadErrorTitle')} text={error} />
        : !settings ? <Skeleton rows={8} />
        : (
          <div className="flex flex-col gap-4">
            <Card title={t('payment.down.title')} description={t('payment.down.description')}>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label={t('payment.down.minLabel')} hint={t('payment.down.minHint')}>
                  <Input type="number" value={String(settings.downPaymentPercent)} onChange={(v) => patch((p) => ({ ...p, downPaymentPercent: Number(v) || 0 }))} />
                </Field>
                <Field label={t('payment.down.maxLabel')} hint={t('payment.down.maxHint')}>
                  <Input type="number" value={String(settings.downPaymentMaxPercent)} onChange={(v) => patch((p) => ({ ...p, downPaymentMaxPercent: Number(v) || 0 }))} />
                </Field>
              </div>
            </Card>

            <Card title={t('payment.terms.title')} description={t('payment.sampleNote', { price: formatSum(SAMPLE, t('common:sum')) })}>
              <div className="flex flex-col gap-3">
                {settings.terms.map((term, i) => (
                  <div key={i} className="flex flex-wrap items-center gap-3">
                    <label className="flex items-center gap-2 text-para text-muted">
                      <span className="w-14">{t('payment.terms.monthsLabel')}</span>
                      <span className="w-24"><Input type="number" value={String(term.months)} onChange={(v) => setTerm(i, 'months', Number(v) || 0)} /></span>
                      {t('payment.terms.monthsUnit')}
                    </label>
                    <label className="flex items-center gap-2 text-para text-muted">
                      <span className="w-14">{t('payment.terms.markupLabel')}</span>
                      <span className="w-24"><Input type="number" value={String(Math.round(term.markup * 100))} onChange={(v) => setTerm(i, 'markup', (Number(v) || 0) / 100)} /></span>
                      %
                    </label>
                    <span className="text-para text-primary">
                      {t('payment.perMonth', { sum: formatSum(monthlyPayment(SAMPLE, term, SAMPLE * (settings.downPaymentPercent / 100)), t('common:sum')) })}
                    </span>
                    <span className="ml-auto">
                      <Button variant="quiet" ariaLabel={t('payment.terms.removeAria', { months: term.months })} onClick={() => patch((p) => ({ ...p, terms: p.terms.filter((_, j) => j !== i) }))}>
                        <X aria-hidden className="size-4" />
                      </Button>
                    </span>
                  </div>
                ))}
                {settings.terms.length === 0 && <p className="text-para text-danger">{t('payment.terms.emptyWarning')}</p>}
                <div>
                  <Button variant="secondary" onClick={() => patch((p) => ({ ...p, terms: [...p.terms, { months: 12, markup: 0 }] }))}>{t('payment.terms.add')}</Button>
                </div>
              </div>
            </Card>

            <Card title={t('payment.usd.title')} description={t('payment.usd.description')}>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label={t('payment.usd.markupLabel')} hint={t('payment.usd.markupHint')}>
                  <Input
                    type="number"
                    value={settings.usdMarkupPercent === null ? '' : String(settings.usdMarkupPercent)}
                    onChange={(v) => patch((p) => ({ ...p, usdMarkupPercent: v === '' ? null : Number(v) || 0 }))}
                    placeholder={t('payment.usd.markupPlaceholder')}
                  />
                </Field>
                {settings.usdMarkupPercent === null || settings.usdCbuRate === null ? (
                  <Field label={t('payment.usd.manualLabel')} hint={t('payment.usd.manualHint')}>
                    <Input type="number" value={String(settings.usdToUzs)} onChange={(v) => patch((p) => ({ ...p, usdToUzs: Number(v) || 0 }))} />
                  </Field>
                ) : (
                  <Field label={t('payment.usd.storeLabel')} hint={t('payment.usd.storeHint')}>
                    <Input value={formatSum(storeRate(settings.usdCbuRate, settings.usdMarkupPercent), t('common:sum'))} onChange={() => {}} disabled />
                  </Field>
                )}
              </div>
              <p className="mt-2 text-label text-muted-2">
                {settings.usdCbuRate !== null
                  ? t('payment.cbRate', { rate: formatSum(settings.usdCbuRate, t('common:sum')), date: settings.usdRateDate })
                  : t('payment.usd.noCbRate')}
              </p>
            </Card>
          </div>
        )}
    </Page>
  );
};

export default SettingsPayment;
