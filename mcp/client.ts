import { errText } from '../src/admin/errText.ts';

/**
 * Admin API klienti. MCP hech qanday SQL yozmaydi — hamma yozuv shu API orqali,
 * ya'ni validatsiya, slug va atomik batch serverda qoladi.
 * Xato kodi o'zbekcha matnga `errText` bilan o'giriladi (admin bilan bir xil matn).
 */
export class AdminClient {
  // Node type-stripping parametr-xususiyatni qo'llab-quvvatlamaydi
  // (`constructor(private base)` → ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX), shuning uchun
  // maydonlar ochiq yoziladi — `server/` dagi qoida bilan bir xil (CLAUDE.md).
  private base: string;
  private token: string;

  constructor(base: string, token: string) {
    this.base = base;
    this.token = token;
  }

  private async send<T>(path: string, init: RequestInit & { tool?: string } = {}): Promise<T> {
    const { tool, ...rest } = init;
    const res = await fetch(new URL(path, this.base), {
      ...rest,
      headers: {
        ...(rest.headers as Record<string, string> | undefined),
        authorization: `Bearer ${this.token}`,
        ...(tool ? { 'x-mcp-tool': tool } : {}),
      },
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      const code = body.error ?? `http_${res.status}`;
      throw new Error(`${errText(new Error(code))} (${code})`);
    }
    return (await res.json()) as T;
  }

  get<T>(path: string): Promise<T> {
    return this.send<T>(path);
  }

  write<T>(path: string, method: 'POST' | 'PUT' | 'PATCH', body: unknown, tool: string): Promise<T> {
    return this.send<T>(path, {
      method,
      tool,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  /** Rasm yuklash — `/api/admin/upload` multipart kutadi va `{ imageUrl }` qaytaradi. */
  async upload(bytes: Uint8Array, filename: string, type: string, tool: string): Promise<string> {
    const form = new FormData();
    form.append('file', new Blob([bytes], { type }), filename);
    const { imageUrl } = await this.send<{ imageUrl: string }>('/api/admin/upload', { method: 'POST', body: form, tool });
    return imageUrl;
  }
}
