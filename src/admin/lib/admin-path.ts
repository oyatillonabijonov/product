export type SectionId = 'home' | 'products' | 'orders' | 'content' | 'settings';

export interface AdminRoute {
  section: SectionId;
  /** URL'dagi tab segmenti (`categories`, `applications`, …) yoki null — bo'limning asosiy tabi. */
  tab: string | null;
  /** Yozuv id'si yoki `new`; murakkab id'lar (`types/pc/cpu` → `pc/cpu`) keyingi bosqichda ajratiladi. */
  id: string | null;
}

const HOME: AdminRoute = { section: 'home', tab: null, id: null };

function isSection(s: string, segments: Record<SectionId, string[]>): s is SectionId {
  // `constructor` kabi prototip kalitlari bo'lim emas.
  return Object.prototype.hasOwnProperty.call(segments, s);
}

/**
 * `/admin/...` yo'lini bo'lim/tab/id ga ajratadi. `segments` — har bo'limning ma'lum tab
 * segmentlari (nav registridan, `SEGMENTS`); segment bo'lmagan birinchi bo'lak id deb olinadi.
 * Noma'lum bo'lim → bosh sahifa: alohida 404 ekran yo'q, sidebar doim turadi.
 */
export function parseAdminPath(pathname: string, segments: Record<SectionId, string[]>): AdminRoute {
  const parts = pathname.split('/').filter(Boolean);
  if (parts[0] !== 'admin') return HOME;
  const sec = parts[1];
  if (sec === undefined || !isSection(sec, segments)) return HOME;
  const first = parts[2];
  if (first === undefined) return { section: sec, tab: null, id: null };
  if (segments[sec].includes(first)) {
    const id = parts.slice(3).join('/');
    return { section: sec, tab: first, id: id || null };
  }
  return { section: sec, tab: null, id: parts.slice(2).join('/') };
}

/** Bo'lim + tab segmenti (+ id) → yo'l. Bo'sh segment = bo'limning asosiy tabi (`/admin/products`). */
export function adminPath(section: SectionId, segment = '', id?: string): string {
  const base = section === 'home' ? '/admin' : `/admin/${section}`;
  const withTab = segment ? `${base}/${segment}` : base;
  return id ? `${withTab}/${id}` : withTab;
}
