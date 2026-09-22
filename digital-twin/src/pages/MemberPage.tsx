import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { blockMember, fetchProfile, unblockMember } from '../data/remote/communityApi';
import { PostText } from '../components/community/PostText';
import { FriendButton } from '../components/community/FriendButton';
import { RoleBadge } from '../components/community/RoleBadge';
import { PageContainer } from '../components/dashboardUi';
import type { MemberProfile } from '../types';

export function MemberPage() {
  const { handle = '' } = useParams();
  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setProfile(null);
    setError(null);
    fetchProfile(handle)
      .then((res) => !cancelled && setProfile(res.profile))
      .catch((err: unknown) => !cancelled && setError(err instanceof Error ? err.message : 'Could not load this member.'));
    return () => {
      cancelled = true;
    };
  }, [handle]);

  if (error) {
    return (
      <PageContainer>
        <p role="alert" className="rounded-md bg-hud-red/10 px-3 py-2 text-sm text-hud-red">{error}</p>
        <Link to="/community" className="mt-3 inline-block text-sm text-hud-cyan hover:underline">← Back to community</Link>
      </PageContainer>
    );
  }
  if (!profile) return <PageContainer><p className="py-10 text-center text-sm text-hud-muted">Loading…</p></PageContainer>;

  const toggleBlock = async () => {
    if (profile.blocked) await unblockMember(profile.handle);
    else await blockMember(profile.handle);
    setProfile({ ...profile, blocked: !profile.blocked, friendship: profile.blocked ? profile.friendship : 'none' });
  };

  return (
    <PageContainer>
      <Link to="/community" className="text-sm text-hud-cyan hover:underline">← Back to community</Link>
      <div className="mx-auto mt-3 max-w-xl rounded-lg bg-hud-panel p-6 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-semibold text-hud-text">{profile.handle}</h1>
          <RoleBadge role={profile.role} />
          {profile.isMe && <span className="rounded-full bg-hud-panel2 px-2 py-0.5 text-xs text-hud-muted ring-1 ring-hud-border">You</span>}
        </div>
        <p className="mt-1 text-xs text-hud-muted">
          Member since {new Date(`${profile.joined}-01T00:00:00`).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
        </p>
        {profile.bio ? <PostText className="mt-4 text-sm text-hud-text">{profile.bio}</PostText> : <p className="mt-4 text-sm italic text-hud-muted">No bio yet.</p>}
        <p className="mt-4 text-sm text-hud-muted">
          {profile.threadCount} {profile.threadCount === 1 ? 'discussion' : 'discussions'} · {profile.replyCount} {profile.replyCount === 1 ? 'reply' : 'replies'}
        </p>
        {profile.isMe ? (
          <Link to="/account" className="mt-4 inline-block text-sm font-medium text-hud-cyan hover:underline">Edit your profile</Link>
        ) : (
          <div className="mt-5 border-t border-hud-border pt-4">
            {!profile.blocked && (
              <div className="mb-4">
                <FriendButton handle={profile.handle} status={profile.friendship} />
              </div>
            )}
            <button type="button" onClick={toggleBlock} className="rounded-md border border-hud-borderLight px-4 py-1.5 text-sm font-medium hover:bg-hud-panel2">
              {profile.blocked ? 'Unblock' : 'Block'}
            </button>
            <p className="mt-2 text-xs text-hud-muted">
              {profile.blocked ? 'Their posts and matches are hidden from you. They are not told.' : 'Blocking hides their posts and matches from you, and they are not told. To report a problem, use “Report” on the post itself.'}
            </p>
          </div>
        )}
      </div>
    </PageContainer>
  );
}
