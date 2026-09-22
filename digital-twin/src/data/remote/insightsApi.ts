import { apiDelete, apiGet, apiPost, apiPut } from './apiClient';
import type { InsightAnyKind, InsightDTO, InsightKind, InsightMode, InsightStatus } from '../../types';

export const fetchInsightStatus = () => apiGet<InsightStatus>('/insights/status');
export const fetchInsights = (kind?: InsightAnyKind) => apiGet<{ success: boolean; insights: InsightDTO[] }>(`/insights${kind ? `?kind=${kind}` : ''}`);

export const saveInsightSettings = (s: { consent?: boolean; enabled?: boolean; maxPossibilities?: number }) =>
  apiPut<{ success: boolean; settings: InsightStatus['settings'] }>('/insights/settings', s);

/** mode 'basic' is the free summary made by our own code; 'deep' asks an AI service. */
export const generateInsight = (kind: InsightKind, mode: Exclude<InsightMode, 'question'>, includeDetail = false) =>
  apiPost<{ success: boolean; crisis: boolean; insight: InsightDTO | null }>('/insights/generate', { kind, mode, includeDetail });

export const askQuestion = (question: string, includeContext: boolean) =>
  apiPost<{ success: boolean; crisis: boolean; insight: InsightDTO | null }>('/insights/ask', { question, includeContext });

export const followUpInsight = (id: string, body: { choice: 'discuss-with-doctor' | 'turn-off' } | { choice: 'limit'; maxPossibilities: number }) =>
  apiPost<{ success: boolean; insight: InsightDTO }>(`/insights/${id}/follow-up`, body);

export const deleteInsight = (id: string) => apiDelete<{ success: boolean }>(`/insights/${id}`);
export const deleteAllInsights = () => apiDelete<{ success: boolean; deleted: number }>('/insights');
