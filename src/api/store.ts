import type { ApiProduct, ApiSettings, ApiCategory, ApiSpec } from '../../shared/types';
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
    oldPriceUzs: p.oldPriceUzs ?? null,
  };
}

function mapConfig(s: ApiSettings): InstallmentConfig {
  return {
    downPaymentPercent: s.downPaymentPercent,
    usdToUzs: s.usdToUzs,
    terms: s.terms,
  };
}

export interface ProductDetail extends Product {
  oldPriceUzs: number | null;
  description: string | null;
  images: string[];
  specs: ApiSpec[];
}

export async function fetchCategories(): Promise<ApiCategory[]> {
  try {
    const res = await fetch('/api/categories');
    if (!res.ok) throw new Error('api_error');
    return (await res.json()) as ApiCategory[];
  } catch {
    return [];
  }
}

export async function fetchProductsBy(params: { category?: string; q?: string }): Promise<Product[]> {
  try {
    const usp = new URLSearchParams();
    if (params.category) usp.set('category', params.category);
    if (params.q) usp.set('q', params.q);
    const res = await fetch(`/api/products?${usp.toString()}`);
    if (!res.ok) throw new Error('api_error');
    const apiProducts = (await res.json()) as ApiProduct[];
    return apiProducts.map(mapProduct);
  } catch {
    return [];
  }
}

export async function fetchProductDetail(id: string): Promise<ProductDetail | null> {
  try {
    const res = await fetch(`/api/products/${encodeURIComponent(id)}`);
    if (!res.ok) throw new Error('api_error');
    const d = (await res.json()) as ApiProduct & {
      oldPriceUzs: number | null;
      description: string | null;
      images: string[];
      specs: ApiSpec[];
    };
    return {
      ...mapProduct(d),
      oldPriceUzs: d.oldPriceUzs,
      description: d.description,
      images: d.images,
      specs: d.specs,
    };
  } catch {
    return null;
  }
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
