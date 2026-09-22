import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  blockMember, createReply, deleteReply, deleteThread, fetchThread, updateReply, updateThread,
} from '../data/remote/communityApi';
import { restoreContent } from '../data/remote/moderationApi';
import { useAuth } from '../auth/AuthContext';
import { CrisisBanner } from '../components/community/CrisisBanner';
import { PostText } from '../components/community/PostText';
import { ReportDialog } from '../components/community/ReportDialog';
import { RoleBadge } from '../components/community/RoleBadge';
import { SupportButton } from '../components/community/SupportButton';
import { authorLabel, regionLabel, timeAgo } from '../components/community/format';
import { PageContainer } from '../components/dashboardUi';
import { looksLikeCrisis } from '../utils/crisis';
import type { Author, ReplyDTO, ThreadDTO } from '../types';

function AuthorLine({ author, at, edited }: { author: Author; at: string; edited: string | null }) {
  const name = authorLabel(author);
  return (
    <p className="flex flex-wrap items-center gap-x-2 text-xs text-hud-muted">
      {author.handle ? (
        <Link to={`/community/u/${author.handle}`} className="font-semibold text-hud-text hover:underline">
          {name}
        </Link>
      ) : (
        <span className="font-semibold">{name}</span>
      )}
      <RoleBadge role={author.role} />
      <span>{timeAgo(at)}</span>
      {edited && <span title={new Date(edited).toLocaleString()}>(edited)</span>}
    </p>
  );
}

function Composer({
  initial = '', submitLabel, rows = 4, max, onSubmit, onCancel,
}: {
  initial?: string;
  submitLabel: string;
  rows?: number;
  max: number;
  onSubmit: (body: string) => Promise<boolean>;
  onCancel?: () => void;
}) {
  const [body, setBody] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const crisisShown = await onSubmit(body.trim());
      if (!crisisShown) setBody('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not post.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={rows}
        maxLength={max}
        aria-label="Your message"
        placeholder="Share your experience. Please don't include contact details or links."
        className="w-full resize-y rounded-md border border-hud-borderLight px-3 py-2 text-sm focus:border-hud-cyan focus:outline-none"
      />
      {looksLikeCrisis(body) && <div className="my-2"><CrisisBanner /></div>}
      {error && (
        <p role="alert" className="mt-1 text-sm text-hud-red">
          {error}
        </p>
      )}
      <div className="mt-2 flex items-center gap-2">
        <button
          type="button"
          onClick={submit}
          disabled={busy || body.trim().length === 0}
          className="rounded-md bg-[#007bff] px-4 py-1.5 text-sm font-semibold text-white hover:bg-[#0056b3] disabled:opacity-50"
        >
          {busy ? 'Posting…' : submitLabel}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="rounded-md border border-hud-borderLight px-4 py-1.5 text-sm font-medium hover:bg-hud-panel2">
            Cancel
          </button>
        )}
        <span className="ml-auto text-xs text-hud-muted">
          {body.length}/{max}
        </span>
      </div>
    </div>
  );
}

function ReplyItem({
  reply, canModerate, onChanged, onReport,
}: {
  reply: ReplyDTO;
  canModerate: boolean;
  onChanged: (r: ReplyDTO | null) => void;
  onReport: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const removed = reply.status !== 'visible';

  return (
    <li className="rounded-lg border border-hud-border bg-hud-panel p-4">
      <AuthorLine author={reply.author} at={reply.createdAt} edited={reply.editedAt} />
      {removed ? (
        <p className="mt-2 text-sm italic text-hud-muted">
          {reply.status === 'hidden' ? '[Hidden by a moderator pending review]' : '[This reply was removed]'}
        </p>
      ) : editing ? (
        <div className="mt-2">
          <Composer
            initial={reply.body}
            submitLabel="Save"
            max={3000}
            onCancel={() => setEditing(false)}
            onSubmit={async (body) => {
              const res = await updateReply(reply.id, body);
              onChanged(res.reply);
              setEditing(false);
              return res.crisis;
            }}
          />
        </div>
      ) : (
        <PostText className="mt-2 text-sm text-hud-text">{reply.body}</PostText>
      )}
      {!removed && !editing && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <SupportButton kind="replies" id={reply.id} supported={reply.iSupported} count={reply.supportCount} disabled={reply.isMine} />
          {reply.isMine ? (
            <>
              <button type="button" onClick={() => setEditing(true)} className="text-xs font-medium text-hud-muted hover:underline">
                Edit
              </button>
              {confirmDelete ? (
                <>
                  <button
                    type="button"
                    onClick={async () => {
                      await deleteReply(reply.id);
                      onChanged(null);
                    }}
                    className="text-xs font-semibold text-hud-red hover:underline"
                  >
                    Yes, delete
                  </button>
                  <button type="button" onClick={() => setConfirmDelete(false)} className="text-xs text-hud-muted hover:underline">
                    Keep
                  </button>
                </>
              ) : (
                <button type="button" onClick={() => setConfirmDelete(true)} className="text-xs font-medium text-hud-muted hover:underline">
                  Delete
                </button>
              )}
            </>
          ) : (
            <button type="button" onClick={() => onReport(reply.id)} className="text-xs font-medium text-hud-muted hover:underline">
              Report
            </button>
          )}
        </div>
      )}
      {canModerate && reply.status === 'hidden' && (
        <button
          type="button"
          onClick={async () => {
            await restoreContent('reply', reply.id);
            onChanged({ ...reply, status: 'visible' });
          }}
          className="mt-2 text-xs font-medium text-hud-cyan hover:underline"
        >
          Restore this reply
        </button>
      )}
    </li>
  );
}

