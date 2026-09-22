// Wire format of routes/community.js, routes/moderation.js and routes/account.js.
import type { PainSide, PainType, PainPattern } from './pain';
import type { MemberRole } from './user';

export interface Author {
  /** null when the member has deleted their account. */
  handle: string | null;
  deleted: boolean;
  role: MemberRole;
}

export interface ThreadRegion {
  partId?: string;
  partName?: string;
  system?: string;
  side?: PainSide;
}

export type ContentStatus = 'visible' | 'hidden' | 'removed';

export interface GroupRef {
  slug: string;
  name: string;
}

export interface ThreadDTO {
  id: string;
  title: string;
  /** List responses carry a short excerpt; the detail response carries the full body. */
  excerpt?: string;
  body?: string;
  author: Author;
  isMine: boolean;
  region: ThreadRegion | null;
  /** The health community this was posted in, or null for the general board. */
  group: GroupRef | null;
  painTypes: PainType[];
  replyCount: number;
  supportCount: number;
  iSupported: boolean;
  status: ContentStatus;
  createdAt: string;
  editedAt: string | null;
  lastActivityAt: string;
}

export interface ReplyDTO {
  id: string;
  body: string;
  status: ContentStatus;
  author: Author;
  isMine: boolean;
  supportCount: number;
  iSupported: boolean;
  createdAt: string;
  editedAt: string | null;
}

export interface ThreadListResponse {
  success: boolean;
  threads: ThreadDTO[];
  page: number;
  total: number;
  hasMore: boolean;
}

export interface ThreadDetailResponse {
  success: boolean;
  thread: ThreadDTO;
  replies: ReplyDTO[];
  page: number;
  total: number;
  hasMore: boolean;
}

/** `crisis` is true when the text suggests the author may be in distress — show support resources. */
export interface PostResponse<T> {
  success: boolean;
  crisis: boolean;
  thread?: ThreadDTO;
  reply?: ReplyDTO;
  _type?: T;
}

export interface ThreadInput {
  title: string;
  body: string;
  /** Community slug. You must have joined it. */
  group?: string;
  painTypes?: PainType[];
  region?: ThreadRegion;
}

export type MatchBand = 'very-similar' | 'similar' | 'somewhat-similar';

export interface MatchDTO {
  handle: string;
  band: MatchBand;
  sameStructure: boolean;
  commonTypes: PainType[];
  entry: {
    region: { partName: string; system: string; side: PainSide };
    painTypes: PainType[];
    severity: number;
    pattern: PainPattern;
    /** Deliberately coarse ("a few days to two weeks") — never an exact date. */
    duration: string;
  };
}

export interface MatchesResponse {
  success: boolean;
  sharedByYou: boolean;
  matches: MatchDTO[];
  relatedThreads: ThreadDTO[];
}

export interface RegionSummary {
  success: boolean;
  /** null when fewer than 3 members — small counts are withheld for privacy. */
  members: number | null;
  membersHidden: boolean;
  threadCount: number;
}

export interface MemberProfile {
  handle: string;
  bio: string;
  role: MemberRole;
  joined: string;
  threadCount: number;
  replyCount: number;
  isMe: boolean;
  blocked: boolean;
  friendship: FriendStatus;
}

export type ReportReason = 'spam' | 'harassment' | 'medical-misinformation' | 'self-harm' | 'privacy' | 'other';
export type ReportTarget = 'thread' | 'reply' | 'user';

export const REPORT_REASONS: { value: ReportReason; label: string }[] = [
  { value: 'medical-misinformation', label: 'Dangerous or misleading medical claims' },
  { value: 'harassment', label: 'Harassment or abuse' },
  { value: 'privacy', label: 'Shares private information' },
  { value: 'self-harm', label: 'Someone may be at risk of harm' },
  { value: 'spam', label: 'Spam or advertising' },
  { value: 'other', label: 'Something else' },
];

// --- Moderation ---

export interface ModTarget {
  type: ReportTarget;
  id: string;
  title?: string;
  excerpt?: string;
  handle?: string;
  bio?: string;
  status: string;
  author?: Author;
  threadId?: string;
}

export interface ModReportDTO {
  id: string;
  reason: ReportReason;
  details: string;
  source: 'member' | 'system';
  status: 'open' | 'actioned' | 'dismissed';
  action: string | null;
  reporter: string | null;
  createdAt: string;
  target: ModTarget | null;
}

export interface ModReportsResponse {
  success: boolean;
  reports: ModReportDTO[];
  page: number;
  total: number;
  hasMore: boolean;
}

export type ModAction = 'dismiss' | 'hide' | 'remove' | 'suspend_author';

// --- Communities, friends, research ---

export interface GroupDTO {
  slug: string;
  name: string;
  category: string;
  blurb: string;
  /** null until a community has enough members to be anonymous. */
  members: number | null;
  threadCount: number;
  joined: boolean;
}

export interface CategoryDTO {
  slug: string;
  name: string;
  blurb: string;
  groups: GroupDTO[];
}

export interface GroupsResponse {
  success: boolean;
  categories: CategoryDTO[];
  joinedCount: number;
  maxJoined: number;
}

export type FriendStatus = 'none' | 'friends' | 'requested' | 'incoming';

export interface FriendEntry {
  handle: string;
  at: string;
}

export interface FriendsResponse {
  success: boolean;
  friends: FriendEntry[];
  incoming: FriendEntry[];
  outgoing: FriendEntry[];
}

export interface ActivityItem {
  type: 'thread' | 'reply';
  friend: string;
  at: string;
  threadId: string;
  title: string;
  excerpt: string;
  group: GroupRef | null;
}

export interface ActivityResponse {
  success: boolean;
  hasFriends: boolean;
  items: ActivityItem[];
}

export type ResearchKind = 'research' | 'tests';

export interface ResearchItemDTO {
  pmid: string;
  title: string;
  journal: string;
  authors: string[];
  published: string;
  types: string[];
  url: string;
  group: GroupRef;
}

export interface ResearchResponse {
  success: boolean;
  kind: ResearchKind;
  /** false when the member hasn't joined any community, so a general feed is shown. */
  personalized: boolean;
  items: ResearchItemDTO[];
  updatedAt: string | null;
  refreshing: boolean;
}
