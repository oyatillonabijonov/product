import type { ApiCategory } from '../../shared/types';
import appleImg from '../assets/hero/apple.webp';
import pcImg from '../assets/hero/pc.webp';
import audioImg from '../assets/hero/audio.webp';
import videoImg from '../assets/hero/video.webp';

export interface HeroColumn {
  key: string;
  /** Kartadagi sarlavha; `\n` qatorga bo'ladi (whitespace-pre-line). */
  label: string;
  /** Cover'dagi nom ustidagi kichik satr. */
  tag: string;
  /**
   * `tag`/`lede` matni AYNAN shu kategoriya haqida. Boshqa mos kelgan
   * kategoriyalarda cover faqat rasm + nom bo'lib qoladi — aks holda
   * "Noutbuklar" sahifasida yig'ma kompyuter matni chiqadi.
   */
  primary: string;
  lede: string;
  img: string;
  /**
   * Qaysi kategoriyaga ulanadi — id yoki nom (kichik harfda), birinchi mos kelgani
   * yutadi. Kategoriyalar admin'dan boshqarilgani uchun bitta ustun bir nechta
   * ehtimoliy nomni sinaydi; hech biri topilmasa link `/katalog`ga tushadi.
   */
  match: string[];
}

// ponytail: 4 ta ustun kodda qotirilgan (dizayndagidek). Kategoriyalar D1'dan
// kelgani uchun faqat *link* moslanadi — rasm/matn shu yerda turadi.
export const HERO_COLUMNS: HeroColumn[] = [
  {
    key: 'apple',
    label: 'Apple',
    tag: 'Mac · iPhone · iPad',
    lede: "Rasmiy Apple texnikasi — konfiguratsiya tanlash, ma'lumot ko'chirish va servis ko'magi bilan.",
    img: appleImg,
    primary: 'telefonlar',
    match: ['apple', 'telefonlar', 'smartfonlar'],
  },
  {
    key: 'pc',
    label: 'Personal\nComputers',
    tag: 'Workstation · Gaming',
    lede: "Yig'ma kompyuterlar va komponentlar — ish vazifasiga qarab hisoblab beriladi.",
    img: pcImg,
    primary: 'kompyuterlar',
    match: ['kompyuterlar', 'noutbuklar', 'pc'],
  },
  {
    key: 'audio',
    label: 'Audio',
    tag: 'Studiya · Sahna',
    lede: "Interfeys, mikrofon, monitor va akustika — studiya to'liq jihozlanadi.",
    img: audioImg,
    primary: 'audio',
    match: ['audio', 'aksessuarlar', 'naushniklar'],
  },
  {
    key: 'video',
    label: 'Video',
    tag: 'Kamera · Optika',
    lede: "Kamera, optika, yorug'lik va post-produksiya uchun to'liq to'plam.",
    img: videoImg,
    primary: 'video',
    match: ['video', 'kameralar', 'planshetlar'],
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
