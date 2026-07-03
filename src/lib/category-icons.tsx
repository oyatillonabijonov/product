import {
  Smartphone,
  Laptop,
  Tablet,
  Monitor,
  Headphones,
  Watch,
  Camera,
  Gamepad2,
  Keyboard,
  Mouse,
  Speaker,
  Tv,
  Cpu,
  HardDrive,
  BatteryCharging,
  Package,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/** Preset category icons: key ↔ lucide component. Keys are stored in the DB `categories.icon` column. */
export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  smartphone: Smartphone,
  laptop: Laptop,
  tablet: Tablet,
  monitor: Monitor,
  headphones: Headphones,
  watch: Watch,
  camera: Camera,
  gamepad: Gamepad2,
  keyboard: Keyboard,
  mouse: Mouse,
  speaker: Speaker,
  tv: Tv,
  cpu: Cpu,
  harddrive: HardDrive,
  charger: BatteryCharging,
  package: Package,
};

/** Ordered list for the admin picker, with short Uzbek labels. */
export const CATEGORY_ICON_LIST: { key: string; label: string }[] = [
  { key: 'smartphone', label: 'Telefon' },
  { key: 'laptop', label: 'Noutbuk' },
  { key: 'tablet', label: 'Planshet' },
  { key: 'monitor', label: 'Monitor' },
  { key: 'headphones', label: 'Quloqchin' },
  { key: 'watch', label: 'Soat' },
  { key: 'camera', label: 'Kamera' },
  { key: 'gamepad', label: "O'yin" },
  { key: 'keyboard', label: 'Klaviatura' },
  { key: 'mouse', label: 'Sichqoncha' },
  { key: 'speaker', label: 'Kolonka' },
  { key: 'tv', label: 'Televizor' },
  { key: 'cpu', label: 'Komponent' },
  { key: 'harddrive', label: 'Disk' },
  { key: 'charger', label: 'Zaryad' },
  { key: 'package', label: 'Boshqa' },
];

/** Resolve a stored icon key to a component, falling back to a generic package icon. */
export function categoryIcon(key: string): LucideIcon {
  return CATEGORY_ICONS[key] ?? Package;
}
