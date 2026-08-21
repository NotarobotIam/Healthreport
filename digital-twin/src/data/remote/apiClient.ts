import { getStoredToken, clearStoredToken } from '../../auth/tokenStore';
import { API_BASE_URL } from '../../auth/handoff';

/** Thrown on a 401 — the caller's token was missing/expired/rejected. Callers should treat this as "fall back to the unauthenticated state", not a generic error. */
export class ApiAuthError extends Error {}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getStoredToken();
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });

  if (res.status === 401) {
    clearStoredToken();
    throw new ApiAuthError('Not authenticated');
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}) as { message?: string });
    throw new Error(body.message ?? `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export function apiGet<T>(path: string): Promise<T> {
  return request<T>(path);
}

export function apiPost<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, { method: 'POST', body: body !== undefined ? JSON.stringify(body) : undefined });
}
