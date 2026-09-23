import { districtById, regionById } from './uz-regions.ts';

/** Manzil maydonlari — bazadagi qator va forma bitta shakldan foydalanadi. */
export interface AddressFields {
  region: string;
  district: string;
  street: string;
  house: string;
  apartment: string;
  entrance: string;
  floor: string;
}

export interface ApiAddress extends AddressFields {
  id: number;
  isDefault: boolean;
}

export const ADDRESS_MAX = 10;

/**
 * Manzilning bir qatorli ko'rinishi — kabinetda ham, Telegram xabarida ham shu.
 *
 * Viloyat/tuman `id` dan nomga o'giriladi; noma'lum `id` (ma'lumot keyin o'zgarsa)
 * shunchaki tushib qoladi, xato bermaydi — kuryerga qolgan qismi baribir foydali.
 * Matn o'zbekcha: u buyurtma nusxasi sifatida saqlanadi va do'konning o'z chatiga boradi.
 */
export function formatAddress(a: AddressFields): string {
  const parts: string[] = [];
  const r = regionById(a.region);
  if (r) parts.push(r.name);
  const d = districtById(a.region, a.district);
  if (d) parts.push(d.name);
  const street = [a.street.trim(), a.house.trim() && `${a.house.trim()}-uy`].filter(Boolean).join(' ');
  if (street) parts.push(street);
  if (a.apartment.trim()) parts.push(`${a.apartment.trim()}-xonadon`);
  if (a.entrance.trim()) parts.push(`${a.entrance.trim()}-podʼezd`);
  if (a.floor.trim()) parts.push(`${a.floor.trim()}-qavat`);
  return parts.join(', ');
}

/** Viloyat va tuman — ro'yxatdagi ikkinchi qator (manzilning konteksti). */
export function addressTitle(a: AddressFields): string {
  return [regionById(a.region)?.name, districtById(a.region, a.district)?.name].filter(Boolean).join(', ');
}

/**
 * Manzilning **o'ziga xos** qismi: ko'cha, uy, xonadon… Ro'yxatda birinchi qator
 * shu bo'ladi — mijozning ikki manzili ko'pincha bitta tumanda, farqi shu yerda.
 * Ko'cha majburiy, shuning uchun bu hech qachon bo'sh chiqmaydi.
 */
export function addressStreetLine(a: AddressFields): string {
  return formatAddress({ ...a, region: '', district: '' });
}
