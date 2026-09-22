import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { createPainEntry, deletePainEntry, fetchPainEntries, updatePainEntry } from '../data/remote/painApi';
import type { PainEntryDTO, PainInput } from '../types';

const byOnsetDesc = (a: PainEntryDTO, b: PainEntryDTO) => new Date(b.onset).getTime() - new Date(a.onset).getTime();

interface PainStore {
  entries: PainEntryDTO[];
  loading: boolean;
  loadError: string | null;
  create: (input: PainInput) => Promise<PainEntryDTO>;
  update: (id: string, input: Partial<PainInput>) => Promise<PainEntryDTO>;
  remove: (id: string) => Promise<void>;
  /** Reload from the server now. */
  refresh: () => Promise<void>;
}

const PainContext = createContext<PainStore | null>(null);

/**
 * The signed-in member's pain log, shared by every page.
 *
 * It used to be loaded separately by each page. The 3D page stays mounted while you are on other
 * tabs (to keep its WebGL context alive), so it kept its first copy forever and never showed
 * entries changed elsewhere. One shared store fixes that: every page sees the same list, changes
 * appear everywhere at once, and it reloads when you navigate or come back to the tab.
 */
export function PainProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState<PainEntryDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  // Bumped by every load and every local change. A response is applied only if nothing newer has
  // happened since it was requested, so a slow, older response can never overwrite fresher data.
  const generation = useRef(0);

  const refresh = useCallback(async () => {
    const mine = ++generation.current;
    try {
      const res = await fetchPainEntries();
      if (mine !== generation.current) return;
      setEntries([...res.entries].sort(byOnsetDesc));
      setLoadError(null);
    } catch (err) {
      if (mine !== generation.current) return;
      setLoadError(err instanceof Error ? err.message : 'Could not load your pain log.');
    } finally {
      if (mine === generation.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Reload quietly whenever the member moves to another page…
  const { pathname } = useLocation();
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false; // the initial load is already underway
      return;
    }
    void refresh();
  }, [pathname, refresh]);

  // …or comes back to this browser tab (their log may have changed in another tab or device).
  useEffect(() => {
    const onReturn = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    window.addEventListener('focus', onReturn);
    document.addEventListener('visibilitychange', onReturn);
    return () => {
      window.removeEventListener('focus', onReturn);
      document.removeEventListener('visibilitychange', onReturn);
    };
  }, [refresh]);

  const create = useCallback(async (input: PainInput) => {
    const { entry } = await createPainEntry(input);
    generation.current++;
    setEntries((prev) => [...prev, entry].sort(byOnsetDesc));
    return entry;
  }, []);

  const update = useCallback(async (id: string, input: Partial<PainInput>) => {
    const { entry } = await updatePainEntry(id, input);
    generation.current++;
    setEntries((prev) => prev.map((e) => (e._id === id ? entry : e)).sort(byOnsetDesc));
    return entry;
  }, []);

  const remove = useCallback(async (id: string) => {
    await deletePainEntry(id);
    generation.current++;
    setEntries((prev) => prev.filter((e) => e._id !== id));
  }, []);

  const value = useMemo(
    () => ({ entries, loading, loadError, create, update, remove, refresh }),
    [entries, loading, loadError, create, update, remove, refresh],
  );
  return createElement(PainContext.Provider, { value }, children);
}

export function usePainEntries(): PainStore {
  const ctx = useContext(PainContext);
  if (!ctx) throw new Error('usePainEntries must be used inside <PainProvider>');
  return ctx;
}
