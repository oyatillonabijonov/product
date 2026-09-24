import { useEffect, useState } from 'react';
import type { FC } from 'react';
import type { LucideIcon } from 'lucide-react';
import { DollarSign, ImageOff, Inbox, RefreshCw, Users } from 'lucide-react';
import { Trans, useTranslation } from 'react-i18next';
import type { ApiDashboard } from '../../../shared/types';
import { runBillzSync } from '../api';
import { billzStatusText } from '../lib/billz-status';
import { errText } from '../errText';
import { formatThousands } from '../lib/format';
import { Button, Card, EmptyState, Page, Skeleton } from '../ui';
import { useToast } from '../ui/toast';

/**
 * Sanoq kartasi: yorliq, katta raqam va **ostida bir gap** — raqam nimani anglatishi
 * va nega e'tibor kerakligi. 0 bo'lsa raqam och va gap tinchlantiruvchi (`zero`).
 */
const Stat: FC<{ label: string; value: number; note: string; zero: string; Icon: LucideIcon; to: string; action: string }> = ({ label, value, note, zero, Icon, to, action }) => (
  <Card>
    <div className="flex items-center gap-2 text-label text-muted">
      <Icon aria-hidden className="size-4" strokeWidth={1.8} /> {label}
    </div>
    <p className={`mt-2 text-heading font-semibold ${value > 0 ? 'text-primary' : 'text-muted-2'}`}>{value}</p>
    <p className="mt-1 text-para text-muted">{value > 0 ? note : zero}</p>
    <div className="mt-3 -ml-3">
      <Button variant="quiet" to={to}>{action}</Button>
    </div>
  </Card>
);

const Dashboard: FC<{ data: ApiDashboard | null; onRefresh: () => void; defaultPw: boolean; error: boolean }> = ({ data, onRefresh, defaultPw, error }) => {
  const { t } = useTranslation(['shell', 'common']);
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  // Sinxronizatsiya fon vazifasi — ishlayotganda 3 s da bir yangilanadi.
  const running = data?.billz.running ?? false;
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(onRefresh, 3000);
    return () => clearInterval(timer);
  }, [running, onRefresh]);

  async function sync() {
    setBusy(true);
    try {
      await runBillzSync();
      toast(t('dashboard.billz.syncStarted'));
      onRefresh();
    } catch (e) {
      toast(errText(e), 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Page title={t('nav.home.label')}>
      {defaultPw && (
        <div className="mb-6 flex flex-wrap items-center gap-3 rounded-sm border border-danger/30 bg-danger/5 px-4 py-3 text-para text-danger">
          <span><Trans t={t} i18nKey="dashboard.defaultPassword" components={{ b: <b /> }} /></span>
          <Button variant="quiet" to="/admin/settings/account" className="-my-1">{t('dashboard.changePassword')}</Button>
        </div>
      )}
      {!data ? (
        error ? (
          <EmptyState
            title={t('dashboard.loadErrorTitle')}
            text={t('dashboard.loadErrorText')}
            action={<Button variant="secondary" onClick={onRefresh}>{t('common:retry')}</Button>}
          />
        ) : (
          <Skeleton rows={3} />
        )
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Stat
            label={t('dashboard.needsImage.label')} value={data.needsImage} Icon={ImageOff}
            note={t('dashboard.needsImage.note')}
            zero={t('dashboard.needsImage.zero')}
            to="/admin/products?f=needs_image" action={t('dashboard.needsImage.action')}
          />
          <Stat
            label={t('dashboard.newOrders.label')} value={data.newOrders} Icon={Inbox}
            note={t('dashboard.newOrders.note')}
            zero={t('dashboard.newOrders.zero')}
            to="/admin/orders" action={t('dashboard.newOrders.action')}
          />
          <Stat
            label={t('dashboard.newApplications.label')} value={data.newApplications} Icon={Users}
            note={t('dashboard.newApplications.note')}
            zero={t('dashboard.newApplications.zero')}
            to="/admin/orders/applications" action={t('dashboard.newApplications.action')}
          />
          <Card className="sm:col-span-2">
            <div className="flex items-center gap-2 text-label text-muted">
              <RefreshCw aria-hidden className="size-4" strokeWidth={1.8} /> {t('dashboard.billz.title')}
            </div>
            <p className={`mt-2 text-para ${billzStatusText(data.billz).error ? 'text-danger' : 'text-primary'}`}>
              {billzStatusText(data.billz).text}
            </p>
            <p className="mt-1 text-label text-muted-2">{t('dashboard.billz.description')}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button variant="secondary" onClick={sync} disabled={busy || running || !data.billz.configured}>{t('dashboard.billz.refresh')}</Button>
              <Button variant="quiet" to="/admin/settings/integrations">{t('nav.settings.label')}</Button>
            </div>
          </Card>
          <Card>
            <div className="flex items-center gap-2 text-label text-muted">
              <DollarSign aria-hidden className="size-4" strokeWidth={1.8} /> {t('dashboard.usd.title')}
            </div>
            <p className="mt-2 text-heading font-semibold text-primary">{formatThousands(data.usd.rate) || '—'}</p>
            <p className="mt-1 text-para text-muted">
              {data.usd.auto ? t('dashboard.usd.autoNote') : t('dashboard.usd.manualNote')}
            </p>
            <div className="mt-3 -ml-3">
              <Button variant="quiet" to="/admin/settings/payment">{t('dashboard.usd.change')}</Button>
            </div>
          </Card>
        </div>
      )}
    </Page>
  );
};

export default Dashboard;
