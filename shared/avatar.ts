/**
 * Mijoz avatari — `bot-avatars` kutubxonasidagi shakl + yuz.
 *
 * Bazada bitta ustun (`customers.avatar`): `"clover.mouth"`. **NULL — avtomatik**:
 * mijozga ro'yxatdan o'tganda hech narsa yozilmaydi, shakli `id` dan hisoblanadi.
 * Shu sababli OAuth kirish yo'llariga tegilmaydi va eski mijozlar ham avatarli bo'ladi;
 * yozuv faqat foydalanuvchi o'zi tanlaganda paydo bo'ladi.
 */

export const AVATAR_TYPES = [
  'clover', 'flower', 'triangle', 'square', 'blob', 'ghost', 'circle', 'drop', 'star',
  'droid', 'mech', 'alien', 'hexagon', 'cat', 'cloud', 'pill', 'pebble', 'puddle',
] as const;

export const AVATAR_FACES = ['eyes', 'mouth'] as const;

export type AvatarType = (typeof AVATAR_TYPES)[number];
export type AvatarFace = (typeof AVATAR_FACES)[number];
export interface Avatar {
  type: AvatarType;
  face: AvatarFace;
}

/**
 * `id` dan barqaror shakl. Ko'paytma-hash sinab ko'rildi va **yomonroq** chiqdi:
 * 18 juft son bo'lgani uchun hash past bitlarida qiyshayadi (180 id'da shakllar
 * 2..18 marta), oddiy qoldiq esa aynan tekis (har shakl 10 marta).
 */
export function autoAvatar(customerId: number): Avatar {
  return { type: AVATAR_TYPES[customerId % AVATAR_TYPES.length], face: 'eyes' };
}

function isType(v: string): v is AvatarType {
  return (AVATAR_TYPES as readonly string[]).includes(v);
}

function isFace(v: string): v is AvatarFace {
  return (AVATAR_FACES as readonly string[]).includes(v);
}

/** Yozilgan qiymat to'g'rimi — mijoz yuborgan tanani tekshirish uchun. */
export function isAvatar(raw: string): boolean {
  const [type, face, ...rest] = raw.split('.');
  return rest.length === 0 && isType(type) && (face === undefined || isFace(face));
}

/** Bazadagi satr → avatar; bo'sh yoki yaroqsiz bo'lsa `id` dan avtomatik. */
export function parseAvatar(raw: string | null, customerId: number): Avatar {
  if (!raw || !isAvatar(raw)) return autoAvatar(customerId);
  const [type, face] = raw.split('.');
  return { type: type as AvatarType, face: face === undefined ? 'eyes' : (face as AvatarFace) };
}

/** Avatar → bazaga yoziladigan satr. */
export function serializeAvatar(a: Avatar): string {
  return `${a.type}.${a.face}`;
}
