import { useEffect, useState } from 'react';
import type { FC, ReactNode } from 'react';
import { CalendarDots, ChartBar, CurrencyDollar, Percent, Plus, Trash, WarningCircle } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import type { ApiSettings, Term } from '../../../shared/types';
import { storeRate } from '../../../shared/usd-rate';
import { monthlyPayment } from '../../lib/installment';
import { getSettings, updateSettings } from '../api';
import { BarChart } from '../charts';
import { errText } from '../errText';
import { formatSum, formatThousands } from '../lib/format';
import SectionTabs from '../SectionTabs';
import { Badge, Button, Card, EmptyState, Field, IconButton, IconTile, Input, Page, Skeleton } from '../ui';
import { useToast } from '../ui/toast';

/** Namuna narx — muddat qatorida oylik to'lov qanday chiqishini ko'rsatadi. */
const SAMPLE = 10_000_000;
const st = (i: number) => ({ ['--i' as string]: i } as Record<string, number>);

/** Katta raqamli katak (dollar kursi kartasi): yorliq, son, ostida izoh. */
const Stat: FC<{ label: string; value: ReactNode; note?: string }> = ({ label, value, note }) => (
  <div className="min-w-0">
    <p className="text-sm font-semibold text-text-muted">{label}</p>
    <p className="mt-1.5 truncate text-xl font-bold tabular-nums text-text">{value}</p>
    {note && <p className="mt-0.5 truncate text-sm text-text-faint">{note}</p>}
  </div>
);

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
  const sum = (n: number) => formatSum(n, t('common:sum'));
  const monthsLabel = (m: number) => `${m} ${t('payment.terms.monthsUnit')}`;
  // Namuna hisob — saytdagi kalkulyator bilan bir formula (`monthlyPayment`), admin'da takrorlanmaydi.
  const down = SAMPLE * ((settings?.downPaymentPercent ?? 0) / 100);
  const monthly = (term: Term) => monthlyPayment(SAMPLE, term, down);
  const lo = Math.max(0, Math.min(100, settings?.downPaymentPercent ?? 0));
  const hi = Math.max(lo, Math.min(100, settings?.downPaymentMaxPercent ?? 0));
  const cbu = settings?.usdCbuRate ?? null;
  const markup = settings?.usdMarkupPercent ?? null;
  const auto = markup !== null && cbu !== null;
  const rate = markup !== null && cbu !== null ? storeRate(cbu, markup) : settings?.usdToUzs ?? 0;
  const chartTerms = (settings?.terms ?? []).filter((term) => term.months > 0).sort((a, b) => a.months - b.months);

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
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="stagger" style={st(0)}>
                <Card icon={Percent} hue="violet" title={t('payment.down.title')} description={t('payment.down.description')} className="h-full">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label={t('payment.down.minLabel')} hint={t('payment.down.minHint')}>
                      <Input type="number" value={String(settings.downPaymentPercent)} onChange={(v) => patch((p) => ({ ...p, downPaymentPercent: Number(v) || 0 }))} />
                    </Field>
                    <Field label={t('payment.down.maxLabel')} hint={t('payment.down.maxHint')}>
                      <Input type="number" value={String(settings.downPaymentMaxPercent)} onChange={(v) => patch((p) => ({ ...p, downPaymentMaxPercent: Number(v) || 0 }))} />
                    </Field>
                  </div>
                  <div className="mt-auto rounded-control bg-surface-sunken p-5">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
                      <span className="whitespace-nowrap text-2xl font-bold tabular-nums text-text">{lo}–{hi}%</span>
                      <span className="text-sm text-text-muted sm:text-right">
                        {t('payment.downSample', { price: sum(SAMPLE), min: sum(SAMPLE * (lo / 100)), max: sum(SAMPLE * (hi / 100)) })}
                      </span>
                    </div>
                    {/* Slayder maketi: saytdagi surgich shu oraliqda yuradi. */}
                    <div aria-hidden className="relative mt-5 h-2 rounded-full bg-surface">
                      <div className="absolute inset-y-0 rounded-full bg-c-violet/35 transition-[left,width] duration-300 ease-standard" style={{ left: `${lo}%`, width: `${hi - lo}%` }} />
                      {[lo, hi].map((v, k) => (
                        <span key={k} className="absolute top-1/2 grid size-[18px] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-c-violet transition-[left] duration-300 ease-standard" style={{ left: `${v}%` }}>
                          <span className="size-1.5 rounded-full bg-white" />
                        </span>
                      ))}
                    </div>
                    <div className="mt-2.5 flex justify-between text-sm tabular-nums text-text-faint"><span>0%</span><span>100%</span></div>
                  </div>
                </Card>
              </div>

              <div className="stagger" style={st(1)}>
                <Card
                  icon={CurrencyDollar} hue="green" title={t('payment.usd.title')} description={t('payment.usd.description')} className="h-full"
                  actions={<Badge tone={auto ? 'ok' : 'neutral'} dot>{auto ? t('payment.usdTiles.auto') : t('payment.usdTiles.manual')}</Badge>}
                >
                  <div className="grid grid-cols-3 gap-4 rounded-control bg-surface-sunken p-5">
                    <Stat
                      label={t('payment.usdTiles.cb')}
                      value={settings.usdCbuRate !== null ? formatThousands(settings.usdCbuRate) : '—'}
                      note={settings.usdCbuRate !== null ? settings.usdRateDate : t('payment.usd.noCbRate')}
                    />
                    <Stat
                      label={t('payment.usdTiles.markup')}
                      value={settings.usdMarkupPercent !== null ? `+${String(settings.usdMarkupPercent).replace('.', ',')}%` : '—'}
                      note={settings.usdMarkupPercent === null ? t('payment.usd.markupPlaceholder') : undefined}
                    />
                    <Stat label={t('payment.usdTiles.store')} value={<span className="text-accent-text">{formatThousands(rate) || '—'}</span>} note={`${t('common:sum')} · 1 $`} />
                  </div>
                  <p className="-mt-1 text-sm text-text-muted">{auto ? t('payment.usdTiles.autoNote') : t('payment.usdTiles.manualNote')}</p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label={t('payment.usd.markupLabel')} hint={t('payment.usd.markupHint')}>
                      <Input
                        type="number"
                        value={settings.usdMarkupPercent === null ? '' : String(settings.usdMarkupPercent)}
                        onChange={(v) => patch((p) => ({ ...p, usdMarkupPercent: v === '' ? null : Number(v) || 0 }))}
                        placeholder={t('payment.usd.markupPlaceholder')}
                      />
                    </Field>
                    {!auto && (
                      <Field label={t('payment.usd.manualLabel')} hint={t('payment.usd.manualHint')}>
                        <Input type="number" value={String(settings.usdToUzs)} onChange={(v) => patch((p) => ({ ...p, usdToUzs: Number(v) || 0 }))} />
                      </Field>
                    )}
                  </div>
                </Card>
              </div>
            </div>

            <div className={`grid gap-4 ${chartTerms.length > 0 ? 'xl:grid-cols-[minmax(0,1fr)_380px]' : ''}`}>
              <div className="stagger" style={st(2)}>
                <Card icon={CalendarDots} hue="blue" title={t('payment.terms.title')} description={t('payment.sampleNote', { price: sum(SAMPLE) })} className="h-full">
                  {settings.terms.length === 0 && (
                    <p className="flex items-center gap-2.5 rounded-control bg-danger-soft px-4 py-3 text-sm text-danger-strong">
                      <WarningCircle weight="fill" className="size-4 shrink-0 text-danger" />
                      {t('payment.terms.emptyWarning')}
                    </p>
                  )}
                  <div className="grid gap-3 sm:grid-cols-2">
                    {settings.terms.map((term, i) => (
                      <div key={i} className="flex flex-col gap-4 rounded-control bg-surface p-4">
                        <div className="flex items-center justify-between gap-2">
                          <span className="flex min-w-0 items-center gap-2.5">
                            <IconTile icon={CalendarDots} hue="blue" soft size="sm" />
                            <span className="truncate text-base font-bold text-text">{monthsLabel(term.months)}</span>
                          </span>
                          <IconButton
                            label={t('payment.terms.removeAria', { months: term.months })}
                            danger
                            size="sm"
                            onClick={() => patch((p) => ({ ...p, terms: p.terms.filter((_, j) => j !== i) }))}
                          >
                            <Trash />
                          </IconButton>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <Field label={`${t('payment.terms.monthsLabel')} (${t('payment.terms.monthsUnit')})`}>
                            <Input type="number" value={String(term.months)} onChange={(v) => setTerm(i, 'months', Number(v) || 0)} />
                          </Field>
                          <Field label={`${t('payment.terms.markupLabel')} (%)`}>
                            <Input type="number" value={String(Math.round(term.markup * 100))} onChange={(v) => setTerm(i, 'markup', (Number(v) || 0) / 100)} />
                          </Field>
                        </div>
                        <div className="rounded-item bg-accent-soft px-3 py-2.5">
                          <p className="text-sm font-semibold text-accent-text">{t('payment.monthlyLabel')}</p>
                          <p className="mt-0.5 flex items-baseline gap-1.5">
                            <span className="text-xl font-bold tabular-nums text-text">{term.months > 0 ? formatThousands(monthly(term)) || '0' : '—'}</span>
                            <span className="text-base font-medium text-text-muted">{t('common:sum')}</span>
                          </p>
                        </div>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => patch((p) => ({ ...p, terms: [...p.terms, { months: 12, markup: 0 }] }))}
                      className="flex min-h-40 flex-col items-center justify-center gap-2.5 rounded-control bg-surface-sunken text-base font-semibold text-text-muted transition-colors duration-150 hover:bg-surface-sunken-hover hover:text-text"
                    >
                      <Plus weight="bold" className="size-5" />
                      {t('payment.terms.add')}
                    </button>
                  </div>
                </Card>
              </div>

              {chartTerms.length > 0 && (
                <div className="stagger" style={st(3)}>
                  <Card icon={ChartBar} hue="teal" title={t('payment.chartTitle')} className="h-full">
                    <BarChart
                      labels={chartTerms.map((term) => monthsLabel(term.months))}
                      values={chartTerms.map((term) => Math.round(monthly(term)))}
                      name={t('payment.monthlyLabel')}
                      hue="teal"
                      variant="gradient"
                      height={240}
                    />
                    <ul className="flex flex-col">
                      {chartTerms.map((term, i) => (
                        <li key={i} className="flex items-center justify-between gap-3 border-b border-border py-3 text-base first:pt-0 last:border-b-0 last:pb-0">
                          <span className="flex items-center gap-2 text-text-muted">
                            <span className="size-2.5 rounded-full bg-c-teal" />
                            {monthsLabel(term.months)}
                            <span className="text-sm text-text-faint">+{Math.round(term.markup * 100)}%</span>
                          </span>
                          <span className="font-semibold tabular-nums text-text">{sum(monthly(term))}</span>
                        </li>
                      ))}
                    </ul>
                  </Card>
                </div>
              )}
            </div>
          </div>
        )}
    </Page>
  );
};

export default SettingsPayment;
