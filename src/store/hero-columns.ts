import type { ApiCategory } from '../../shared/types';
import type { Translation } from '../locales';
import type { AssetKey } from '../lib/site-content';

export interface HeroColumn {
  key: string;
  /** Kartadagi sarlavha; `\n` qatorga bo'ladi (whitespace-pre-line). */
  label: string;
  /** Cover shu kategoriyada ko'rsatiladi (yo'nalish id'si). */
  primary: string;
  img: string;
  /** Cover'da rasm o'rniga ketma-ket aylanadigan videolar; bo'sh — cover'da rasm turadi. */
  videos: string[];
  /** Video birinchi kadri — qora chaqnashsiz boshlansin; bo'sh — `img`. */
  poster: string;
  /**
   * Qaysi kategoriyaga ulanadi — id yoki nom (kichik harfda). Migratsiya 0025'dan
   * keyin kategoriya = yo'nalish, shuning uchun bitta id yetadi; nom o'zgarsa ham
   * id o'zgarmaydi. Topilmasa link `/katalog`ga tushadi.
   */
  match: string[];
}

const IDS = ['apple', 'pc', 'audio', 'video'] as const;

/**
 * Landingning 4 yo'nalish kartasi — soni va id'lari kodda qat'iy (spec §2). Nomlar sayt matnlaridan (`hero*`),
 * rasm, poster va 2 ta video `asset` orqali: admin'da yuklangani yoki koddagi standart (`ASSET_DEFAULTS`).
 */
export function heroColumns(t: Translation, asset: (key: AssetKey) => string): HeroColumn[] {
  const labels: Record<(typeof IDS)[number], string> = { apple: t.heroApple, pc: t.heroPc, audio: t.heroAudio, video: t.heroVideo };
  return IDS.map((id) => ({
    key: id,
    label: labels[id],
    primary: id,
    match: [id],
    img: asset(`hero.${id}.image`),
    poster: asset(`hero.${id}.poster`),
    videos: [asset(`hero.${id}.video1`), asset(`hero.${id}.video2`)].filter((v) => v !== ''),
  }));
}

function matches(col: HeroColumn, c: ApiCategory): boolean {
  return col.match.includes(c.id.toLowerCase()) || col.match.includes(c.name.toLowerCase());
}

/** Ustun uchun lokalsiz yo'l — mos kategoriya topilmasa umumiy katalog. */
export function columnHref(col: HeroColumn, categories: ApiCategory[]): string {
  const hit = categories.find((c) => matches(col, c));
  return hit ? `/category/${hit.id}` : '/katalog';
}

/** Teskari qidiruv — kategoriya sahifasi o'z hero ustunini (cover uchun) topadi. */
export function columnForCategory(columns: HeroColumn[], category: ApiCategory): HeroColumn | null {
  return columns.find((col) => matches(col, category)) ?? null;
}
