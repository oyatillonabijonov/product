import { describe, it, expect } from 'vitest';
import {
  createSession,
  verifySession,
  hashPassword,
  verifyPassword,
  randomSaltHex,
  randomSecretHex,
  getCookie,
  lockDelaySeconds,
  LOGIN_LOCK_THRESHOLD,
} from './auth';

const SECRET = 'test-secret';

describe('password (PBKDF2)', () => {
  it('bir xil salt bilan barqaror hash beradi', async () => {
    const salt = randomSaltHex();
    expect(await hashPassword('parol', salt)).toBe(await hashPassword('parol', salt));
    expect(await hashPassword('parol', salt)).not.toBe(await hashPassword('boshqa', salt));
  });

  it('har xil salt har xil hash beradi', async () => {
    expect(await hashPassword('parol', randomSaltHex())).not.toBe(await hashPassword('parol', randomSaltHex()));
  });

  it('togri parolni tasdiqlaydi, notogrini rad etadi', async () => {
    const salt = randomSaltHex();
    const hash = await hashPassword('parol', salt);
    expect(await verifyPassword('parol', salt, hash)).toBe(true);
    expect(await verifyPassword('boshqa', salt, hash)).toBe(false);
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

describe('lockDelaySeconds (login throttle)', () => {
  it('chegaradan pastda qulflamaydi', () => {
    for (let i = 0; i < LOGIN_LOCK_THRESHOLD; i++) expect(lockDelaySeconds(i)).toBe(0);
  });

  it('chegaradan boshlab eksponensial oshadi', () => {
    expect(lockDelaySeconds(LOGIN_LOCK_THRESHOLD)).toBe(60);
    expect(lockDelaySeconds(LOGIN_LOCK_THRESHOLD + 1)).toBe(120);
    expect(lockDelaySeconds(LOGIN_LOCK_THRESHOLD + 2)).toBe(240);
  });

  it('1 soatda to\'xtaydi', () => {
    expect(lockDelaySeconds(LOGIN_LOCK_THRESHOLD + 6)).toBe(3600);
    expect(lockDelaySeconds(LOGIN_LOCK_THRESHOLD + 50)).toBe(3600);
  });
});

describe('randomSecretHex', () => {
  it('256-bit hex qaytaradi va takrorlanmaydi', () => {
    const a = randomSecretHex();
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(randomSecretHex()).not.toBe(a);
  });
});

describe('getCookie', () => {
  it('cookie qiymatini ajratadi', () => {
    const req = new Request('https://x', { headers: { cookie: 'a=1; session=abc; b=2' } });
    expect(getCookie(req, 'session')).toBe('abc');
    expect(getCookie(req, 'yoq')).toBeNull();
  });
});
