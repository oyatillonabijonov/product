import { useEffect, useState } from 'react';
import type { FC } from 'react';
import { useLocation } from 'react-router';
import { ArrowSquareOut, Briefcase, ChatText, Clock, FileText, Hash, IdentificationCard, Phone, TelegramLogo, Users, WarningCircle } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import type { ApiJobApplication, OrderStatus } from '../../../shared/types';
import { safeHref } from '../../../shared/safe-href';
import { listJobApplications, setJobApplicationStatus } from '../api';
import { errText } from '../errText';
import { formatDateTime } from '../lib/format';
import { applicationStatusLabels, telHref } from '../lib/inbox';
import { timeAgo } from '../lib/ago';
import { MetaRows, StatusStepper } from '../StatusControls';
import { Avatar, Badge, Button, Card, EmptyState, Page } from '../ui';
import { useToast } from '../ui/toast';

const LIST = '/admin/orders/applications';
type LoadState = 'loading' | 'ready' | 'missing' | 'error';
const at = (i: number) => ({ ['--i' as string]: i }) as Record<string, number>;

/**
 * Nomzod arizasi (`/admin/orders/applications/:id`, v2) — `OrderDetail` naqshi: tepada holat stepper'i, chapda
 * xabar va rezyume, o'ngda nomzod (katta «Qo'ng'iroq qilish») va ariza ma'lumoti. Ro'yxat API'sidan id bo'yicha,
 * holat darhol saqlanadi.
 */
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
          <div className="flex flex-col gap-6" aria-busy="true">
            <div className="skeleton h-[112px] rounded-surface" />
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
              <div className="skeleton h-[240px] rounded-surface" />
              <div className="skeleton h-[240px] rounded-surface" />
            </div>
          </div>
        ) : load === 'missing' ? (
          <EmptyState
            icon={<Users />}
            title={t('applicationDetail.missingTitle')}
            text={t('applicationDetail.missingText')}
            action={<Button variant="secondary" to={LIST}>{t('applicationDetail.backToList')}</Button>}
          />
        ) : (
          <EmptyState
            icon={<WarningCircle />}
            title={t('shared.loadErrorTitle')}
            text={t('shared.networkErrorText')}
            action={<Button variant="secondary" onClick={fetchItem}>{t('common:retry')}</Button>}
          />
        )}
      </Page>
    );
  }

  const resume = safeHref(item.resumeUrl);
  const next: Record<OrderStatus, string> = {
    new: t('applicationsList.next.new'), contacted: t('applicationsList.next.contacted'), done: t('applicationsList.next.done'),
  };
  return (
    <Page
      title={item.name}
      description={`${item.position} · ${formatDateTime(item.createdAt)}`}
      back={backTo}
    >
      <div className="flex flex-col gap-6">
        <div className="stagger" style={at(0)}>
          <StatusStepper value={item.status} labels={labels} next={next} onChange={changeStatus} telegramSent={item.telegramSent} />
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:grid-rows-[auto_1fr] lg:items-start">
          <div className="stagger lg:col-start-2 lg:row-start-1" style={at(1)}>
            <Card icon={IdentificationCard} hue="pink" title={t('shared.candidate')}>
              <div className="flex min-w-0 items-center gap-3">
                <Avatar name={item.name} size="lg" />
                <div className="min-w-0">
                  <p className="truncate text-md font-bold text-text">{item.name}</p>
                  <a href={telHref(item.phone)} className="text-base tabular-nums text-text-muted transition-colors hover:text-text hover:underline">{item.phone}</a>
                </div>
              </div>
              <p className="flex items-center gap-2.5 rounded-control bg-surface-sunken px-4 py-3 text-base font-medium text-text">
                <Briefcase weight="fill" className="size-4 shrink-0 text-text-muted" />
                <span className="min-w-0 break-words">{item.position}</span>
              </p>
              <Button size="lg" href={telHref(item.phone)} className="w-full"><Phone weight="fill" /> {t('shared.callLong')}</Button>
            </Card>
          </div>

          <div className="flex min-w-0 flex-col gap-4 lg:col-start-1 lg:row-span-2 lg:row-start-1">
            <div className="stagger" style={at(2)}>
              <Card icon={ChatText} hue="blue" title={t('applicationDetail.messageLabel')}>
                {item.message
                  ? <p className="whitespace-pre-line text-base leading-relaxed text-text">{item.message}</p>
                  : <p className="text-base text-text-faint">{t('applicationDetail.messageEmpty')}</p>}
              </Card>
            </div>
            <div className="stagger" style={at(3)}>
              <Card
                icon={FileText} hue="orange" title={t('shared.resumeLabel')}
                actions={resume ? <Button variant="outline" size="sm" href={resume} external><ArrowSquareOut weight="bold" /> {t('applicationDetail.resumeOpen')}</Button> : undefined}
              >
                {resume ? (
                  <a href={resume} target="_blank" rel="noopener noreferrer" className="break-all text-base font-medium text-accent-text hover:underline">{item.resumeUrl}</a>
                ) : (
                  <p className="text-base text-text-faint">{t('applicationDetail.resumeEmpty')}</p>
                )}
              </Card>
            </div>
          </div>

          <div className="stagger lg:col-start-2 lg:row-start-2" style={at(4)}>
            <Card icon={Users} hue="violet" title={t('applicationDetail.metaTitle')}>
              <MetaRows
                rows={[
                  { icon: Hash, k: t('shared.numberLabel'), v: <span className="tabular-nums">№{item.id}</span> },
                  {
                    icon: Clock, k: t('shared.timeLabel'),
                    v: (
                      <span className="flex flex-col items-end">
                        <span className="tabular-nums">{formatDateTime(item.createdAt)}</span>
                        <span className="text-sm font-normal text-text-faint">{timeAgo(item.createdAt)}</span>
                      </span>
                    ),
                  },
                  {
                    icon: TelegramLogo, k: t('shared.telegramLabel'),
                    v: <Badge tone={item.telegramSent ? 'ok' : 'danger'} dot>{item.telegramSent ? t('shared.tgSent') : t('shared.tgNotSent')}</Badge>,
                  },
                ]}
              />
            </Card>
          </div>
        </div>
      </div>
    </Page>
  );
};

export default ApplicationDetail;
