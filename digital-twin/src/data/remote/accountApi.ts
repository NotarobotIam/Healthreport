import { apiDelete, apiPut, API_BASE_URL } from './apiClient';
import { getStoredToken } from '../../auth/tokenStore';

export const changePassword = (currentPassword: string, newPassword: string) =>
  apiPut<{ success: boolean; token: string }>('/auth/password', { currentPassword, newPassword });

/** Sends the password in the body: it re-confirms identity before anything is erased. */
export async function deleteAccount(password: string): Promise<void> {
  const token = getStoredToken();
  const res = await fetch(`${API_BASE_URL}/account`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ password }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}) as { message?: string });
    throw new Error(body.message ?? `Request failed: ${res.status}`);
  }
}

/** Downloads everything held about the member as a JSON file. */
export async function downloadMyData(): Promise<void> {
  const token = getStoredToken();
  const res = await fetch(`${API_BASE_URL}/account/export`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  if (!res.ok) throw new Error('Could not export your data. Please try again.');
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement('a');
  a.href = url;
  a.download = 'my-health-community-data.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// `apiDelete` is re-exported for callers that need plain deletes on this surface.
export { apiDelete };
