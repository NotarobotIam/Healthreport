import { useEffect } from 'react';
import { ensureAuthBootstrapped } from '../auth/handoff';
import { getStoredToken } from '../auth/tokenStore';
import { fetchImagingOrganMapping } from '../data/remote/reportsApi';
import { physiologyEngine } from '../engine/physiologyEngine';

/**
 * Fires once per app load: waits for any URL-based auth handoff to resolve,
 * and — only if that left us with a token — fetches this patient's real
 * Imaging-report organ mapping and merges it into the physiology engine
 * (see physiologyEngine.ts's setRealBodyRegions). No token, or a failed
 * fetch, is a silent no-op: the app already renders correctly on mock data
 * alone, so there's no error state to show here — see App.tsx.
 */
export function useRemoteImagingData(): void {
  useEffect(() => {
    let cancelled = false;

    ensureAuthBootstrapped().then(async () => {
      if (cancelled || !getStoredToken()) return;
      try {
        const regions = await fetchImagingOrganMapping();
        if (!cancelled) physiologyEngine.getState().setRealBodyRegions(regions);
      } catch {
        // Network/auth failure — stays on mock data.
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);
}
