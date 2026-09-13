/**
 * Tovar turlari — har bir yo'nalishning ichki bo'linishi.
 *
 * ponytail: ro'yxat kodda qotirilgan (kategoriyalar/yo'nalishlar `HERO_COLUMNS`da
 * turgani kabi). Alohida jadval + admin CRUD hozircha ortiqcha: turlar do'kon
 * assortimentiga bog'liq va yiliga bir marta o'zgaradi. Kerak bo'lsa shu registr
 * `product_types` jadvaliga ko'chiriladi, `products.type` esa o'sha-o'sha qoladi.
 *
 * `id` — bazadagi `products.type` qiymati; o'zgartirmang (eski mahsulotlar
 * uziladi), faqat qo'shing yoki nomini tahrirlang.
 */
export interface ProductType {
  id: string;
  label: string;
  labelRu: string;
}

export const PRODUCT_TYPES: Record<string, ProductType[]> = {
  apple: [
    { id: 'iphone', label: 'iPhone', labelRu: 'iPhone' },
    { id: 'ipad', label: 'iPad', labelRu: 'iPad' },
    { id: 'macbook', label: 'MacBook', labelRu: 'MacBook' },
    { id: 'imac', label: 'iMac', labelRu: 'iMac' },
    { id: 'mac-mini', label: 'Mac mini', labelRu: 'Mac mini' },
    { id: 'apple-watch', label: 'Apple Watch', labelRu: 'Apple Watch' },
    { id: 'airpods', label: 'AirPods', labelRu: 'AirPods' },
    { id: 'aksessuar', label: 'Aksessuar', labelRu: 'Аксессуары' },
  ],
  pc: [
    { id: 'noutbuk', label: 'Noutbuk', labelRu: 'Ноутбуки' },
    { id: 'tayyor-pc', label: 'Tayyor PC', labelRu: 'Готовые ПК' },
    { id: 'cpu', label: 'CPU', labelRu: 'CPU' },
    { id: 'gpu', label: 'GPU', labelRu: 'GPU' },
    { id: 'motherboard', label: 'Motherboard', labelRu: 'Материнские платы' },
    { id: 'ram', label: 'RAM', labelRu: 'RAM' },
    { id: 'xotira', label: 'Xotira', labelRu: 'Накопители' },
    { id: 'korpus', label: 'Korpus', labelRu: 'Корпуса' },
    { id: 'psu', label: 'Quvvat bloki', labelRu: 'Блоки питания' },
    { id: 'sovutish', label: 'Sovutish', labelRu: 'Охлаждение' },
    { id: 'monitor', label: 'Monitor', labelRu: 'Мониторы' },
    { id: 'aksessuar', label: 'Aksessuar', labelRu: 'Аксессуары' },
  ],
  audio: [
    { id: 'mikrofon', label: 'Mikrofon', labelRu: 'Микрофоны' },
    { id: 'studio-monitor', label: 'Studio monitor', labelRu: 'Студийные мониторы' },
    { id: 'naushnik', label: 'Naushnik', labelRu: 'Наушники' },
    { id: 'interfeys', label: 'Audio interfeys', labelRu: 'Аудиоинтерфейсы' },
    { id: 'mikser', label: 'Mikser / rekorder', labelRu: 'Микшеры и рекордеры' },
    { id: 'aksessuar', label: 'Aksessuar', labelRu: 'Аксессуары' },
  ],
  video: [
    { id: 'kamera', label: 'Kamera', labelRu: 'Камеры' },
    { id: 'obyektiv', label: 'Obyektiv', labelRu: 'Объективы' },
    { id: 'stabilizator', label: 'Stabilizator', labelRu: 'Стабилизаторы' },
    { id: 'yoruglik', label: "Yorug'lik", labelRu: 'Свет' },
    { id: 'monitor-rekorder', label: 'Monitor / rekorder', labelRu: 'Мониторы и рекордеры' },
    { id: 'mikrofon', label: 'Mikrofon', labelRu: 'Микрофоны' },
    { id: 'dron', label: 'Dron', labelRu: 'Дроны' },
    { id: 'aksessuar', label: 'Aksessuar', labelRu: 'Аксессуары' },
  ],
};

/** Yo'nalishning turlari — noma'lum yo'nalish uchun bo'sh ro'yxat. */
export function typesFor(categoryId: string | null | undefined): ProductType[] {
  return (categoryId ? PRODUCT_TYPES[categoryId] : undefined) ?? [];
}

/** Tur shu yo'nalishda mavjudmi — validatsiya va tile'lar shu orqali tekshiradi. */
export function findType(categoryId: string | null | undefined, id: string): ProductType | undefined {
  return typesFor(categoryId).find((t) => t.id === id);
}
