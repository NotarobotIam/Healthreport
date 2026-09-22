import { Link } from 'react-router-dom';
import type { ThreadDTO } from '../../types';
import { authorLabel, regionLabel, timeAgo } from './format';
import { RoleBadge } from './RoleBadge';

export function ThreadCard({ thread }: { thread: ThreadDTO }) {
  const region = regionLabel(thread.region);
  return (
    <li>
      <Link
        to={`/community/thread/${thread.id}`}
        className="block rounded-lg border border-hud-border bg-hud-panel p-4 transition-colors hover:border-hud-cyan/60 hover:bg-hud-panel2"
      >
        <h3 className="text-base font-semibold text-hud-text">{thread.title}</h3>
        {thread.excerpt && <p className="mt-1 line-clamp-2 text-sm text-hud-muted">{thread.excerpt}</p>}
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-hud-muted">
          <span className="flex items-center gap-1.5">
            {authorLabel(thread.author)} <RoleBadge role={thread.author.role} />
          </span>
          <span>{timeAgo(thread.lastActivityAt)}</span>
          <span>
            {thread.replyCount} {thread.replyCount === 1 ? 'reply' : 'replies'}
          </span>
          {thread.supportCount > 0 && <span>♡ {thread.supportCount} relate</span>}
          {thread.group && <span className="rounded-full bg-hud-green/10 px-2 py-0.5 font-medium text-hud-green">{thread.group.name}</span>}
          {region && <span className="rounded-full bg-hud-panel2 px-2 py-0.5 text-hud-text ring-1 ring-hud-border">{region}</span>}
          {thread.painTypes.map((t) => (
            <span key={t} className="rounded-full bg-hud-cyan/10 px-2 py-0.5 text-hud-cyan">
              {t}
            </span>
          ))}
        </div>
      </Link>
    </li>
  );
}
