import type { ApiProduct, ApiSettings } from '../../shared/types';

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

export async function createProduct(p: Partial<ApiProduct>): Promise<ApiProduct> {
  return handle(
    await fetch('/api/admin/products', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(p),
    }),
  );
}

export async function updateProduct(id: string, p: Partial<ApiProduct>): Promise<ApiProduct> {
  return handle(
    await fetch(`/api/admin/products/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(p),
    }),
  );
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
