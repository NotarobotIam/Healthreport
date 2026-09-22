import { apiDelete, apiGet, apiPost } from './apiClient';
import type { GroupDTO, GroupsResponse } from '../../types';

export const fetchGroups = () => apiGet<GroupsResponse>('/groups');
export const fetchMyGroups = () => apiGet<{ success: boolean; groups: string[] }>('/groups/mine');
export const fetchGroup = (slug: string) => apiGet<{ success: boolean; group: GroupDTO }>(`/groups/${encodeURIComponent(slug)}`);
export const joinGroup = (slug: string) => apiPost<{ success: boolean; joined: boolean }>(`/groups/${encodeURIComponent(slug)}/join`);
export const leaveGroup = (slug: string) => apiDelete<{ success: boolean; joined: boolean }>(`/groups/${encodeURIComponent(slug)}/join`);
