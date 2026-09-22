import { apiGet, apiPost, apiPut, apiDelete } from './apiClient';
import type { PainEntryResponse, PainInput, PainListResponse } from '../../types';

export function fetchPainEntries(): Promise<PainListResponse> {
  return apiGet<PainListResponse>('/pain');
}

export function createPainEntry(payload: PainInput): Promise<PainEntryResponse> {
  return apiPost<PainEntryResponse>('/pain', payload);
}

export function updatePainEntry(id: string, payload: Partial<PainInput>): Promise<PainEntryResponse> {
  return apiPut<PainEntryResponse>(`/pain/${id}`, payload);
}

export function deletePainEntry(id: string): Promise<{ success: boolean }> {
  return apiDelete<{ success: boolean }>(`/pain/${id}`);
}
