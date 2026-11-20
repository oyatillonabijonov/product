import { useState } from 'react';
import type { FC } from 'react';
import { Cube, Desktop, DeviceMobile, DeviceTablet, Headphones, Laptop, VideoCamera } from '@phosphor-icons/react';
import type { Icon as PhIcon } from '@phosphor-icons/react';
import type { ApiDeviceModel } from '../../shared/types';
import { filterModels } from './lib/models';
import { IconTile, type Hue } from './ui';

/** Taklif qatoridagi ikonka — model yo'nalishiga qarab; registrda 0025'gacha bo'lgan qurilma turi id'lari turadi. */
const CAT_ICON: Record<string, { icon: PhIcon; hue: Hue }> = {
  telefonlar: { icon: DeviceMobile, hue: 'blue' },
  planshetlar: { icon: DeviceTablet, hue: 'teal' },
  noutbuklar: { icon: Laptop, hue: 'violet' },
  apple: { icon: DeviceMobile, hue: 'slate' },
  pc: { icon: Desktop, hue: 'orange' },
  audio: { icon: Headphones, hue: 'pink' },
  video: { icon: VideoCamera, hue: 'green' },
};
const FALLBACK = { icon: Cube, hue: 'violet' as Hue };

/**
 * Nom maydoni + model registri takliflari (↑/↓, Enter, Esc). `className` — kit `INPUT_CLS`.
 * Menyu suzuvchi oq yuza — soyasiz va hoshiyasiz (kulrang karta ustida fon bilan ajraladi).
 */
const ModelCombobox: FC<{
  models: ApiDeviceModel[];
  value: string;
  onChange: (text: string) => void;
  onPick: (m: ApiDeviceModel) => void;
  className?: string;
}> = ({ models, value, onChange, onPick, className }) => {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);

  const suggestions = filterModels(models, value, 8);
  const showDropdown = open && suggestions.length > 0;

  function pick(m: ApiDeviceModel) {
    onPick(m);
    setOpen(false);
  }

  return (
    <div className="relative">
      <input
        type="text"
        role="combobox"
        aria-expanded={showDropdown}
        aria-autocomplete="list"
        className={className}
        value={value}
        onFocus={() => { setOpen(true); setHighlight(0); }}
        onChange={(e) => { onChange(e.target.value); setOpen(true); setHighlight(0); }}
        onBlur={() => setOpen(false)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setHighlight((h) => Math.min(h + 1, suggestions.length - 1));
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHighlight((h) => Math.max(h - 1, 0));
          } else if (e.key === 'Enter') {
            if (showDropdown) {
              e.preventDefault();
              const m = suggestions[highlight];
              if (m) pick(m);
            }
          } else if (e.key === 'Escape') {
            setOpen(false);
          }
        }}
      />
      {showDropdown && (
        <div
          role="listbox"
          className="absolute z-20 mt-1.5 max-h-72 w-full animate-fade-in overflow-auto rounded-menu bg-surface-raised p-1 thin-scroll"
          onMouseDown={(e) => e.preventDefault()}
        >
          {suggestions.map((m, i) => {
            const c = CAT_ICON[m.categoryId] ?? FALLBACK;
            const meta = [m.brandId, m.chip].filter(Boolean).join(' · ');
            return (
              <button
                key={m.id}
                type="button"
                role="option"
                aria-selected={i === highlight}
                className={`flex w-full items-center gap-2.5 rounded-item px-2 py-1.5 text-left transition-colors duration-150 hover:bg-surface-sunken ${i === highlight ? 'bg-surface-sunken' : ''}`}
                onMouseEnter={() => setHighlight(i)}
                onClick={() => pick(m)}
              >
                <IconTile icon={c.icon} hue={c.hue} soft size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-base font-medium text-text">{m.name}</span>
                  {meta && <span className="block truncate text-sm capitalize text-text-muted">{meta}</span>}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ModelCombobox;
