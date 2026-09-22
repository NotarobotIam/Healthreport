import { apiDelete, apiGet, apiPost } from './apiClient';
import type { ActivityResponse, FriendStatus, FriendsResponse } from '../../types';

const h = (handle: string) => encodeURIComponent(handle);

export const fetchFriends = () => apiGet<FriendsResponse>('/friends');
export const fetchFriendActivity = () => apiGet<ActivityResponse>('/friends/activity');
export const sendFriendRequest = (handle: string) => apiPost<{ success: boolean; status: FriendStatus }>(`/friends/${h(handle)}`);
export const acceptFriend = (handle: string) => apiPost<{ success: boolean }>(`/friends/${h(handle)}/accept`);
export const declineFriend = (handle: string) => apiPost<{ success: boolean }>(`/friends/${h(handle)}/decline`);
export const removeFriend = (handle: string) => apiDelete<{ success: boolean }>(`/friends/${h(handle)}`);
