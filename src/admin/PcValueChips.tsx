import type { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Circuitry, Cpu, DesktopTower, Fan, GraphicsCard, HardDrive, Lightning, Memory, Sparkle } from './icons';
import type { Icon as PhIcon } from './icons';
import type { PartValues, PcDimension, SlotKey } from '../../shared/pc-compat';
import { dimLabel } from './lib/pc-parts';
import type { Hue } from './ui';

/** Bo'g'in ikonkasi va rangi — Konfigurator ekrani va tekshiruv oynasi bir xil belgini ko'rsatadi. */
export const SLOT_ICON: Record<SlotKey, PhIcon> = {
  cpu: Cpu, mb: Circuitry, ram: Memory, gpu: GraphicsCard, cooler: Fan, psu: Lightning, ssd: HardDrive, case: DesktopTower,
};
export const SLOT_HUE: Record<SlotKey, Hue> = {
  cpu: 'violet', mb: 'blue', ram: 'teal', gpu: 'green', cooler: 'slate', psu: 'amber', ssd: 'orange', case: 'pink',
};

/**
 * Tur bo'yicha qiymat chiplari (Konfigurator tabi va mahsulot tahriri). Tasdiqlangan — qora to'ldirilgan, belgi bilan;
 * tur bo'yicha hali qiymat yo'q bo'lsa nomdan taklif — yumshoq binafsha fon (hoshiyasiz) va "taklif" yozuvi. Bosish — `onToggle`.
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
    <div className="flex flex-col gap-3.5">
      {dims.map((d) => {
        const chosen = values[d.id] ?? [];
        return (
          <div key={d.id} className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-text">{t('configurator.question', { name: dimLabel(d, i18n.language) })}</span>
            <div className="flex flex-wrap gap-1.5">
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
                    className={`inline-flex h-control-md items-center gap-1.5 rounded-full px-3.5 text-base font-medium transition-[background-color,color,transform] duration-150 active:scale-[0.97] disabled:opacity-50 max-lg:h-11 ${
                      on
                        ? 'bg-primary text-text-on-primary hover:bg-primary-hover'
                        : hint
                          ? 'bg-accent-soft text-accent-text hover:bg-accent-soft/70'
                          : 'bg-surface-sunken text-text-muted hover:bg-surface-sunken-hover hover:text-text'
                    }`}
                  >
                    {on && <Check weight="bold" className="-ml-0.5 size-3.5" />}
                    {hint && <Sparkle weight="fill" className="-ml-0.5 size-3.5" />}
                    {v.label}
                    {hint && <span className="text-sm font-normal opacity-80">· {t('configurator.suggestion')}</span>}
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
