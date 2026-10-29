import { describe, it, expect, vi, afterEach } from 'vitest';
import { AdminClient } from './mcp-client.ts';
import { productPath, registerSharedTools, type McpToolHost } from './mcp-register.ts';

describe('productPath', () => {
  it('oddiy id products ichida qoladi', () => {
    expect(productPath('iphone-16-pro')).toBe('/api/admin/products/iphone-16-pro');
    expect(productPath('abc', '/upload-link')).toBe('/api/admin/products/abc/upload-link');
  });

  it("'', '.' va '..' ni rad etadi", () => {
    for (const id of ['', '.', '..']) expect(() => productPath(id), id).toThrow();
  });

  it("slash, '?' va '%' kodlanadi — yo'l products'dan chiqmaydi", () => {
    for (const id of ['../site-config', '%2e%2e/site-config', '../billz?', 'a#b']) {
      const url = new URL(productPath(id, '/upload-link'), 'https://shop.test');
      expect(url.pathname.startsWith('/api/admin/products/'), id).toBe(true);
      expect(url.pathname.split('/').filter(Boolean)).toHaveLength(5);
      expect(url.search + url.hash).toBe('');
    }
  });
});

describe('AdminClient + product tool\'lari', () => {
  afterEach(() => vi.unstubAllGlobals());

  const setup = () => {
    const fetchMock = vi.fn(async (_url: URL) => new Response(JSON.stringify({ error: 'not_found' }), { status: 404 }));
    vi.stubGlobal('fetch', fetchMock);
    const api = new AdminClient('https://shop.test', 'prod_x');
    const tools = new Map<string, (args: unknown) => Promise<unknown>>();
    const host: McpToolHost = { registerTool: (name, _cfg, run) => { tools.set(name, run); } };
    registerSharedTools(host, api, { adminUrl: 'https://shop.test' });
    return { api, fetchMock, tools };
  };

  it("AdminClient o'zgargan yo'lga so'rov yubormaydi", async () => {
    const { api, fetchMock } = setup();
    for (const p of ['/api/admin/products/../site-config', '/api/admin/products/%2e%2e/site-config', '/api/admin/products/x#y']) {
      await expect(api.get(p), p).rejects.toThrow("Noto'g'ri yo'l");
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("product_get/image_upload_link — so'rov faqat /api/admin/products/<id> ga ketadi", async () => {
    const { fetchMock, tools } = setup();
    for (const id of ['../site-config', '%2e%2e/site-config', 'iphone-16']) {
      await expect(tools.get('product_get')!({ id })).rejects.toThrow();
    }
    await expect(tools.get('image_upload_link')!({ id: '../billz?' })).rejects.toThrow();
    await expect(tools.get('product_get')!({ id: '..' })).rejects.toThrow();
    const paths = fetchMock.mock.calls.map(([u]) => u.pathname);
    expect(paths).toEqual([
      '/api/admin/products/..%2Fsite-config',
      '/api/admin/products/%252e%252e%2Fsite-config',
      '/api/admin/products/iphone-16',
      '/api/admin/products/..%2Fbillz%3F/upload-link',
    ]);
    for (const [u] of fetchMock.mock.calls) expect(u.search).toBe('');
  });
});
