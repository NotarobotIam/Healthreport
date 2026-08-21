import { setStoredToken } from './tokenStore';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5000/api';

let bootstrapPromise: Promise<void> | null = null;

/**
 * Reads a one-time handoff `?code=` from the URL (set by the health-report
 * dashboard's nav link — see client/src/components/Navigation.js), strips
 * it from the address bar immediately regardless of outcome (it's single-use
 * and short-lived, so leaving it visible in history serves no purpose), and
 * exchanges it for a real token stored in this app's own localStorage.
 * If there's no code (app opened directly, or already authenticated from a
 * previous visit), this is a silent no-op — digital-twin works standalone.
 */
async function captureHandoffFromUrl(): Promise<void> {
  const code = new URLSearchParams(window.location.search).get('code');
  if (!code) return;

  window.history.replaceState(null, '', window.location.pathname);

  try {
    const res = await fetch(`${API_BASE_URL}/auth/handoff/exchange`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });
    if (!res.ok) return;
    const data = (await res.json()) as { token?: string };
    if (data.token) setStoredToken(data.token);
  } catch {
    // Network error, backend not running, etc. — stay unauthenticated;
    // every data-fetching hook already handles that state gracefully.
  }
}

/**
 * Ensures the URL-based handoff (if any) has been attempted exactly once,
 * no matter how many callers ask for it concurrently — every data-fetching
 * hook awaits this before checking `getStoredToken()`, which is what avoids
 * a race between "read the code from the URL" and "check localStorage".
 */
export function ensureAuthBootstrapped(): Promise<void> {
  if (!bootstrapPromise) {
    bootstrapPromise = captureHandoffFromUrl();
  }
  return bootstrapPromise;
}
