import type { ApiBrand, ApiCategory, ApiProduct, ApiSettings, ApiSpec } from '../../shared/types';

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

export interface AdminProductInput extends Partial<ApiProduct> {
  images?: string[];
  specs?: ApiSpec[];
  description?: string | null;
}

export interface AdminProductDetail extends ApiProduct {
  description: string | null;
  images: string[];
  specs: ApiSpec[];
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
