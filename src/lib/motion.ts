/**
 * Harakat tizimi — Apple "Designing Fluid Interfaces" (WWDC 2018) qoidalari.
 *
 * Bitta g'oya: interfeys jonli bo'lishi uchun harakat **hozirgi ekrandagi
 * qiymatdan** boshlanishi, foydalanuvchi tezligini meros olishi, impulsni oldinga
 * proyeksiya qilishi va istalgan lahzada ushlab qaytarilishi kerak. Buni prujina
 * beradi — u tabiatan uzilishga chidamli va tezlikni biladi.
 *
 * Shu sababli davomiylik (`duration` + `ease`) o'rniga prujina ishlatiladi:
 * belgilangan davomiylikdagi animatsiya yangi kiritishga javob bera olmaydi.
 */

/**
 * Apple prujinani ikkita parametr bilan tasvirlaydi (massa/qattiqlik/so'nish emas):
 *
 * - **damping ratio** — otib o'tish. `1.0` = kritik so'nish, sakramaydi.
 *   `< 1.0` = otib o'tadi va tebranadi.
 * - **response** — maqsadga yetish tezligi, sekundda. Bu "davomiylik" emas:
 *   prujinaning umumiy tinchlanish vaqti parametrlardan kelib chiqadi.
 *
 * Motion'da bularning aynan mos keluvchisi `bounce` (= 1 − damping) va
 * `visualDuration` (= response).
 */
interface Spring {
  readonly type: 'spring';
  readonly bounce: number;
  readonly visualDuration: number;
}

const spring = (damping: number, response: number): Spring => ({
  type: 'spring',
  bounce: Math.max(0, 1 - damping),
  visualDuration: response,
});

/**
 * Sukut bo'yicha — kritik so'nish, otib o'tish yo'q.
 * Sakrash faqat harakatning o'zi impuls olib kelganda o'rinli: shunchaki paydo
 * bo'lgan menyuda u xato, otib yuborilgan kartada esa to'g'ri tuyuladi.
 */
export const SPRING_UI = spring(1.0, 0.4);

/** Kichik, tez elementlar (chip, ikon, segment) — o'sha kritik so'nish, qisqaroq. */
export const SPRING_SNAPPY = spring(1.0, 0.25);

/** Tortma / pastdan chiquvchi panel — Apple qiymati: damping 0.8, response 0.3. */
export const SPRING_SHEET = spring(0.8, 0.3);

/**
 * Impuls olib kelgan harakat: otib yuborilgan (flick) element qo'yib
 * yuborilgandan keyin. Apple aynan shu qiymatlarni **aylanish** uchun ham beradi.
 */
export const SPRING_MOMENTUM = spring(0.8, 0.4);

/**
 * Egri chiziqlar — prujina o'rinsiz bo'lgan yagona holat uchun: sahifa
 * ochilishidagi bir martalik reveal (foydalanuvchi unga tegmaydi, demak uzilish
 * ham, tezlik merosi ham kerak emas).
 *
 * `EASE_APPLE` CSS'dagi `--ease-apple` bilan bitta qiymat — ikkalasi ajralib
 * ketmasligi uchun shu yerda ham yozilgan.
 */
export const EASE_APPLE = [0.32, 0.72, 0, 1] as const;

/** Landing reveal'ining o'z egrisi — uzoqroq va yumshoqroq chiqish. */
export const EASE_GLIDE = [0.16, 1, 0.3, 1] as const;

/**
 * Impuls proyeksiyasi — jest qayerda **to'xtashini** hisoblaydi.
 *
 * Qo'yib yuborilgan nuqtaga eng yaqin chegaraga tortish flickni "o'lik" qiladi.
 * Aynan scroll sekinlashuvi kabi bo'lishi uchun tezlikdan yakuniy nuqta
 * proyeksiya qilinadi va snap o'sha nuqtaga qarab tanlanadi.
 *
 * Bu Apple namunaviy kodidagi eksponensial so'nish formulasi — darslikdagi
 * `v²/(2a)` emas.
 *
 * @param velocity px/s dagi qo'yib yuborish tezligi
 * @param decelerationRate 0.998 — odatiy scroll hissi, 0.99 — tezroq to'xtash
 */
export function project(velocity: number, decelerationRate = 0.998): number {
  return ((velocity / 1000) * decelerationRate) / (1 - decelerationRate);
}

/**
 * Chegarada qattiq to'xtash "muzlab qolgan"dek o'qiladi; asta ortib boruvchi
 * qarshilik esa "javob beryapti, lekin bu yog'i yo'q" deb o'qiladi.
 *
 * @param overshoot chegaradan qancha o'tilgani (px)
 * @param dimension element/oyna o'lchami — qarshilik shunga nisbatan
 */
export function rubberband(overshoot: number, dimension: number, constant = 0.55): number {
  if (dimension <= 0) return 0;
  return (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot));
}
