import { useEffect } from 'react';
import { getStoredToken } from '../auth/tokenStore';
import { fetchImagingOrganMapping } from '../data/remote/reportsApi';
import { physiologyEngine } from '../engine/physiologyEngine';

/**
 * Fires once per app load (only ever mounted once actually authenticated —
 * see App.tsx's ProtectedShell): fetches this patient's real Imaging-report
 * organ mapping and merges it into the physiology engine (see
 * physiologyEngine.ts's setRealBodyRegions). A failed fetch is a silent
 * no-op: the app already renders correctly on mock data alone, so there's
 * no error state to show here. The `getStoredToken()` guard stays even
 * though this hook only ever mounts while authenticated — it still covers
 * the narrow case of a token expiring mid-session.
 */
export function useRemoteImagingData(): void {
  useEffect(() => {
    if (!getStoredToken()) return;
    let cancelled = false;

    fetchImagingOrganMapping()
      .then((regions) => {
        if (!cancelled) physiologyEngine.getState().setRealBodyRegions(regions);
      })
      .catch(() => {
        // Network/auth failure — stays on mock data.
      });

    return () => {
      cancelled = true;
    };
  }, []);
}
