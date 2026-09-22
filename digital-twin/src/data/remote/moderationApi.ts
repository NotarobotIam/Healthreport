import { apiGet, apiPost } from './apiClient';
import type { ModAction, ModReportsResponse } from '../../types';

export const fetchModReports = (status: 'open' | 'actioned' | 'dismissed' = 'open', page = 1) =>
  apiGet<ModReportsResponse>(`/mod/reports?status=${status}&page=${page}`);

export const resolveReport = (id: string, action: ModAction, extra: { note?: string; days?: number } = {}) =>
  apiPost<{ success: boolean; outcome: string }>(`/mod/reports/${id}/resolve`, { action, ...extra });

export const restoreContent = (type: 'thread' | 'reply', id: string) =>
  apiPost<{ success: boolean }>(`/mod/content/${type}/${id}/restore`);

export interface ModAuditEntry {
  id: string;
  moderator: string | null;
  action: string;
  targetType: string;
  targetId: string;
  note: string;
  createdAt: string;
}

export const fetchModActions = () => apiGet<{ success: boolean; actions: ModAuditEntry[] }>('/mod/actions');
