import type { FC } from 'react';
import { useTranslation } from 'react-i18next';
import type { PartValues, PcDimension } from '../../shared/pc-compat';
import { dimLabel } from './lib/pc-parts';

/**
 * Tur bo'yicha qiymat chiplari (Konfigurator tabi va mahsulot tahriri). Tasdiqlangan — to'ldirilgan;
 * tur bo'yicha hali qiymat yo'q bo'lsa nomdan taklif — punktir chegara va "taklif" yozuvi. Bosish — `onToggle`.
 * Har tur savol bo'lib chiqadi («Soket qaysi?»), nomi admin tilida (ruschasi bo'sh bo'lsa o'zbekchasi).
 */
const PcValueChips: FC<{
  dims: PcDimension[];
  values: PartValues;
  suggested?: PartValues;
  disabled?: boolean;
  onToggle: (dimensionId: number, valueId: number) => void;
}> = ({ dims, values, suggested = {}, disabled, onToggle }) => {
  const { t, i18n } = useTranslation('products');
  return (
    <div className="flex flex-col gap-4">
      {dims.map((d) => {
        const chosen = values[d.id] ?? [];
        return (
          <div key={d.id} className="flex flex-col gap-2">
            <span className="text-para font-medium text-primary">{t('configurator.question', { name: dimLabel(d, i18n.language) })}</span>
            <div className="flex flex-wrap gap-2">
              {d.values.map((v) => {
                const on = chosen.includes(v.id);
                const hint = chosen.length === 0 && (suggested[d.id] ?? []).includes(v.id);
                return (
                  <button
                    key={v.id}
                    type="button"
                    disabled={disabled}
                    aria-pressed={on}
                    onClick={() => onToggle(d.id, v.id)}
                    className={`press h-11 rounded-full border px-4 text-para disabled:opacity-50 ${
                      on ? 'border-accent bg-accent text-bg' : hint ? 'border-dashed border-muted-3 text-primary' : 'border-line text-muted'
                    }`}
                  >
                    {v.label}
                    {hint && <span className="ml-1 text-label text-muted-2">· {t('configurator.suggestion')}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default PcValueChips;
