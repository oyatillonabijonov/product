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
  /**
   * Tile qatoridagi ikonka — `public/sections/` dagi shaffof 2x rasm: Apple nav PNG'lari
   * yoki 220×136 qutiga sig'dirilgan WebP render (pastki chetlari bir chiziqda).
   * Majburiy: ikonkasiz tur qatorda bo'sh joy bo'lib qolardi.
   */
  icon: string;
}

export const PRODUCT_TYPES: Record<string, ProductType[]> = {
  apple: [
    { id: 'iphone', label: 'iPhone', labelRu: 'iPhone', icon: '/sections/image-grid-iphone-nav_2x.png' },
    { id: 'ipad', label: 'iPad', labelRu: 'iPad', billz: ['iPad Pro', 'iPad Air', 'iPad mini'], icon: '/sections/image-grid-ipad-tn_2x.png' },
    { id: 'macbook', label: 'MacBook', labelRu: 'MacBook', billz: ['MacBook Pro', 'MacBook Air', 'MacBook Neo'], icon: '/sections/image-grid-mac-nav_2x.png' },
    { id: 'imac', label: 'iMac', labelRu: 'iMac', icon: '/sections/imac.webp' },
    { id: 'mac-mini', label: 'Mac mini', labelRu: 'Mac mini', billz: ['Mac Studio', 'Mac Pro'], icon: '/sections/image-grid-mac-mini_2x.png' },
    { id: 'apple-watch', label: 'Apple Watch', labelRu: 'Apple Watch', billz: ['iWatch', 'Watch'], icon: '/sections/image-grid-watch_2x.png' },
    { id: 'vision-pro', label: 'Apple Vision Pro', labelRu: 'Apple Vision Pro', billz: ['Vision Pro'], icon: '/sections/image-grid-apple-vision-pro_2x.png' },
    { id: 'airpods', label: 'AirPods', labelRu: 'AirPods', billz: ['Air Pods'], icon: '/sections/image-grid-airpods_2x.png' },
    { id: 'aksessuar', label: 'Aksessuar', labelRu: 'Аксессуары', billz: ['Phone Case', 'Case', 'Cable', 'Glass', 'Charger', 'Adapter', 'Bag', 'Trackpad', 'Keyboard', 'Mouse', 'Magic Mouse', 'Magic Keyboard', 'Pencil', 'HUB', 'Kronshteyn', 'Combo', 'Speaker', 'Headset', 'Mousepad', 'Apple TV', 'Chair', 'MagSafe Battery', 'Magic trackpad', 'Power Bank', 'Power Adapter', 'Keyboard Guard', 'KIT', 'M.2 Adapter', 'SATA Adapter', 'Watch Band', 'Apple Pencil', 'EarPods'], icon: '/sections/apple-accessories.webp' },
  ],
  pc: [
    { id: 'noutbuk', label: 'Noutbuk', labelRu: 'Ноутбуки', billz: ['Laptop', 'Notebook'], icon: '/sections/laptops.webp' },
    { id: 'tayyor-pc', label: 'Tayyor PC', labelRu: 'Готовые ПК', billz: ['PC', 'Monoblock', 'Mini PC'], icon: '/sections/pc.webp' },
    { id: 'cpu', label: 'CPU', labelRu: 'CPU', billz: ['Processor'], icon: '/sections/cpu.webp' },
    { id: 'gpu', label: 'GPU', labelRu: 'GPU', billz: ['Videokarta', 'Video Card'], icon: '/sections/gpu.webp' },
    { id: 'motherboard', label: 'Motherboard', labelRu: 'Материнские платы', icon: '/sections/motherboard.webp' },
    { id: 'ram', label: 'RAM', labelRu: 'RAM', billz: ['DDR4', 'DDR5'], icon: '/sections/ram.webp' },
    { id: 'xotira', label: 'Xotira', labelRu: 'Накопители', billz: ['SSD', 'SSD M2', 'SSD M.2', 'NVMe', 'HDD', 'External SSD', 'External HDD'], icon: '/sections/ssd-hdd.webp' },
    { id: 'korpus', label: 'Korpus', labelRu: 'Корпуса', billz: ['PC Case', 'Case'], icon: '/sections/case.webp' },
    { id: 'psu', label: 'Quvvat bloki', labelRu: 'Блоки питания', billz: ['PSU', 'Power Supply'], icon: '/sections/psu.webp' },
    { id: 'sovutish', label: 'Sovutish', labelRu: 'Охлаждение', billz: ['Liquid Cooler', 'CPU Cooler', 'Cooler', 'Fan', 'Fans'], icon: '/sections/cooler.webp' },
    { id: 'monitor', label: 'Monitor', labelRu: 'Мониторы', icon: '/sections/pc-monitor.webp' },
    { id: 'aksessuar', label: 'Aksessuar', labelRu: 'Аксессуары', billz: ['Mouse', 'Keyboard', 'Mousepad', 'Glasspad', 'Headset', 'Speaker', 'Cable', 'HUB', 'Kronshteyn', 'Combo', 'Chair', 'Bag', 'Webcam', 'Microphone', 'Glass', 'Wired Headset', 'Controller Hub', 'DVD Writer'], icon: '/sections/pc-accessories.webp' },
  ],
  audio: [
    { id: 'mikrofon', label: 'Mikrofon', labelRu: 'Микрофоны', billz: ['Microphone', 'Mic', 'Wireless Microphone', 'Микрофон'], icon: '/sections/condenser-microphone.webp' },
    { id: 'studio-monitor', label: 'Studio monitor', labelRu: 'Студийные мониторы', billz: ['Studio Monitor', 'Studio Monitors', 'Monitors'], icon: '/sections/studio-monitors.webp' },
    { id: 'naushnik', label: 'Naushnik', labelRu: 'Наушники', billz: ['Headphones', 'Headphone', 'Наушники'], icon: '/sections/pro-headphones.webp' },
    { id: 'interfeys', label: 'Audio interfeys', labelRu: 'Аудиоинтерфейсы', billz: ['Audio Interface', 'Interface', 'Sound Card'], icon: '/sections/audio-interface.webp' },
    { id: 'mikser', label: 'Mikser / rekorder', labelRu: 'Микшеры и рекордеры', billz: ['Mixer', 'Recorder', 'Audio Recorder'], icon: '/sections/audio-mixer.webp' },
    { id: 'analog', label: 'Analog uskuna', labelRu: 'Аналоговое оборудование', billz: ['Preamp', 'Compressor', 'Equalizer', 'Outboard'], icon: '/sections/analog-studio-hardware.webp' },
    { id: 'midi', label: 'MIDI kontroller', labelRu: 'MIDI-контроллеры', billz: ['MIDI Controller', 'MIDI Keyboard', 'USB Controller'], icon: '/sections/usb-midi-controllers.webp' },
    { id: 'aksessuar', label: 'Aksessuar', labelRu: 'Аксессуары', billz: ['Stand', 'Cable', 'Pop Filter', 'Shock Mount'], icon: '/sections/audio-accessories.webp' },
  ],
  video: [
    { id: 'kamera', label: 'Kamera', labelRu: 'Камеры', billz: ['Camera', 'Camcorder'], icon: '/sections/digital-cameras.webp' },
    { id: 'action-kamera', label: 'Action kamera', labelRu: 'Экшн-камеры', billz: ['Action Camera'], icon: '/sections/action-cameras.webp' },
    { id: 'obyektiv', label: 'Obyektiv', labelRu: 'Объективы', billz: ['Lens', 'Lenses'], icon: '/sections/camera-lens.webp' },
    { id: 'stabilizator', label: 'Stabilizator', labelRu: 'Стабилизаторы', billz: ['Gimbal', 'Stabilizer'], icon: '/sections/gimbal.webp' },
    { id: 'shtativ', label: 'Shtativ', labelRu: 'Штативы', billz: ['Tripod'], icon: '/sections/tripods.webp' },
    { id: 'yoruglik', label: "Yorug'lik", labelRu: 'Свет', billz: ['Light', 'LED Light', 'Lighting'], icon: '/sections/video-lighting.webp' },
    { id: 'post-production', label: 'Post-production', labelRu: 'Постпродакшн', billz: ['Post Production', 'Editing Console'], icon: '/sections/post-production.webp' },
    { id: 'mikrofon', label: 'Mikrofon', labelRu: 'Микрофоны', billz: ['Microphone', 'Wireless Microphone', 'Микрофон'], icon: '/sections/wireless-mic.webp' },
    { id: 'xotira-kartasi', label: 'Xotira kartasi', labelRu: 'Карты памяти', billz: ['Memory Card'], icon: '/sections/memory-cards.webp' },
    { id: 'aksessuar', label: 'Aksessuar', labelRu: 'Аксессуары', billz: ['Battery', 'Bag', 'Cable'], icon: '/sections/video-accessories.webp' },
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

// ── Bazadagi turlar (`product_types`, migratsiya 0035) ─────────────────────
// Registr o'rniga: sayt (`loadTypes`), Billz runner va admin shu shaklni ishlatadi.

export interface ProductTypeRow {
  id: string;
  categoryId: string;
  label: string;
  labelRu: string;
  iconUrl: string;
  /** Billz kategoriya nomlari (katta-kichik harfsiz) — `label` ham mos keladi. */
  billzAliases: string[];
  sortOrder: number;
}

/** SQL qatori (snake_case). */
export interface ProductTypeDbRow {
  id: string;
  category_id: string;
  label: string;
  label_ru: string;
  icon_url: string;
  billz_aliases: string;
  sort_order: number;
}

/** `billz_aliases` JSON matn; buzilgan bo'lsa bo'sh ro'yxat — bitta yomon qator sinxronizatsiyani yiqitmasin. */
export function rowToProductType(r: ProductTypeDbRow): ProductTypeRow {
  let billzAliases: string[] = [];
  try {
    const v: unknown = JSON.parse(r.billz_aliases);
    if (Array.isArray(v)) billzAliases = v.filter((x): x is string => typeof x === 'string');
  } catch {
    // bo'sh qoladi
  }
  return { id: r.id, categoryId: r.category_id, label: r.label, labelRu: r.label_ru, iconUrl: r.icon_url, billzAliases, sortOrder: r.sort_order };
}

/** Yo'nalishning turlari `sort_order` bo'yicha; noma'lum yoki bo'sh yo'nalish → []. */
export function typesOf(all: ProductTypeRow[], categoryId: string | null | undefined): ProductTypeRow[] {
  if (!categoryId) return [];
  return all
    .filter((t) => t.categoryId === categoryId)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id));
}

/** Billz kategoriya nomi → tur id'si (nom yoki alias, katta-kichik harfsiz); mos kelmasa null. */
export function matchBillzType(types: ProductTypeRow[], billzName: string): string | null {
  const needle = billzName.trim().toLowerCase();
  if (!needle) return null;
  for (const t of types) {
    if (t.label.toLowerCase() === needle) return t.id;
    if (t.billzAliases.some((a) => a.toLowerCase() === needle)) return t.id;
  }
  return null;
}
