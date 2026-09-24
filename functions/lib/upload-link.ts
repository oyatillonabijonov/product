import { createSession, verifySession } from './auth';

/** Yuklash havolasining umri — 30 daqiqa (spec 2026-09-24 §8). */
export const UPLOAD_TTL = 30 * 60;

/**
 * Admin sessiyasi bilan **bir xil sir, lekin boshqa kalit**. `requireAdmin` cookie'dagi tokenning ichidagi
 * ismni tekshirmaydi (imzo to'g'ri bo'lsa bas), shuning uchun yuklash tokenini aynan `session_secret` bilan
 * imzolash uni 30 daqiqalik **to'liq admin sessiyasiga** aylantirardi. Qo'shimcha bilan kalit ajraladi —
 * bir tomonning tokeni ikkinchisida o'tmaydi (`upload-link.test.ts`). Parol almashsa `session_secret`
 * aylanadi va hamma ochiq havola o'ladi.
 */
const keyOf = (sessionSecret: string) => `${sessionSecret}:yuklash`;

export function createUploadToken(productId: string, sessionSecret: string, now: number): Promise<string> {
  return createSession(productId, keyOf(sessionSecret), UPLOAD_TTL, now);
}

export function verifyUploadToken(token: string, sessionSecret: string, now: number): Promise<string | null> {
  return verifySession(token, keyOf(sessionSecret), now);
}
