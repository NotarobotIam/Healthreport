import { useEffect, useState } from 'react';
import { ensureAuthBootstrapped } from '../auth/handoff';
import { getStoredToken } from '../auth/tokenStore';
import { fetchBloodBiomarkers } from '../data/remote/reportsApi';
import { ApiAuthError } from '../data/remote/apiClient';
import type { TransposeResponse } from '../types';

export type BiomarkerStatus = 'idle' | 'loading' | 'loaded' | 'unauthenticated' | 'error';

interface UseBloodBiomarkersResult {
  status: BiomarkerStatus;
  data: TransposeResponse | null;
  errorMessage: string | null;
}

/** Unlike useRemoteImagingData (silent no-op without a token), this tab has no standalone content of its own — `unauthenticated` is a real, user-visible state here, handled by DataPage. */
export function useBloodBiomarkers(): UseBloodBiomarkersResult {
  const [status, setStatus] = useState<BiomarkerStatus>('idle');
  const [data, setData] = useState<TransposeResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');

    ensureAuthBootstrapped().then(async () => {
      if (cancelled) return;
      if (!getStoredToken()) {
        setStatus('unauthenticated');
        return;
      }
      try {
        const res = await fetchBloodBiomarkers();
        if (cancelled) return;
        setData(res);
        setStatus('loaded');
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiAuthError) {
          setStatus('unauthenticated');
        } else {
          setErrorMessage(err instanceof Error ? err.message : 'Failed to load biomarker data');
          setStatus('error');
        }
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return { status, data, errorMessage };
}
