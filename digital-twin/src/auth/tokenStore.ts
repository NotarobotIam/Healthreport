// digital-twin runs on a different origin than the health-report dashboard
// (5183 vs 3000), so it cannot read that app's localStorage token directly —
// this is its OWN, separately-scoped token store. See handoff.ts for how a
// token gets in here in the first place.
const STORAGE_KEY = 'vitalDtAuthToken';

export function getStoredToken(): string | null {
  return localStorage.getItem(STORAGE_KEY);
}

export function setStoredToken(token: string): void {
  localStorage.setItem(STORAGE_KEY, token);
}

export function clearStoredToken(): void {
  localStorage.removeItem(STORAGE_KEY);
}
