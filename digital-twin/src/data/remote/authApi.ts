import { apiGet, apiPost } from './apiClient';
import type { AuthResponse, CurrentUserResponse, LoginPayload, RegisterPayload } from '../../types';

export function login(payload: LoginPayload): Promise<AuthResponse> {
  return apiPost<AuthResponse>('/auth/login', payload);
}

export function register(payload: RegisterPayload): Promise<AuthResponse> {
  return apiPost<AuthResponse>('/auth/register', payload);
}

export function fetchCurrentUser(): Promise<CurrentUserResponse> {
  return apiGet<CurrentUserResponse>('/auth/me');
}
