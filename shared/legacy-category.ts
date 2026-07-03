import type { Category } from './types';

export function deriveLegacyCategory(categoryId: string | null): Category {
  switch (categoryId) {
    case 'telefonlar': return 'iphone';
    case 'planshetlar': return 'ipad';
    case 'noutbuklar': return 'mac';
    default: return 'pc';
  }
}
