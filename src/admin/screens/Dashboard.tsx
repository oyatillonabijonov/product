import { useEffect, useState } from 'react';
import type { FC, ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { DollarSign, ImageOff, Inbox, RefreshCw, Users } from 'lucide-react';
import type { ApiDashboard } from '../../../shared/types';
import type { BillzSyncStatus } from '../../../shared/billz';
import { runBillzSync } from '../api';
import { errText } from '../errText';
import { formatThousands } from '../lib/format';
import { Button, Card, Page, Skeleton } from '../ui';
import { useToast } from '../ui/toast';

/** Sanoq kartasi: yorliq, katta raqam, ostida amal. 0 bo'lsa raqam och — e'tibor talab qilmaydi. */
const Stat: FC<{ label: string; value: number; Icon: LucideIcon; to: string; action: string }> = ({ label, value, Icon, to, action }) => (
  <Card>
    <div className="flex items-center gap-2 text-label text-muted">
      <Icon aria-hidden className="size-4" strokeWidth={1.8} /> {label}
    </div>
    <p className={`mt-2 text-heading font-semibold ${value > 0 ? 'text-primary' : 'text-muted-2'}`}>{value}</p>
    <div className="mt-3 -ml-3">
      <Button variant="quiet" to={to}>{action}</Button>
    </div>
  </Card>
);

/** BillzPanel'dagi holat matni — bir xil so'zlar, egasi ikki joyda bir narsani o'qiydi. */
function billzSummary(s: BillzSyncStatus): ReactNode {
  if (!s.configured) return <span className="text-danger">Sozlanmagan — Integratsiyalar'da kalit va do'konni saqlang.</span>;
  if (s.running) return 'Ishlayapti…';
  const last = s.last;
  if (!last) return 'Hali sinxronlanmagan.';
  const when = new Date(last.at).toLocaleString('ru-RU', { timeZone: 'Asia/Tashkent' });
  if (!last.ok) return <span className="text-danger">Xato: {errText(new Error(last.error ?? 'network'))} ({when})</span>;
  return `${when} · ko'rildi ${last.seen}/${last.count} · yangi ${last.inserted} · yangilandi ${last.updated} · yashirildi ${last.hidden}`;
}

const Dashboard: FC<{ data: ApiDashboard | null; onRefresh: () => void; defaultPw: boolean }> = ({ data, onRefresh, defaultPw }) => {
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  // Sinxronizatsiya fon vazifasi — ishlayotganda 3 s da bir yangilanadi.
  const running = data?.billz.running ?? false;
  useEffect(() => {
    if (!running) return;
    const t = setInterval(onRefresh, 3000);
    return () => clearInterval(t);
  }, [running, onRefresh]);

  async function sync() {
    setBusy(true);
    try {
      await runBillzSync();
      toast('Sinxronizatsiya boshlandi');
      onRefresh();
    } catch (e) {
      toast(errText(e), 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Page title="Bosh sahifa">
      {defaultPw && (
        <div className="mb-6 flex flex-wrap items-center gap-3 rounded-sm border border-danger/30 bg-danger/5 px-4 py-3 text-para text-danger">
          <span><b>Diqqat:</b> standart «admin» paroli ishlatilmoqda — hoziroq o'zgartiring.</span>
          <Button variant="quiet" to="/admin/settings/account" className="-my-1">Parolni o'zgartirish</Button>
        </div>
      )}
      {!data ? (
        <Skeleton rows={3} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Stat label="Rasm kerak" value={data.needsImage} Icon={ImageOff} to="/admin/products?f=needs_image" action="Ro'yxatni ochish" />
          <Stat label="Yangi buyurtmalar" value={data.newOrders} Icon={Inbox} to="/admin/orders" action="Buyurtmalarga o'tish" />
          <Stat label="Yangi arizalar" value={data.newApplications} Icon={Users} to="/admin/orders/applications" action="Arizalarga o'tish" />
          <Card className="sm:col-span-2">
            <div className="flex items-center gap-2 text-label text-muted">
              <RefreshCw aria-hidden className="size-4" strokeWidth={1.8} /> Billz sinxronizatsiyasi
            </div>
            <p className="mt-2 text-para text-primary">{billzSummary(data.billz)}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button variant="secondary" onClick={sync} disabled={busy || running || !data.billz.configured}>Sinxronlash</Button>
              <Button variant="quiet" to="/admin/settings/integrations">Sozlamalar</Button>
            </div>
          </Card>
          <Card>
            <div className="flex items-center gap-2 text-label text-muted">
              <DollarSign aria-hidden className="size-4" strokeWidth={1.8} /> Dollar kursi
            </div>
            <p className="mt-2 text-heading font-semibold text-primary">{formatThousands(data.usd.rate)}</p>
            <p className="text-label text-muted-2">{data.usd.auto ? 'Markaziy bank + ustama, avtomatik' : "Qo'lda kiritilgan"}</p>
            <div className="mt-3 -ml-3">
              <Button variant="quiet" to="/admin/settings/payment">O'zgartirish</Button>
            </div>
          </Card>
        </div>
      )}
    </Page>
  );
};

export default Dashboard;
