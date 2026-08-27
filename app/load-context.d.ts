import type { Env } from '../shared/runtime';

declare module 'react-router' {
  interface AppLoadContext {
    /** Baza va rasm ombori — `server/index.ts` uzatadi. */
    env: Env;
  }
}

export {};
