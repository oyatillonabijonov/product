import type { ApiProduct, ApiSettings, ApiCategory, ApiSpec } from '../../shared/types';
import type { InstallmentConfig, Product } from '../data/products';
import {
  installmentConfig as fallbackConfig,
  products as fallbackProducts,
  categories as fallbackCategories,
  fallbackCategoryOf,
} from '../data/products';

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
    const cats = (await res.json()) as ApiCategory[];
    if (cats.length === 0) throw new Error('empty');
    return cats;
  } catch {
    return fallbackCategories;
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
    let items = fallbackProducts;
    if (params.category) items = items.filter((p) => fallbackCategoryOf(p) === params.category);
    if (params.q) {
      const q = params.q.toLowerCase();
      items = items.filter((p) => p.name.toLowerCase().includes(q));
    }
    return items;
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
    const p = fallbackProducts.find((x) => x.id === id);
    if (!p) return null;
    return {
      ...p,
      oldPriceUzs: p.oldPriceUzs ?? null,
      description: null,
      images: p.image ? [p.image] : [],
      specs: [],
    };
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
