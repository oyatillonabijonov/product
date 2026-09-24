import { useEffect, useState } from 'react';
import type { FC } from 'react';
import { useLocation } from 'react-router';
import { Phone } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { ApiJobApplication, OrderStatus } from '../../../shared/types';
import { safeHref } from '../../../shared/safe-href';
import { listJobApplications, setJobApplicationStatus } from '../api';
import { errText } from '../errText';
import { formatDateTime } from '../lib/format';
import { applicationStatusLabels, telHref } from '../lib/inbox';
import { StatusCard } from '../StatusControls';
import { Button, Card, EmptyState, Page, Rows, Skeleton } from '../ui';
import { useToast } from '../ui/toast';

const LIST = '/admin/orders/applications';
type LoadState = 'loading' | 'ready' | 'missing' | 'error';

/** Nomzod arizasi (`/admin/orders/applications/:id`) — `OrderDetail` naqshi: ro'yxat API'sidan id bo'yicha, holat darhol saqlanadi. */
const ApplicationDetail: FC<{ id: string; onCountsChange: () => void }> = ({ id, onCountsChange }) => {
  const { t } = useTranslation(['orders', 'common']);
  const labels = applicationStatusLabels();
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
      toast(t('shared.statusToast', { status: labels[next] }));
      onCountsChange();
    } catch (e) {
      setItem(item);
      toast(errText(e), 'error');
    }
  }

  if (load !== 'ready' || !item) {
    return (
      <Page title={t('applicationDetail.title')} back={backTo}>
        {load === 'loading' ? (
          <Skeleton rows={4} />
        ) : load === 'missing' ? (
          <EmptyState
            title={t('applicationDetail.missingTitle')}
            text={t('applicationDetail.missingText')}
            action={<Button variant="secondary" to={LIST}>{t('applicationDetail.backToList')}</Button>}
          />
        ) : (
          <EmptyState
            title={t('shared.loadErrorTitle')}
            text={t('shared.networkErrorText')}
            action={<Button variant="secondary" onClick={fetchItem}>{t('common:retry')}</Button>}
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
      actions={<Button variant="secondary" href={telHref(item.phone)}><Phone aria-hidden className="size-4" /> {t('shared.call')}</Button>}
    >
      <div className="flex flex-col gap-4">
        <StatusCard value={item.status} labels={labels} onChange={changeStatus} telegramSent={item.telegramSent} />
        <Card title={t('shared.candidate')}>
          <Rows
            rows={[
              { k: t('shared.nameLabel'), v: item.name },
              { k: t('shared.phoneLabel'), v: <a href={telHref(item.phone)} className="press text-link">{item.phone}</a> },
              { k: t('shared.position'), v: item.position },
              {
                k: t('shared.resumeLabel'),
                v: resume
                  ? <a href={resume} target="_blank" rel="noopener noreferrer" className="press break-all text-link">{item.resumeUrl}</a>
                  : '—',
              },
            ]}
          />
        </Card>
        {item.message && (
          <Card title={t('applicationDetail.messageLabel')}>
            <p className="whitespace-pre-line text-para text-primary">{item.message}</p>
          </Card>
        )}
      </div>
    </Page>
  );
};

export default ApplicationDetail;
