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
  /** Billz kategoriya nomlari (katta-kichik harfsiz) — sinxronizatsiya shu orqali turga tushadi. `label` ham mos keladi. */
  billz?: string[];
}

export const PRODUCT_TYPES: Record<string, ProductType[]> = {
  apple: [
    { id: 'iphone', label: 'iPhone', labelRu: 'iPhone' },
    { id: 'ipad', label: 'iPad', labelRu: 'iPad', billz: ['iPad Pro', 'iPad Air', 'iPad mini'] },
    { id: 'macbook', label: 'MacBook', labelRu: 'MacBook', billz: ['MacBook Pro', 'MacBook Air', 'MacBook Neo'] },
    { id: 'imac', label: 'iMac', labelRu: 'iMac' },
    { id: 'mac-mini', label: 'Mac mini', labelRu: 'Mac mini', billz: ['Mac Studio', 'Mac Pro'] },
    { id: 'apple-watch', label: 'Apple Watch', labelRu: 'Apple Watch', billz: ['iWatch', 'Watch'] },
    { id: 'airpods', label: 'AirPods', labelRu: 'AirPods', billz: ['Air Pods'] },
    { id: 'aksessuar', label: 'Aksessuar', labelRu: 'Аксессуары', billz: ['Phone Case', 'Case', 'Cable', 'Glass', 'Charger', 'Adapter', 'Bag', 'Trackpad', 'Keyboard', 'Mouse', 'Magic Mouse', 'Magic Keyboard', 'Pencil', 'HUB', 'Kronshteyn', 'Combo', 'Speaker', 'Headset', 'Mousepad', 'Apple TV', 'Chair', 'MagSafe Battery', 'Magic trackpad', 'Power Bank', 'Power Adapter', 'Keyboard Guard', 'KIT', 'M.2 Adapter', 'SATA Adapter', 'Watch Band', 'Apple Pencil', 'EarPods'] },
  ],
  pc: [
    { id: 'noutbuk', label: 'Noutbuk', labelRu: 'Ноутбуки', billz: ['Laptop', 'Notebook'] },
    { id: 'tayyor-pc', label: 'Tayyor PC', labelRu: 'Готовые ПК', billz: ['PC', 'Monoblock', 'Mini PC'] },
    { id: 'cpu', label: 'CPU', labelRu: 'CPU', billz: ['Processor'] },
    { id: 'gpu', label: 'GPU', labelRu: 'GPU', billz: ['Videokarta', 'Video Card'] },
    { id: 'motherboard', label: 'Motherboard', labelRu: 'Материнские платы' },
    { id: 'ram', label: 'RAM', labelRu: 'RAM', billz: ['DDR4', 'DDR5'] },
    { id: 'xotira', label: 'Xotira', labelRu: 'Накопители', billz: ['SSD', 'SSD M2', 'SSD M.2', 'NVMe', 'HDD', 'External SSD', 'External HDD'] },
    { id: 'korpus', label: 'Korpus', labelRu: 'Корпуса', billz: ['PC Case', 'Case'] },
    { id: 'psu', label: 'Quvvat bloki', labelRu: 'Блоки питания', billz: ['PSU', 'Power Supply'] },
    { id: 'sovutish', label: 'Sovutish', labelRu: 'Охлаждение', billz: ['Liquid Cooler', 'CPU Cooler', 'Cooler', 'Fan', 'Fans'] },
    { id: 'monitor', label: 'Monitor', labelRu: 'Мониторы' },
    { id: 'aksessuar', label: 'Aksessuar', labelRu: 'Аксессуары', billz: ['Mouse', 'Keyboard', 'Mousepad', 'Glasspad', 'Headset', 'Speaker', 'Cable', 'HUB', 'Kronshteyn', 'Combo', 'Chair', 'Bag', 'Webcam', 'Microphone', 'Glass', 'Wired Headset', 'Controller Hub', 'DVD Writer'] },
  ],
  audio: [
    { id: 'mikrofon', label: 'Mikrofon', labelRu: 'Микрофоны', billz: ['Microphone', 'Mic', 'Wireless Microphone', 'Микрофон'] },
    { id: 'studio-monitor', label: 'Studio monitor', labelRu: 'Студийные мониторы', billz: ['Studio Monitor', 'Studio Monitors', 'Monitors'] },
    { id: 'naushnik', label: 'Naushnik', labelRu: 'Наушники', billz: ['Headphones', 'Headphone', 'Наушники'] },
    { id: 'interfeys', label: 'Audio interfeys', labelRu: 'Аудиоинтерфейсы', billz: ['Audio Interface', 'Interface', 'Sound Card'] },
    { id: 'mikser', label: 'Mikser / rekorder', labelRu: 'Микшеры и рекордеры', billz: ['Mixer', 'Recorder', 'Audio Recorder'] },
    { id: 'aksessuar', label: 'Aksessuar', labelRu: 'Аксессуары', billz: ['Stand', 'Cable', 'Pop Filter', 'Shock Mount'] },
  ],
  video: [
    { id: 'kamera', label: 'Kamera', labelRu: 'Камеры', billz: ['Camera', 'Action Camera', 'Camcorder'] },
    { id: 'obyektiv', label: 'Obyektiv', labelRu: 'Объективы', billz: ['Lens', 'Lenses'] },
    { id: 'stabilizator', label: 'Stabilizator', labelRu: 'Стабилизаторы', billz: ['Gimbal', 'Stabilizer'] },
    { id: 'yoruglik', label: "Yorug'lik", labelRu: 'Свет', billz: ['Light', 'LED Light', 'Lighting'] },
    { id: 'monitor-rekorder', label: 'Monitor / rekorder', labelRu: 'Мониторы и рекордеры', billz: ['Field Monitor', 'Monitor Recorder'] },
    { id: 'mikrofon', label: 'Mikrofon', labelRu: 'Микрофоны', billz: ['Microphone', 'Wireless Microphone', 'Микрофон'] },
    { id: 'dron', label: 'Dron', labelRu: 'Дроны', billz: ['Drone'] },
    { id: 'aksessuar', label: 'Aksessuar', labelRu: 'Аксессуары', billz: ['Tripod', 'Battery', 'Memory Card', 'Bag', 'Cable'] },
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

/** Billz kategoriya nomi → shu yo'nalishdagi tur id'si; mos kelmasa `null`. */
export function typeForBillzCategory(categoryId: string | null, billzName: string): string | null {
  const needle = billzName.trim().toLowerCase();
  if (!needle) return null;
  for (const t of typesFor(categoryId)) {
    if (t.label.toLowerCase() === needle) return t.id;
    if (t.billz?.some((a) => a.toLowerCase() === needle)) return t.id;
  }
  return null;
}
