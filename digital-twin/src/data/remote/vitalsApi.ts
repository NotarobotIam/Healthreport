import { apiDelete, apiGet, apiPost, apiPut } from './apiClient';
import type { VitalDTO, VitalInput } from '../../types';

export const fetchVitals = () => apiGet<{ success: boolean; count: number; vitals: VitalDTO[] }>('/vitals');
export const createVital = (input: VitalInput) => apiPost<{ success: boolean; vital: VitalDTO }>('/vitals', input);
export const updateVital = (id: string, input: VitalInput) => apiPut<{ success: boolean; vital: VitalDTO }>(`/vitals/${id}`, input);
export const deleteVital = (id: string) => apiDelete<{ success: boolean }>(`/vitals/${id}`);
