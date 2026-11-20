import { i18n } from '../i18n';
import { formatDateTime } from './format';

/** «5 daq oldin», «2 soat oldin», «kecha»; ikki kundan eskisi — sana va vaqt. */
export function timeAgo(sec: number, nowMs = Date.now()): string {
  const s = nowMs / 1000 - sec;
  if (s < 60) return i18n.t('shell:dashboard.ago.now');
  if (s < 3600) return i18n.t('shell:dashboard.ago.min', { n: Math.floor(s / 60) });
  if (s < 86400) return i18n.t('shell:dashboard.ago.hour', { n: Math.floor(s / 3600) });
  if (s < 172800) return i18n.t('shell:dashboard.ago.yesterday');
  return formatDateTime(sec);
}
