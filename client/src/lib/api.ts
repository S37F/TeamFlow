import { apiUrl } from "./api-base";

// Token management — store access token in memory (not localStorage) for security
let accessToken: string | null = null;

function resolveFetchUrl(url: string): string {
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return apiUrl(url);
}

export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

// Refresh token rotation — uses httpOnly cookie automatically
async function refreshAccessToken(): Promise<string | null> {
  try {
    const res = await fetch(resolveFetchUrl("/api/auth/refresh"), {
      method: "POST",
      credentials: "include",
    });
    
    if (!res.ok) {
      setAccessToken(null);
      return null;
    }
    
    const data = await res.json();
    setAccessToken(data.accessToken);
    return data.accessToken;
  } catch {
    setAccessToken(null);
    return null;
  }
}

// Authenticated fetch wrapper — handles token refresh on 401
export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const headers = new Headers(options.headers);
  
  const token = getAccessToken();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  
  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const target = resolveFetchUrl(url);

  let res = await fetch(target, {
    ...options,
    headers,
    credentials: "include",
  });

  // If 401 with TOKEN_EXPIRED, try refreshing
  if (res.status === 401) {
    const errorData = await res.clone().json().catch(() => null);
    if (errorData?.code === "TOKEN_EXPIRED" || errorData?.code === "TOKEN_MISSING") {
      const newToken = await refreshAccessToken();
      if (newToken) {
        headers.set("Authorization", `Bearer ${newToken}`);
        res = await fetch(target, {
          ...options,
          headers,
          credentials: "include",
        });
      }
    }
  }

  return res;
}
