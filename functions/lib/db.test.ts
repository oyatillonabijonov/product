import { describe, expect, it } from 'vitest';
import { openDatabase } from '../../server/sqlite';
import type { Env, ImageStore } from '../env';
import { lockDelaySeconds } from './auth';
import { reserveLoginAttempt, updateLoginThrottle } from './db';

function env(): Env {
  const DB = openDatabase(':memory:');
  return { DB, IMAGES: {} as ImageStore };
}

async function adminEnv(): Promise<Env> {
  const e = env();
  await e.DB.prepare('CREATE TABLE admin_auth (id INTEGER PRIMARY KEY, failed_attempts INTEGER NOT NULL DEFAULT 0, lock_until INTEGER NOT NULL DEFAULT 0)').run();
  await e.DB.prepare('INSERT INTO admin_auth (id) VALUES (1)').run();
  return e;
}

async function state(e: Env) {
  return e.DB.prepare('SELECT failed_attempts AS n, lock_until AS l FROM admin_auth WHERE id = 1').first<{ n: number; l: number }>();
}

describe('reserveLoginAttempt', () => {
  it('parallel 6 ta urinish hisobni yo\'qotmaydi va qulflaydi', async () => {
    const e = await adminEnv();
    const now = 1_000_000;
    const results = await Promise.all(Array.from({ length: 6 }, () => reserveLoginAttempt(e, now)));
    // 5-urinish qulfni qo'yadi, 6-si o'tmaydi.
    expect(results.filter((r) => r.ok).length).toBe(5);
    const s = await state(e);
    expect(s?.n).toBe(5);
    expect(s?.l).toBe(now + 60);
    expect(await reserveLoginAttempt(e, now)).toEqual({ ok: false, retryAfter: 60 });
  });

  it('qulf muddati lockDelaySeconds bilan bir xil (cap 600 s gacha)', async () => {
    const e = await adminEnv();
    let now = 0;
    for (let n = 1; n <= 12; n++) {
      const r = await reserveLoginAttempt(e, now);
      expect(r.ok).toBe(true);
      const s = await state(e);
      expect(s?.n).toBe(n);
      const delay = lockDelaySeconds(n);
      expect(s?.l).toBe(delay > 0 ? now + delay : 0);
      now = (s?.l ?? 0) + 1; // qulf tugagach keyingi urinish
    }
  });

  it('muvaffaqiyatdan keyingi tozalash hisobni nolga qaytaradi', async () => {
    const e = await adminEnv();
    await reserveLoginAttempt(e, 10);
    await updateLoginThrottle(e, 0, 0);
    expect(await state(e)).toEqual({ n: 0, l: 0 });
  });
});
