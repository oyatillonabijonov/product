import type { ApiOption, ApiVariant } from '../../shared/types';

export type VariantSelection = Record<string, string>;

function valueMap(options: ApiOption[]): Map<string, { optionName: string; value: string }> {
  const m = new Map<string, { optionName: string; value: string }>();
  for (const o of options) for (const v of o.values) m.set(v.id, { optionName: o.name, value: v.value });
  return m;
}

export function variantSelection(variant: ApiVariant, options: ApiOption[]): VariantSelection {
  const m = valueMap(options);
  const sel: VariantSelection = {};
  for (const id of variant.optionValueIds) {
    const e = m.get(id);
    if (e) sel[e.optionName] = e.value;
  }
  return sel;
}

export function defaultSelection(options: ApiOption[], variants: ApiVariant[]): VariantSelection | null {
  if (variants.length === 0) return null;
  const inStock = variants.filter((v) => v.inStock);
  const pool = inStock.length > 0 ? inStock : variants;
  const cheapest = pool.reduce((a, b) => (b.cashPriceUzs < a.cashPriceUzs ? b : a));
  return variantSelection(cheapest, options);
}

function matches(variant: ApiVariant, options: ApiOption[], selection: VariantSelection): boolean {
  const sel = variantSelection(variant, options);
  const keys = Object.keys(selection);
  if (Object.keys(sel).length !== keys.length) return false;
  return keys.every((k) => sel[k] === selection[k]);
}

export function resolveVariant(
  options: ApiOption[], variants: ApiVariant[], selection: VariantSelection,
): ApiVariant | null {
  return variants.find((v) => matches(v, options, selection)) ?? null;
}

export function isValueAvailable(
  options: ApiOption[], variants: ApiVariant[], selection: VariantSelection,
  optionName: string, value: string,
): boolean {
  return resolveVariant(options, variants, { ...selection, [optionName]: value }) !== null;
}

export function selectionLabel(options: ApiOption[], selection: VariantSelection): string {
  return options
    .filter((o) => selection[o.name] !== undefined)
    .map((o) => `${o.name}: ${selection[o.name]}`)
    .join(', ');
}
