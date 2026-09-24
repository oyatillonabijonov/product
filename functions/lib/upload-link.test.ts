import { describe, it, expect } from 'vitest';
import { createSession, verifySession } from './auth';
import { createUploadToken, verifyUploadToken, UPLOAD_TTL } from './upload-link';

const SECRET = 'a'.repeat(64);
const NOW = 1_800_000_000;

describe('yuklash havolasi tokeni', () => {
  it("imzolangan tovar id'sini qaytaradi", async () => {
    const t = await createUploadToken('iphone-18-pro', SECRET, NOW);
    expect(await verifyUploadToken(t, SECRET, NOW + 60)).toBe('iphone-18-pro');
  });

  it('30 daqiqadan keyin o\'ladi', async () => {
    const t = await createUploadToken('p1', SECRET, NOW);
    expect(UPLOAD_TTL).toBe(1800);
    expect(await verifyUploadToken(t, SECRET, NOW + UPLOAD_TTL + 1)).toBeNull();
  });

  it('buzilgan token o\'tmaydi', async () => {
    const t = await createUploadToken('p1', SECRET, NOW);
    expect(await verifyUploadToken(`${t}x`, SECRET, NOW)).toBeNull();
    expect(await verifyUploadToken('salom', SECRET, NOW)).toBeNull();
  });

  it("admin parol almashsa (session_secret aylansa) hamma havola o'ladi", async () => {
    const t = await createUploadToken('p1', SECRET, NOW);
    expect(await verifyUploadToken(t, 'b'.repeat(64), NOW)).toBeNull();
  });

  it('admin sessiya tokeni yuklash tokeni sifatida o\'tmaydi', async () => {
    const adminCookie = await createSession('admin', SECRET, 3600, NOW);
    expect(await verifyUploadToken(adminCookie, SECRET, NOW)).toBeNull();
  });

  it('yuklash tokeni admin sessiyasi sifatida o\'tmaydi — aks holda havola 30 daqiqalik admin kaliti bo\'lardi', async () => {
    const t = await createUploadToken('p1', SECRET, NOW);
    expect(await verifySession(t, SECRET, NOW)).toBeNull();
  });
});
