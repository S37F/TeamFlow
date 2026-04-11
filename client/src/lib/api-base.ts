/** Base URL for API + WebSocket (no trailing slash). Empty = same origin as the page. */
export function getApiBaseUrl(): string {
  const raw = import.meta.env.VITE_API_URL as string | undefined;
  if (!raw?.trim()) return "";
  return raw.replace(/\/$/, "");
}

/** Resolve a path like `/api/user` against VITE_API_URL when set (split Vercel + API deploy). */
export function apiUrl(path: string): string {
  const base = getApiBaseUrl();
  const p = path.startsWith("/") ? path : `/${path}`;
  if (!base) return p;
  return `${base}${p}`;
}
