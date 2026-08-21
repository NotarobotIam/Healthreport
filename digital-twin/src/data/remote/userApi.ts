import { apiGet, apiPut } from './apiClient';
import type { CurrentUserResponse, UpdateProfilePayload } from '../../types';

export function fetchUserProfile(): Promise<CurrentUserResponse> {
  return apiGet<CurrentUserResponse>('/users/profile');
}

export function updateUserProfile(payload: UpdateProfilePayload): Promise<CurrentUserResponse> {
  return apiPut<CurrentUserResponse>('/users/profile', payload);
}
