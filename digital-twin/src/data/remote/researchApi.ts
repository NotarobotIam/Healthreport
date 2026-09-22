import { apiGet } from './apiClient';
import type { ResearchKind, ResearchResponse } from '../../types';

export function fetchResearch(kind: ResearchKind, opts: { group?: string; limit?: number } = {}) {
  const q = new URLSearchParams({ kind });
  if (opts.group) q.set('group', opts.group);
  if (opts.limit) q.set('limit', String(opts.limit));
  return apiGet<ResearchResponse>(`/research?${q}`);
}
