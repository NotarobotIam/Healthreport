import { apiDelete, apiGet, apiPost, apiPut } from './apiClient';
import type {
  MatchesResponse, MemberProfile, PainType, PostResponse, RegionSummary, ReplyDTO, ReportReason, ReportTarget,
  ThreadDetailResponse, ThreadInput, ThreadListResponse, ThreadDTO,
} from '../../types';

const qs = (params: Record<string, string | number | undefined>) => {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== '') q.set(k, String(v));
  const s = q.toString();
  return s ? `?${s}` : '';
};

export interface ThreadQuery {
  system?: string;
  partId?: string;
  type?: PainType;
  /** A community slug. */
  group?: string;
  /** '1' = only threads from communities I've joined. */
  mine?: '1';
  q?: string;
  sort?: 'recent' | 'active';
  page?: number;
}

export const fetchThreads = (query: ThreadQuery = {}) =>
  apiGet<ThreadListResponse>(`/community/threads${qs({ ...query })}`);

export const fetchThread = (id: string, page = 1) =>
  apiGet<ThreadDetailResponse>(`/community/threads/${id}${qs({ page })}`);

export const createThread = (input: ThreadInput) =>
  apiPost<PostResponse<ThreadDTO> & { thread: ThreadDTO }>('/community/threads', input);

export const updateThread = (id: string, input: Partial<ThreadInput>) =>
  apiPut<PostResponse<ThreadDTO> & { thread: ThreadDTO }>(`/community/threads/${id}`, input);

export const deleteThread = (id: string) => apiDelete<{ success: boolean }>(`/community/threads/${id}`);

export const createReply = (threadId: string, body: string) =>
  apiPost<PostResponse<ReplyDTO> & { reply: ReplyDTO }>(`/community/threads/${threadId}/replies`, { body });

export const updateReply = (id: string, body: string) =>
  apiPut<PostResponse<ReplyDTO> & { reply: ReplyDTO }>(`/community/replies/${id}`, { body });

export const deleteReply = (id: string) => apiDelete<{ success: boolean }>(`/community/replies/${id}`);

export const toggleSupport = (kind: 'threads' | 'replies', id: string) =>
  apiPost<{ success: boolean; supported: boolean; supportCount: number }>(`/community/${kind}/${id}/support`);

export const reportContent = (targetType: ReportTarget, targetId: string, reason: ReportReason, details?: string) =>
  apiPost<{ success: boolean }>('/community/reports', { targetType, targetId, reason, details });

export const fetchBlocked = () => apiGet<{ success: boolean; blocked: string[] }>('/community/blocks');
export const blockMember = (handle: string) => apiPost<{ success: boolean }>(`/community/blocks/${handle}`);
export const unblockMember = (handle: string) => apiDelete<{ success: boolean }>(`/community/blocks/${handle}`);

export const fetchProfile = (handle: string) =>
  apiGet<{ success: boolean; profile: MemberProfile }>(`/community/users/${handle}`);

export const fetchMatches = (entryId: string) => apiGet<MatchesResponse>(`/community/matches${qs({ entryId })}`);

export const fetchRegionSummary = (region: { partId?: string; system?: string }) =>
  apiGet<RegionSummary>(`/community/regions/summary${qs({ ...region })}`);
