import { createContext, useContext } from 'react';
import type { FC, ReactNode } from 'react';
import type { AssetKey, SiteAssets } from '../lib/site-content';
import logo from '../assets/logo.svg';
import logoDark from '../assets/hero/wordmark.webp';
import heroApple from '../assets/hero/apple.webp';
import heroPc from '../assets/hero/pc.webp';
import heroAudio from '../assets/hero/audio.webp';
import heroVideo from '../assets/hero/video.webp';
import appleVideo1 from '../assets/apple/cover-1.mp4';
import appleVideo2 from '../assets/apple/cover-2.mp4';
import applePoster from '../assets/apple/cover-poster.jpg';
import consultImage from '../assets/consult.webp';

/**
 * Koddagi standart rasm/videolar (spec §6 jadvali) — admin'da yuklanmagan kalit shularni oladi. Bo'sh qiymat —
 * standart yo'q (masalan PC/Audio/Video videolari): yuklanmaguncha o'sha joy chizilmaydi.
 */
export const ASSET_DEFAULTS: Record<AssetKey, string> = {
  logo,
  logoDark,
  favicon: '/favicon.svg',
  'hero.apple.image': heroApple,
  'hero.apple.poster': applePoster,
  'hero.apple.video1': appleVideo1,
  'hero.apple.video2': appleVideo2,
  'hero.pc.image': heroPc,
  'hero.pc.poster': '',
  'hero.pc.video1': '',
  'hero.pc.video2': '',
  'hero.audio.image': heroAudio,
  'hero.audio.poster': '',
  'hero.audio.video1': '',
  'hero.audio.video2': '',
  'hero.video.image': heroVideo,
  'hero.video.poster': '',
  'hero.video.video1': '',
  'hero.video.video2': '',
  'consult.image': consultImage,
  'about.hero': '/about/hero.webp',
  'about.experts': '/about/experts.webp',
  'about.delivery': '/about/delivery.webp',
  'about.news': '/about/news.webp',
  'careers.work': '/careers/work.webp',
  'careers.life': '/careers/life.webp',
};

// react tipsiz — `createContext<T>` generigi tushib qoladi; qiymat cast bilan tiplanadi.
const AssetsCtx = createContext({} as SiteAssets);

/** Store layout admin'da yuklangan rasm/videolarni (`site_assets`) shu orqali beradi. */
export const SiteAssetsProvider: FC<{ assets: SiteAssets; children: ReactNode }> = ({ assets, children }) => (
  <AssetsCtx.Provider value={assets}>{children}</AssetsCtx.Provider>
);

/** `const asset = useAssets(); asset('logo')` — admin'da yuklangani, bo'lmasa koddagi standart. */
export function useAssets(): (key: AssetKey) => string {
  const assets = useContext(AssetsCtx) as SiteAssets;
  return (key) => assets[key] || ASSET_DEFAULTS[key];
}
