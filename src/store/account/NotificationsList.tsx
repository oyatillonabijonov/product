import { useEffect } from 'react';
import type { FC } from 'react';
import { Bell } from 'lucide-react';
import type { Translation } from '../../locales';
import type { ApiNotification } from '../../../shared/notification';
import { notificationText } from '../../../shared/notification';
import { safeHref } from '../../../shared/safe-href';
import AccountEmptyState from './AccountEmptyState';

/** Sana — `Intl` emas, qo'lda (Toshkent): server va brauzer bir xil satr bersin. */
function stamp(sec: number): string {
  const d = new Date((sec + 5 * 3600) * 1000);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getUTCDate())}.${p(d.getUTCMonth() + 1)}.${d.getUTCFullYear()} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
}

/**
 * Kabinet → Bildirishnomalar.
 *
 * Ro'yxat ochilishi bilan hammasi o'qilgan deb belgilanadi — har biriga alohida
 * bosish ortiqcha. Belgilash fon so'rovi: muvaffaqiyatsiz bo'lsa ham ro'yxat
 * ko'rinadi, keyingi ochilishda qayta urinadi. O'qilmaganlar chap chetidagi
 * rang chizig'i bilan ajraladi (nuqta emas — qator boshida ko'z uni tezroq topadi).
 */
const NotificationsList: FC<{ t: Translation; items: ApiNotification[] }> = ({ t, items }) => {
  const hasUnread = items.some((n) => !n.read);

  useEffect(() => {
    if (!hasUnread) return;
    fetch('/api/notifications', { method: 'POST' }).catch(() => { /* keyingi ochilishda qayta */ });
  }, [hasUnread]);

  if (items.length === 0) return <AccountEmptyState icon={Bell} text={t.notifEmpty} />;

  return (
    <ul className="flex flex-col gap-2.5">
      {items.map((n) => {
        const { title, body } = notificationText(n, t);
        const href = n.link ? safeHref(n.link) : null;
        return (
          <li key={n.id} className={`rounded-sm bg-bg px-4 py-3.5 ${n.read ? '' : 'border-l-2 border-accent'}`}>
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <p className={`text-para ${n.read ? 'text-body' : 'font-semibold text-primary'}`}>{title}</p>
              <span className="text-label text-muted-2 tabular-nums">{stamp(n.createdAt)}</span>
            </div>
            {body && <p className="mt-1 text-label text-muted">{body}</p>}
            {href && (
              <a href={href} className="press mt-2 inline-block rounded-xs text-label text-link hover:underline">
                {t.notifOpen}
              </a>
            )}
          </li>
        );
      })}
    </ul>
  );
};

export default NotificationsList;
