import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ApiSiteConfig } from '../../shared/types';
import { getSiteConfig, updateSiteConfig } from './api';

/**
 * Saqlangan sir belgisi — server sirning o'zini qaytarmaydi, faqat shu belgini; forma uni o'zgartirmasdan
 * qaytarsa server bazadagi qiymatni saqlaydi. Server nusxasi: `app/routes/api.admin.site-config.tsx`.
 */
export const SECRET_SET = '__set__';

export interface SiteConfigState {
  loaded: boolean;
  error: string;
  config: ApiSiteConfig | null;
  set: <K extends keyof ApiSiteConfig>(k: K, v: ApiSiteConfig[K]) => void;
  dirty: boolean;
  /** Oxirgi yuklangan/saqlangan holat — sir maydoni bo'shatilsa belgiga qaytarish uchun. */
  saved: ApiSiteConfig | null;
  /** `PUT` javobi — server tozalagan qiymatlar (masalan bo'sh `seoTitleSuffix` do'kon nomiga aylanadi). */
  save: () => Promise<void>;
}

/**
 * `site_config` formasi — Sozlamalarning to'rt tabi bir xil yozuvning turli qismlarini ko'rsatadi, shuning uchun
 * yuklash/qoralama/saqlash bitta joyda. Ko'rsatilmagan maydonlar (masalan sirlar yoki `customerSessionSecret`) qoralamada
 * o'z holicha qoladi va `PUT`da qaytariladi — boshqa tabdagi qiymat tozalanib ketmasin.
 * Bitta admin nazarda tutilgan: ikki tabda (yoki ikki qurilmada) parallel tahrirda oxirgi saqlash butun qatorni yozadi.
 */
export function useSiteConfig(): SiteConfigState {
  const { t } = useTranslation('settings');
  const [rawConfig, setConfig] = useState(null as ApiSiteConfig | null);
  const config = rawConfig as ApiSiteConfig | null;
  // Saqlangan holat — `dirty` shu bilan solishtirishdan chiqadi, aks holda qiymat asliga qaytsa ham "o'zgargan" bo'lib qolardi.
  const [rawSaved, setSaved] = useState('');
  const saved = rawSaved as string;
  const [error, setError] = useState('');

  useEffect(() => {
    getSiteConfig()
      .then((c) => { setConfig(c); setSaved(JSON.stringify(c)); })
      .catch(() => setError(t('shared.retryLoad')));
  }, []);

  return {
    loaded: config !== null,
    error: error as string,
    config,
    dirty: config !== null && JSON.stringify(config) !== saved,
    saved: saved ? (JSON.parse(saved) as ApiSiteConfig) : null,
    set: (key, value) => setConfig((c: ApiSiteConfig | null) => (c ? { ...c, [key]: value } : c)),
    save: async () => {
      if (!config) return;
      const next = await updateSiteConfig(config);
      setConfig(next);
      setSaved(JSON.stringify(next));
    },
  };
}
