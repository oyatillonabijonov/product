import { describe, it, expect } from 'vitest';
import { createSession, verifySession, sha256Hex, getCookie } from './auth';

const SECRET = 'test-secret';

describe('sha256Hex', () => {
  it('barqaror hex hash beradi', async () => {
    expect(await sha256Hex('parol')).toBe(await sha256Hex('parol'));
    expect(await sha256Hex('parol')).not.toBe(await sha256Hex('boshqa'));
  });
});

describe('session', () => {
  it('yaroqli sessiyani tekshiradi', async () => {
    const now = 1_700_000_000;
    const token = await createSession('admin', SECRET, 3600, now);
    expect(await verifySession(token, SECRET, now + 10)).toBe('admin');
  });

  it('muddati o\'tgan sessiyani rad etadi', async () => {
    const now = 1_700_000_000;
    const token = await createSession('admin', SECRET, 3600, now);
    expect(await verifySession(token, SECRET, now + 4000)).toBeNull();
  });

  it('buzilgan imzoni rad etadi', async () => {
    const now = 1_700_000_000;
    const token = await createSession('admin', SECRET, 3600, now);
    expect(await verifySession(token + 'x', SECRET, now + 10)).toBeNull();
    expect(await verifySession(token, 'wrong-secret', now + 10)).toBeNull();
  });
});

describe('getCookie', () => {
  it('cookie qiymatini ajratadi', () => {
    const req = new Request('https://x', { headers: { cookie: 'a=1; session=abc; b=2' } });
    expect(getCookie(req, 'session')).toBe('abc');
    expect(getCookie(req, 'yoq')).toBeNull();
  });
});
