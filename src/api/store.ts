import type { ApiProduct, ApiSettings } from '../../shared/types';
import type { InstallmentConfig, Product } from '../data/products';
import { installmentConfig as fallbackConfig, products as fallbackProducts } from '../data/products';

export interface StoreData {
  products: Product[];
  config: InstallmentConfig;
}

function mapProduct(p: ApiProduct): Product {
  return {
    id: p.id,
    name: p.name,
    category: p.category,
    condition: p.condition,
    conditionNote: p.conditionNote ?? undefined,
    image: p.imageUrl,
    cashPriceUzs: p.cashPriceUzs,
  };
}

function mapConfig(s: ApiSettings): InstallmentConfig {
  return {
    downPaymentPercent: s.downPaymentPercent,
    usdToUzs: s.usdToUzs,
    terms: s.terms,
  };
}

export async function fetchStore(): Promise<StoreData> {
  try {
    const [pRes, sRes] = await Promise.all([fetch('/api/products'), fetch('/api/settings')]);
    if (!pRes.ok || !sRes.ok) throw new Error('api_error');
    const apiProducts = (await pRes.json()) as ApiProduct[];
    const apiSettings = (await sRes.json()) as ApiSettings;
    if (apiProducts.length === 0) throw new Error('empty');
    return { products: apiProducts.map(mapProduct), config: mapConfig(apiSettings) };
  } catch {
    // API mavjud emas (masalan `bun run dev` sof Vite) — NAMUNA ma'lumotga qaytamiz.
    return { products: fallbackProducts, config: fallbackConfig };
  }
}
