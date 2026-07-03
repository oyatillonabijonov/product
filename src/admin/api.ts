import type {
  ApiBanner,
  ApiBrand,
  ApiCategory,
  ApiDeviceModel,
  ApiOption,
  ApiPage,
  ApiProduct,
  ApiSettings,
  ApiSiteConfig,
  ApiSpec,
  ApiVariant,
} from '../../shared/types';

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error ?? `http_${res.status}`);
  }
  return (await res.json()) as T;
}

export async function login(username: string, password: string): Promise<void> {
  await handle(
    await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username, password }),
    }),
  );
}

export async function logout(): Promise<void> {
  await fetch('/api/admin/logout', { method: 'POST' });
}

export async function getMe(): Promise<{ username: string }> {
  return handle(await fetch('/api/admin/me'));
}

export async function listProducts(): Promise<ApiProduct[]> {
  return handle(await fetch('/api/admin/products'));
}

export interface AdminVariantInput {
  sku?: string | null;
  cashPriceUzs: number;
  oldPriceUzs?: number | null;
  imageUrl?: string | null;
  inStock: boolean;
  optionValues: { optionName: string; value: string }[];
}

export interface AdminProductInput extends Partial<ApiProduct> {
  images?: string[];
  specs?: ApiSpec[];
  description?: string | null;
  brandId?: string | null;
  slug?: string | null;
  options?: { name: string; values: string[] }[];
  variants?: AdminVariantInput[];
}

export interface AdminProductDetail extends ApiProduct {
  description: string | null;
  images: string[];
  specs: ApiSpec[];
  brand: ApiBrand | null;
  options: ApiOption[];
  variants: ApiVariant[];
}

export async function createProduct(p: AdminProductInput): Promise<ApiProduct> {
  return handle(
    await fetch('/api/admin/products', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(p),
    }),
  );
}

export async function updateProduct(id: string, p: AdminProductInput): Promise<ApiProduct> {
  return handle(
    await fetch(`/api/admin/products/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(p),
    }),
  );
}

export async function getProductDetail(id: string): Promise<AdminProductDetail> {
  return handle(await fetch(`/api/products/${encodeURIComponent(id)}`));
}

export async function listCategories(): Promise<ApiCategory[]> {
  return handle(await fetch('/api/admin/categories'));
}

export async function createCategory(c: Partial<ApiCategory>): Promise<ApiCategory> {
  return handle(
    await fetch('/api/admin/categories', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(c),
    }),
  );
}

export async function updateCategory(id: string, c: Partial<ApiCategory>): Promise<ApiCategory> {
  return handle(
    await fetch(`/api/admin/categories/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(c),
    }),
  );
}

export async function deleteCategory(id: string): Promise<void> {
  await handle(await fetch(`/api/admin/categories/${encodeURIComponent(id)}`, { method: 'DELETE' }));
}

export async function listBrands(): Promise<ApiBrand[]> {
  return handle(await fetch('/api/admin/brands'));
}

export async function createBrand(b: Partial<ApiBrand>): Promise<ApiBrand> {
  return handle(
    await fetch('/api/admin/brands', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(b),
    }),
  );
}

export async function updateBrand(id: string, b: Partial<ApiBrand>): Promise<ApiBrand> {
  return handle(
    await fetch(`/api/admin/brands/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(b),
    }),
  );
}

export async function deleteBrand(id: string): Promise<void> {
  await handle(await fetch(`/api/admin/brands/${encodeURIComponent(id)}`, { method: 'DELETE' }));
}

export async function deleteProduct(id: string): Promise<void> {
  await handle(await fetch(`/api/admin/products/${encodeURIComponent(id)}`, { method: 'DELETE' }));
}

export async function getSettings(): Promise<ApiSettings> {
  return handle(await fetch('/api/settings'));
}

export async function updateSettings(s: ApiSettings): Promise<ApiSettings> {
  return handle(
    await fetch('/api/admin/settings', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(s),
    }),
  );
}

export async function uploadImage(file: File): Promise<{ imageUrl: string }> {
  const fd = new FormData();
  fd.append('file', file);
  return handle(await fetch('/api/admin/upload', { method: 'POST', body: fd }));
}

export async function listBanners(): Promise<ApiBanner[]> {
  return handle(await fetch('/api/admin/banners'));
}
export async function createBanner(b: Partial<ApiBanner>): Promise<ApiBanner> {
  return handle(await fetch('/api/admin/banners', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b),
  }));
}
export async function updateBanner(id: string, b: Partial<ApiBanner>): Promise<ApiBanner> {
  return handle(await fetch(`/api/admin/banners/${encodeURIComponent(id)}`, {
    method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b),
  }));
}
export async function deleteBanner(id: string): Promise<void> {
  await handle(await fetch(`/api/admin/banners/${encodeURIComponent(id)}`, { method: 'DELETE' }));
}

export async function listPages(): Promise<ApiPage[]> {
  return handle(await fetch('/api/admin/pages'));
}
export async function createPage(p: Partial<ApiPage>): Promise<ApiPage> {
  return handle(await fetch('/api/admin/pages', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(p),
  }));
}
export async function updatePage(id: string, p: Partial<ApiPage>): Promise<ApiPage> {
  return handle(await fetch(`/api/admin/pages/${encodeURIComponent(id)}`, {
    method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(p),
  }));
}
export async function deletePage(id: string): Promise<void> {
  await handle(await fetch(`/api/admin/pages/${encodeURIComponent(id)}`, { method: 'DELETE' }));
}

export async function listDeviceModels(): Promise<ApiDeviceModel[]> {
  return handle(await fetch('/api/admin/models'));
}
export async function createDeviceModel(m: Partial<ApiDeviceModel>): Promise<ApiDeviceModel> {
  return handle(await fetch('/api/admin/models', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(m),
  }));
}
export async function updateDeviceModel(id: string, m: Partial<ApiDeviceModel>): Promise<ApiDeviceModel> {
  return handle(await fetch(`/api/admin/models/${encodeURIComponent(id)}`, {
    method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(m),
  }));
}
export async function deleteDeviceModel(id: string): Promise<void> {
  await handle(await fetch(`/api/admin/models/${encodeURIComponent(id)}`, { method: 'DELETE' }));
}

export async function getSiteConfig(): Promise<ApiSiteConfig> {
  return handle(await fetch('/api/admin/site-config'));
}
export async function updateSiteConfig(c: ApiSiteConfig): Promise<ApiSiteConfig> {
  return handle(await fetch('/api/admin/site-config', {
    method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(c),
  }));
}
