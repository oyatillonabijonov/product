import { describe, it, expect } from 'vitest';
import { modelToSpecs, mergeSpecs, filterModels } from './models';
import type { ApiDeviceModel, ApiSpec } from '../../../shared/types';

const model = (over: Partial<ApiDeviceModel> = {}): ApiDeviceModel => ({
  id: '1', name: 'iPhone 16 Pro Max', brandId: 'b1', categoryId: 'c1', legacyCategory: 'iphone',
  chip: 'A18 Pro', ram: '8GB', camera: '48MP', display: '6.9"', sortOrder: 0, ...over,
});

describe('modelToSpecs', () => {
  it('maps the 4 Uzbek labels and skips empty fields', () => {
    const specs = modelToSpecs(model({ name: 'MacBook Air', camera: '' }));
    expect(specs).toEqual([
      { label: 'Protsessor', value: 'A18 Pro' },
      { label: 'Operativ xotira', value: '8GB' },
      { label: 'Displey', value: '6.9"' },
    ]);
  });

  it('includes all 4 when all fields present', () => {
    const specs = modelToSpecs(model());
    expect(specs.map((s) => s.label)).toEqual(['Protsessor', 'Operativ xotira', 'Kamera', 'Displey']);
  });
});

describe('mergeSpecs', () => {
  it('replaces matching labels case-insensitively, keeps admin extras, appends new incoming', () => {
    const current: ApiSpec[] = [
      { label: 'protsessor', value: 'old chip' },
      { label: 'Og\'irligi', value: '200g' }, // admin extra, no match in incoming
    ];
    const incoming: ApiSpec[] = [
      { label: 'Protsessor', value: 'A18 Pro' },
      { label: 'Kamera', value: '48MP' },
    ];
    const merged = mergeSpecs(current, incoming);
    expect(merged).toEqual([
      { label: 'Protsessor', value: 'A18 Pro' },
      { label: 'Og\'irligi', value: '200g' },
      { label: 'Kamera', value: '48MP' },
    ]);
  });
});

describe('filterModels', () => {
  const models: ApiDeviceModel[] = [
    model({ id: '1', name: 'iPhone 16 Pro Max' }),
    model({ id: '2', name: 'iPhone 16' }),
    model({ id: '3', name: 'MacBook Air' }),
  ];

  it('matches all tokens case-insensitively', () => {
    const result = filterModels(models, '16 pro');
    expect(result.map((m) => m.id)).toEqual(['1']);
  });

  it('empty query returns first `limit` models', () => {
    expect(filterModels(models, '', 2).map((m) => m.id)).toEqual(['1', '2']);
  });

  it('respects limit', () => {
    expect(filterModels(models, '', 1)).toHaveLength(1);
  });

  it('is case-insensitive', () => {
    expect(filterModels(models, 'MACBOOK').map((m) => m.id)).toEqual(['3']);
  });
});
