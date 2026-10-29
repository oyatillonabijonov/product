import { describe, expect, it } from 'vitest';
import { readJson, readText } from './body';

/** Content-Length'siz (chunked kabi) oqimli tana. */
function streamed(parts: string[]): Request {
  const enc = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    start(c) {
      for (const p of parts) c.enqueue(enc.encode(p));
      c.close();
    },
  });
  return new Request('http://x/', { method: 'POST', body, duplex: 'half' } as RequestInit);
}

describe('readText', () => {
  it('chegaradagi tanani o\'qiydi', async () => {
    expect(await readText(streamed(['ab', 'cd']), 4)).toBe('abcd');
  });

  it('Content-Length bo\'lmasa ham baytlarni sanab 413 beradi', async () => {
    const r = await readText(streamed(['abc', 'de']), 4);
    expect(r).toBeInstanceOf(Response);
    expect((r as Response).status).toBe(413);
    expect((r as Response).headers.get('connection')).toBe('close');
  });

  it('e\'lon qilingan Content-Length katta bo\'lsa o\'qimasdan rad etadi', async () => {
    const req = new Request('http://x/', { method: 'POST', body: 'x', headers: { 'content-length': '99999' } });
    const r = await readText(req, 10);
    expect((r as Response).status).toBe(413);
  });

  it('ko\'p baytli UTF-8 belgilarni bo\'laklar orasida buzmaydi', async () => {
    const bytes = new TextEncoder().encode('so\'m — сум');
    const body = new ReadableStream<Uint8Array>({
      start(c) { c.enqueue(bytes.slice(0, 7)); c.enqueue(bytes.slice(7)); c.close(); },
    });
    const req = new Request('http://x/', { method: 'POST', body, duplex: 'half' } as RequestInit);
    expect(await readText(req, 100)).toBe('so\'m — сум');
  });

  it('tanasiz so\'rov — bo\'sh satr', async () => {
    expect(await readText(new Request('http://x/', { method: 'POST' }), 10)).toBe('');
  });
});

describe('readJson', () => {
  it('JSONni tahlil qiladi', async () => {
    expect(await readJson(streamed(['{"a":', '1}']), 100)).toEqual({ a: 1 });
  });

  it('buzuq JSON — null', async () => {
    expect(await readJson(streamed(['{oops']), 100)).toBeNull();
  });

  it('katta tana — 413 Response', async () => {
    const r = await readJson(streamed(['{"a":"' + 'x'.repeat(50) + '"}']), 16);
    expect((r as Response).status).toBe(413);
  });
});
