import { useEffect, useState } from 'react';
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

/** The Data tab sits behind RequireAuth like every other route now, so `unauthenticated` should be unreachable in normal navigation — kept as a defensive state (e.g. a token expiring mid-session) rather than assumed impossible. */
export function useBloodBiomarkers(): UseBloodBiomarkersResult {
  const [status, setStatus] = useState<BiomarkerStatus>('idle');
  const [data, setData] = useState<TransposeResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (!getStoredToken()) {
      setStatus('unauthenticated');
      return;
    }

    setStatus('loading');
    fetchBloodBiomarkers()
      .then((res) => {
        if (cancelled) return;
        setData(res);
        setStatus('loaded');
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof ApiAuthError) {
          setStatus('unauthenticated');
        } else {
          setErrorMessage(err instanceof Error ? err.message : 'Failed to load biomarker data');
          setStatus('error');
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { status, data, errorMessage };
}
