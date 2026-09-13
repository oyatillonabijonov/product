import type { Env } from '../shared/runtime';
import type { BillzSyncHandle } from '../server/billz-sync';

declare module 'react-router' {
  interface AppLoadContext {
    /** Baza va rasm ombori — `server/index.ts` uzatadi. */
    env: Env;
    /** Billz sinxronizatsiya runner'i (holat / ishga tushirish / do'konlar) — `server/index.ts` yaratadi. */
    billz: BillzSyncHandle;
  }
}

export {};
