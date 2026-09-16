import { useState } from 'react';
import type { FC } from 'react';
import type { ApiDeviceModel } from '../../shared/types';
import { filterModels } from './lib/models';

/** Nom maydoni + model registri takliflari (↑/↓, Enter, Esc). `className` — kit `INPUT_CLS`. */
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
          className="absolute z-10 mt-1 max-h-64 w-full overflow-auto rounded-xs border border-line bg-surface"
          onMouseDown={(e) => e.preventDefault()}
        >
          {suggestions.map((m, i) => (
            <button
              key={m.id}
              type="button"
              className={`press block w-full px-3 py-2 text-left hover:bg-fill-2 ${i === highlight ? 'bg-fill-2' : ''}`}
              onClick={() => pick(m)}
            >
              <span className="text-para font-medium text-primary">{m.name}</span>
              <span className="ml-2 text-label text-muted">{m.brandId} · {m.categoryId}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ModelCombobox;
