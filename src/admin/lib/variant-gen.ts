import type { AdminVariantInput } from '../api';

export interface OptionDraft {
  name: string;
  values: string[];
}

export function optionValuesKey(optionValues: { optionName: string; value: string }[]): string {
  return JSON.stringify(
    [...optionValues].sort((a, b) => a.optionName.localeCompare(b.optionName) || a.value.localeCompare(b.value)),
  );
}

export function cartesianProduct(options: OptionDraft[]): { optionName: string; value: string }[][] {
  return options.reduce<{ optionName: string; value: string }[][]>(
    (acc, opt) => {
      if (opt.values.length === 0) return acc;
      const next: { optionName: string; value: string }[][] = [];
      for (const combo of acc) {
        for (const value of opt.values) {
          next.push([...combo, { optionName: opt.name, value }]);
        }
      }
      return next;
    },
    [[]],
  );
}

export function generateVariants(options: OptionDraft[], existing: AdminVariantInput[]): AdminVariantInput[] {
  const valid = options.filter((o) => o.name.trim() !== '' && o.values.length > 0);
  if (valid.length === 0) return [];
  const combos = cartesianProduct(valid);
  const byKey = new Map(existing.map((v) => [optionValuesKey(v.optionValues), v]));
  const validNames = new Set(valid.map((o) => o.name));
  return combos.map((combo) => {
    const exact = byKey.get(optionValuesKey(combo));
    if (exact) return { ...exact, optionValues: combo };
    const projected = existing.find((v) => {
      const shared = v.optionValues.filter((ov) => validNames.has(ov.optionName));
      return shared.length > 0 && shared.every((ov) => combo.some((c) => c.optionName === ov.optionName && c.value === ov.value));
    });
    return projected
      ? { ...projected, sku: null, optionValues: combo }
      : { sku: null, cashPriceUzs: 0, oldPriceUzs: null, imageUrl: null, inStock: true, optionValues: combo };
  });
}
