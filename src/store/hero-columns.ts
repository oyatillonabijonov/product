import type { ApiCategory } from '../../shared/types';
import appleImg from '../assets/hero/apple.webp';
import pcImg from '../assets/hero/pc.webp';
import audioImg from '../assets/hero/audio.webp';
import videoImg from '../assets/hero/video.webp';
import appleVideo1 from '../assets/apple/cover-1.mp4';
import appleVideo2 from '../assets/apple/cover-2.mp4';
import applePoster from '../assets/apple/cover-poster.jpg';

export interface HeroColumn {
  key: string;
  /** Kartadagi sarlavha; `\n` qatorga bo'ladi (whitespace-pre-line). */
  label: string;
/** Cover shu kategoriyada ko'rsatiladi (yo'nalish id'si). */
  primary: string;
  /** `h1` ostidagi izoh — yo'nalish nimani qamrashini bir gapda aytadi. */
  lede: string;
  img: string;
  /**
   * Cover'da rasm o'rniga ketma-ket aylanadigan videolar. Bo'lsa `img` faqat
   * `poster` sifatida qoladi (va harakat kamaytirilganda ko'rsatiladi).
   */
  videos?: string[];
  /** Video birinchi kadri — qora chaqnashsiz boshlansin. */
  poster?: string;
  /**
   * Qaysi kategoriyaga ulanadi — id yoki nom (kichik harfda). Migratsiya 0025'dan
   * keyin kategoriya = yo'nalish, shuning uchun bitta id yetadi; nom o'zgarsa ham
   * id o'zgarmaydi. Topilmasa link `/katalog`ga tushadi.
   */
  match: string[];
}

// ponytail: 4 ta ustun kodda qotirilgan (dizayndagidek). Kategoriyalar D1'dan
// kelgani uchun faqat *link* moslanadi — rasm/matn shu yerda turadi.
export const HERO_COLUMNS: HeroColumn[] = [
  {
    key: 'apple',
    label: 'Apple',
    lede: "Rasmiy Apple texnikasi — konfiguratsiya tanlash, ma'lumot ko'chirish va servis ko'magi bilan.",
    img: appleImg,
    videos: [appleVideo1, appleVideo2],
    poster: applePoster,
    primary: 'apple',
    match: ['apple'],
  },
  {
    key: 'pc',
    label: 'Personal\nComputers',
    lede: "Windows segmentidagi noutbuk va yig'ma kompyuterlar — ish vazifasiga qarab hisoblab beriladi.",
    img: pcImg,
    primary: 'pc',
    match: ['pc'],
  },
  {
    key: 'audio',
    label: 'Audio',
    lede: "Interfeys, mikrofon, monitor va akustika — studiya to'liq jihozlanadi.",
    img: audioImg,
    primary: 'audio',
    match: ['audio'],
  },
  {
    key: 'video',
    label: 'Video',
    lede: "Kamera, optika, yorug'lik va post-produksiya uchun to'liq to'plam.",
    img: videoImg,
    primary: 'video',
    match: ['video'],
  },
];

function matches(col: HeroColumn, c: ApiCategory): boolean {
  return col.match.includes(c.id.toLowerCase()) || col.match.includes(c.name.toLowerCase());
}

/** Ustun uchun lokalsiz yo'l — mos kategoriya topilmasa umumiy katalog. */
export function columnHref(col: HeroColumn, categories: ApiCategory[]): string {
  const hit = categories.find((c) => matches(col, c));
  return hit ? `/category/${hit.id}` : '/katalog';
}

/** Teskari qidiruv — kategoriya sahifasi o'z hero ustunini (cover uchun) topadi. */
export function columnForCategory(category: ApiCategory): HeroColumn | null {
  return HERO_COLUMNS.find((col) => matches(col, category)) ?? null;
}
