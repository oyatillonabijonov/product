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

async function fetchProducts(): Promise<Product[]> {
  try {
    const res = await fetch('/api/products');
    if (!res.ok) throw new Error('api_error');
    const apiProducts = (await res.json()) as ApiProduct[];
    if (apiProducts.length === 0) throw new Error('empty');
    return apiProducts.map(mapProduct);
  } catch {
    return fallbackProducts;
  }
}

async function fetchConfig(): Promise<InstallmentConfig> {
  try {
    const res = await fetch('/api/settings');
    if (!res.ok) throw new Error('api_error');
    return mapConfig((await res.json()) as ApiSettings);
  } catch {
    return fallbackConfig;
  }
}

export async function fetchStore(): Promise<StoreData> {
  const [products, config] = await Promise.all([fetchProducts(), fetchConfig()]);
  return { products, config };
}
