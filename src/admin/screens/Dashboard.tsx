import { useEffect, useState } from 'react';
import type { FC } from 'react';
import type { LucideIcon } from 'lucide-react';
import { DollarSign, ImageOff, Inbox, RefreshCw, Users } from 'lucide-react';
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
          <span><b>Diqqat:</b> parol hali standart «admin» — bu paneldan har kim foydalana oladi. Hoziroq o'zgartiring.</span>
          <Button variant="quiet" to="/admin/settings/account" className="-my-1">Parolni o'zgartirish</Button>
        </div>
      )}
      {!data ? (
        error ? (
          <EmptyState
            title="Ma'lumot yuklanmadi"
            text="Internet yoki server bilan aloqa yo'q — qayta urinib ko'ring."
            action={<Button variant="secondary" onClick={onRefresh}>Qayta urinish</Button>}
          />
        ) : (
          <Skeleton rows={3} />
        )
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Stat
            label="Rasm kutayotgan tovarlar" value={data.needsImage} Icon={ImageOff}
            note="Qoldig'i bor, lekin rasmi yo'q — shuning uchun saytda ko'rinmayapti."
            zero="Hammasining rasmi bor."
            to="/admin/products?f=needs_image" action="Ro'yxatni ochish"
          />
          <Stat
            label="Javob kutayotgan buyurtmalar" value={data.newOrders} Icon={Inbox}
            note="Mijoz buyurtma qoldirgan, hali qo'ng'iroq qilinmagan."
            zero="Javobsiz buyurtma yo'q."
            to="/admin/orders" action="Buyurtmalarga o'tish"
          />
          <Stat
            label="Javob kutayotgan ish arizalari" value={data.newApplications} Icon={Users}
            note="Vakansiyaga nomzod ariza yuborgan, hali ko'rilmagan."
            zero="Yangi ariza yo'q."
            to="/admin/orders/applications" action="Arizalarga o'tish"
          />
          <Card className="sm:col-span-2">
            <div className="flex items-center gap-2 text-label text-muted">
              <RefreshCw aria-hidden className="size-4" strokeWidth={1.8} /> Billz'dan tovarlarni olish
            </div>
            <p className={`mt-2 text-para ${billzStatusText(data.billz).error ? 'text-danger' : 'text-primary'}`}>
              {billzStatusText(data.billz).text}
            </p>
            <p className="mt-1 text-label text-muted-2">Sayt Billz'dan har 30 daqiqada o'zi oladi. Yangi tovarni darhol ko'rmoqchi bo'lsangiz — «Yangilash».</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button variant="secondary" onClick={sync} disabled={busy || running || !data.billz.configured}>Yangilash</Button>
              <Button variant="quiet" to="/admin/settings/integrations">Sozlamalar</Button>
            </div>
          </Card>
          <Card>
            <div className="flex items-center gap-2 text-label text-muted">
              <DollarSign aria-hidden className="size-4" strokeWidth={1.8} /> Dollar kursi
            </div>
            <p className="mt-2 text-heading font-semibold text-primary">{formatThousands(data.usd.rate) || '—'}</p>
            <p className="mt-1 text-para text-muted">
              {data.usd.auto
                ? "Markaziy bank kursi + ustamangiz; har 6 soatda o'zi yangilanadi."
                : "Qo'lda kiritilgan — o'zi yangilanmaydi, dollar o'zgarsa narxlar eskirib qoladi."}
            </p>
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
