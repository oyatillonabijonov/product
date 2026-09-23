export type NotificationKind = 'order_status' | 'announce';

export interface ApiNotification {
  id: number;
  kind: NotificationKind;
  orderId: number | null;
  status: string | null;
  /** `announce` uchun — joriy tildagi matn; `order_status` da bo'sh. */
  title: string;
  body: string;
  link: string;
  read: boolean;
  createdAt: number;
}

/** Bildirishnoma matni — `announce` da saqlangani, `order_status` da shabloni. */
export interface NotificationStrings {
  notifOrderContacted: string;
  notifOrderDone: string;
  notifOrderNew: string;
  notifOrderBody: string;
}

/**
 * Ko'rsatiladigan sarlavha va matn.
 *
 * `order_status` uchun matn **bazada emas**, shu yerda yig'iladi — shuning uchun
 * so'zlash o'zgarsa eski bildirishnomalar ham yangi matn bilan chiqadi.
 */
export function notificationText(n: ApiNotification, t: NotificationStrings): { title: string; body: string } {
  if (n.kind === 'announce') return { title: n.title, body: n.body };
  const title = n.status === 'done' ? t.notifOrderDone
    : n.status === 'contacted' ? t.notifOrderContacted
    : t.notifOrderNew;
  return { title, body: t.notifOrderBody.replace('{n}', String(n.orderId ?? '')) };
}