export function ThreadPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const canModerate = user?.role === 'moderator' || user?.role === 'admin';

  const [thread, setThread] = useState<ThreadDTO | null>(null);
  const [replies, setReplies] = useState<ReplyDTO[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [reporting, setReporting] = useState<{ type: 'thread' | 'reply'; id: string } | null>(null);
  const [showCrisis, setShowCrisis] = useState(Boolean((location.state as { crisis?: boolean } | null)?.crisis));
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchThread(id);
      setThread(res.thread);
      setReplies(res.replies);
      setPage(1);
      setHasMore(res.hasMore);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load this discussion.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const loadMore = async () => {
    const res = await fetchThread(id, page + 1);
    setReplies((prev) => [...prev, ...res.replies]);
    setPage(page + 1);
    setHasMore(res.hasMore);
  };

  if (loading) return <PageContainer><p className="py-10 text-center text-sm text-hud-muted">Loading…</p></PageContainer>;
  if (error || !thread) {
    return (
      <PageContainer>
        <p role="alert" className="rounded-md bg-hud-red/10 px-3 py-2 text-sm text-hud-red">{error ?? 'Not found'}</p>
        <Link to="/community" className="mt-3 inline-block text-sm text-hud-cyan hover:underline">← Back to community</Link>
      </PageContainer>
    );
  }

  const region = regionLabel(thread.region);
  const removed = thread.status !== 'visible';

  return (
    <PageContainer>
      <Link to="/community" className="text-sm text-hud-cyan hover:underline">← Back to community</Link>

      {showCrisis && <div className="mt-3"><CrisisBanner /></div>}
      {notice && <p role="status" className="mt-3 rounded-md bg-hud-green/10 px-3 py-2 text-sm text-hud-green">{notice}</p>}
      {thread.status === 'hidden' && (
        <p role="status" className="mt-3 rounded-md bg-hud-amber/15 px-3 py-2 text-sm text-hud-text">
          This discussion is hidden from members pending review. Only moderators can see it.
          <button
            type="button"
            onClick={async () => { await restoreContent('thread', thread.id); await load(); }}
            className="ml-2 font-semibold text-hud-cyan underline"
          >
            Restore
          </button>
        </p>
      )}

      <article className="mt-3 rounded-lg bg-hud-panel p-5 shadow-sm">
        {editing ? (
          <div className="flex flex-col gap-3">
            <input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              maxLength={140}
              aria-label="Title"
              className="w-full rounded-md border border-hud-borderLight px-3 py-2 text-lg font-semibold focus:border-hud-cyan focus:outline-none"
            />
            <Composer
              initial={thread.body ?? ''}
              submitLabel="Save changes"
              rows={8}
              max={5000}
              onCancel={() => setEditing(false)}
              onSubmit={async (body) => {
                const res = await updateThread(thread.id, { title: editTitle.trim(), body });
                setThread(res.thread);
                setEditing(false);
                setShowCrisis(res.crisis);
                return res.crisis;
              }}
            />
          </div>
        ) : (
          <>
            <h1 className="text-xl font-semibold text-hud-text">{thread.title}</h1>
            <div className="mt-1"><AuthorLine author={thread.author} at={thread.createdAt} edited={thread.editedAt} /></div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {thread.group && (
                <Link to={`/community/g/${thread.group.slug}`} className="rounded-full bg-hud-green/10 px-2 py-0.5 text-xs font-medium text-hud-green hover:underline">
                  {thread.group.name}
                </Link>
              )}
              {region && <span className="rounded-full bg-hud-panel2 px-2 py-0.5 text-xs text-hud-text ring-1 ring-hud-border">{region}</span>}
              {thread.painTypes.map((t) => (
                <span key={t} className="rounded-full bg-hud-cyan/10 px-2 py-0.5 text-xs text-hud-cyan">{t}</span>
              ))}
              {thread.region?.partId && (
                <Link
                  to={`/community?partId=${thread.region.partId}&partName=${encodeURIComponent(thread.region.partName ?? '')}`}
                  className="rounded-full px-2 py-0.5 text-xs font-medium text-hud-muted underline"
                >
                  More about this area
                </Link>
              )}
            </div>
            {!removed && thread.body && <PostText className="mt-4 text-sm leading-relaxed text-hud-text">{thread.body}</PostText>}
            {!removed && (
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <SupportButton kind="threads" id={thread.id} supported={thread.iSupported} count={thread.supportCount} disabled={thread.isMine} />
                {thread.isMine ? (
                  <>
                    <button type="button" onClick={() => { setEditTitle(thread.title); setEditing(true); }} className="text-xs font-medium text-hud-muted hover:underline">Edit</button>
                    {confirmDelete ? (
                      <>
                        <button
                          type="button"
                          onClick={async () => { await deleteThread(thread.id); navigate('/community', { replace: true }); }}
                          className="text-xs font-semibold text-hud-red hover:underline"
                        >
                          Yes, delete this discussion
                        </button>
                        <button type="button" onClick={() => setConfirmDelete(false)} className="text-xs text-hud-muted hover:underline">Keep</button>
                      </>
                    ) : (
                      <button type="button" onClick={() => setConfirmDelete(true)} className="text-xs font-medium text-hud-muted hover:underline">Delete</button>
                    )}
                  </>
                ) : (
                  <>
                    <button type="button" onClick={() => setReporting({ type: 'thread', id: thread.id })} className="text-xs font-medium text-hud-muted hover:underline">Report</button>
                    {thread.author.handle && (
                      <button
                        type="button"
                        onClick={async () => {
                          await blockMember(thread.author.handle!);
                          navigate('/community', { replace: true });
                        }}
                        className="text-xs font-medium text-hud-muted hover:underline"
                      >
                        Block {thread.author.handle}
                      </button>
                    )}
                  </>
                )}
              </div>
            )}
          </>
        )}
      </article>

      <h2 className="mb-2 mt-6 text-sm font-semibold text-hud-text">
        {thread.replyCount} {thread.replyCount === 1 ? 'reply' : 'replies'}
      </h2>
      <ul className="flex flex-col gap-2.5">
        {replies.map((r) => (
          <ReplyItem
            key={r.id}
            reply={r}
            canModerate={canModerate}
            onReport={(rid) => setReporting({ type: 'reply', id: rid })}
            onChanged={(updated) =>
              setReplies((prev) => (updated ? prev.map((x) => (x.id === updated.id ? updated : x)) : prev.filter((x) => x.id !== r.id)))
            }
          />
        ))}
      </ul>
      {hasMore && (
        <button type="button" onClick={loadMore} className="mx-auto mt-3 block rounded-md border border-hud-borderLight px-5 py-2 text-sm font-medium hover:bg-hud-panel2">
          Load more replies
        </button>
      )}

      {!removed && (
        <section className="mt-6 rounded-lg bg-hud-panel p-4 shadow-sm">
          <h2 className="mb-2 text-sm font-semibold text-hud-text">Add a reply</h2>
          <Composer
            submitLabel="Post reply"
            max={3000}
            onSubmit={async (body) => {
              const res = await createReply(thread.id, body);
              setReplies((prev) => [...prev, res.reply]);
              setThread({ ...thread, replyCount: thread.replyCount + 1 });
              if (res.crisis) setShowCrisis(true);
              setNotice(null);
              return false;
            }}
          />
          <p className="mt-3 text-xs text-hud-muted">
            Share what you've experienced. Please don't diagnose others or tell them what medication to take —{' '}
            <Link to="/guidelines" className="underline">see the guidelines</Link>.
          </p>
        </section>
      )}

      {reporting && (
        <ReportDialog targetType={reporting.type} targetId={reporting.id} onClose={() => { setReporting(null); setNotice(null); }} />
      )}
    </PageContainer>
  );
}
