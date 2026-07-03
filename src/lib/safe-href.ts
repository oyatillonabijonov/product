const SAFE_HREF_RE = /^(\/|https?:\/\/)/i;

export function safeHref(url: string): string | null {
  const u = url.trim();
  if (u === '' || !SAFE_HREF_RE.test(u)) return null;
  return u;
}
