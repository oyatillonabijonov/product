import { useEffect, useState } from 'react';
import type { ApiSiteConfig } from '../../shared/types';
import { getSiteConfig, updateSiteConfig } from './api';

export interface SiteConfigState {
  loaded: boolean;
  error: string;
  config: ApiSiteConfig | null;
  set: <K extends keyof ApiSiteConfig>(k: K, v: ApiSiteConfig[K]) => void;
  dirty: boolean;
  /** `PUT` javobi — server tozalagan qiymatlar (masalan bo'sh `seoTitleSuffix` do'kon nomiga aylanadi). */
  save: () => Promise<void>;
}

/**
 * `site_config` formasi — Sozlamalarning to'rt tabi bir xil yozuvning turli qismlarini ko'rsatadi, shuning uchun
 * yuklash/qoralama/saqlash bitta joyda. Ko'rsatilmagan maydonlar (masalan sirlar yoki `mapLabel`) qoralamada
 * o'z holicha qoladi va `PUT`da qaytariladi — boshqa tabdagi qiymat tozalanib ketmasin.
 */
export function useSiteConfig(): SiteConfigState {
  const [rawConfig, setConfig] = useState(null as ApiSiteConfig | null);
  const config = rawConfig as ApiSiteConfig | null;
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getSiteConfig()
      .then(setConfig)
      .catch(() => setError("Sahifani yangilab qayta urinib ko'ring"));
  }, []);

  return {
    loaded: config !== null,
    error: error as string,
    config,
    dirty: dirty as boolean,
    set: (key, value) => { setConfig((c: ApiSiteConfig | null) => (c ? { ...c, [key]: value } : c)); setDirty(true); },
    save: async () => {
      if (!config) return;
      setConfig(await updateSiteConfig(config));
      setDirty(false);
    },
  };
}
