import type { ApiCategory } from '../../shared/types';
import { categories as fallbackCategories } from '../data/products';

export async function fetchCategories(): Promise<ApiCategory[]> {
  try {
    const res = await fetch('/api/categories');
    if (!res.ok) throw new Error('api_error');
    const cats = (await res.json()) as ApiCategory[];
    if (cats.length === 0) throw new Error('empty');
    return cats;
  } catch {
    return fallbackCategories;
  }
}
