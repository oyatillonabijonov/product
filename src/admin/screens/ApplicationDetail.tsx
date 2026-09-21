import { useEffect, useState } from 'react';
import type { FC } from 'react';
import { useLocation } from 'react-router';
import { Phone } from 'lucide-react';
import type { ApiJobApplication, OrderStatus } from '../../../shared/types';
import { safeHref } from '../../../shared/safe-href';
import { listJobApplications, setJobApplicationStatus } from '../api';
import { errText } from '../errText';
import { formatDateTime } from '../lib/format';
import { APPLICATION_STATUS, telHref } from '../lib/inbox';
import { StatusCard } from '../StatusControls';
import { Button, Card, EmptyState, Page, Rows, Skeleton } from '../ui';
import { useToast } from '../ui/toast';

const LIST = '/admin/orders/applications';
type LoadState = 'loading' | 'ready' | 'missing' | 'error';

/** Nomzod arizasi (`/admin/orders/applications/:id`) — `OrderDetail` naqshi: ro'yxat API'sidan id bo'yicha, holat darhol saqlanadi. */
const ApplicationDetail: FC<{ id: string; onCountsChange: () => void }> = ({ id, onCountsChange }) => {
  const location = useLocation();
  const search = (location.state as { search?: string } | null)?.search;
  const backTo = search ? `${LIST}?${search}` : LIST;
  const toast = useToast();
  const [rawItem, setItem] = useState(null as ApiJobApplication | null);
  const item = rawItem as ApiJobApplication | null;
  const [rawLoad, setLoad] = useState('loading' as LoadState);
  const load = rawLoad as LoadState;

  function fetchItem() {
    setLoad('loading');
    listJobApplications()
      .then((xs) => {
        const found = xs.find((x) => String(x.id) === id) ?? null;
        setItem(found);
        setLoad(found ? 'ready' : 'missing');
      })
      .catch(() => setLoad('error'));
  }
  useEffect(fetchItem, [id]);

  async function changeStatus(next: OrderStatus) {
    if (!item) return;
    setItem({ ...item, status: next });
    try {
      await setJobApplicationStatus(item.id, next);
      toast(`Holat: ${APPLICATION_STATUS[next]}`);
      onCountsChange();
    } catch (e) {
      setItem(item);
      toast(errText(e), 'error');
    }
  }

  if (load !== 'ready' || !item) {
    return (
      <Page title="Ariza" back={backTo}>
        {load === 'loading' ? (
          <Skeleton rows={4} />
        ) : load === 'missing' ? (
          <EmptyState
            title="Ariza topilmadi"
            text="Faqat oxirgi 200 ta ariza ochiladi."
            action={<Button variant="secondary" to={LIST}>Arizalarga qaytish</Button>}
          />
        ) : (
          <EmptyState
            title="Ma'lumot yuklanmadi"
            text="Tarmoq yoki server xatosi — qayta urinib ko'ring."
            action={<Button variant="secondary" onClick={fetchItem}>Qayta urinish</Button>}
          />
        )}
      </Page>
    );
  }

  const resume = safeHref(item.resumeUrl);
  return (
    <Page
      title={item.name}
      description={`${item.position} · ${formatDateTime(item.createdAt)}`}
      back={backTo}
      actions={<Button variant="secondary" href={telHref(item.phone)}><Phone aria-hidden className="size-4" /> Qo'ng'iroq</Button>}
    >
      <div className="flex flex-col gap-4">
        <StatusCard value={item.status} labels={APPLICATION_STATUS} onChange={changeStatus} telegramSent={item.telegramSent} />
        <Card title="Nomzod">
          <Rows
            rows={[
              { k: 'Ism', v: item.name },
              { k: 'Telefon', v: <a href={telHref(item.phone)} className="press text-cta">{item.phone}</a> },
              { k: 'Lavozim', v: item.position },
              {
                k: 'Rezyume',
                v: resume
                  ? <a href={resume} target="_blank" rel="noopener noreferrer" className="press break-all text-cta">{item.resumeUrl}</a>
                  : '—',
              },
            ]}
          />
        </Card>
        {item.message && (
          <Card title="Xabar">
            <p className="whitespace-pre-line text-para text-primary">{item.message}</p>
          </Card>
        )}
      </div>
    </Page>
  );
};

export default ApplicationDetail;
