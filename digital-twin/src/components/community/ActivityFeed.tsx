import { Link } from 'react-router-dom';
import type { ActivityResponse } from '../../types';
import { timeAgo } from './format';

/** Recent public posts from a member's friends. Empty states explain what to do next. */
export function ActivityFeed({ data, limit }: { data: ActivityResponse | null; limit?: number }) {
  if (!data) return <p className="text-sm text-hud-muted">Loading…</p>;
  if (!data.hasFriends) {
    return (
      <p className="text-sm leading-relaxed text-hud-muted">
        When you make friends, you'll see what they've been posting here.{' '}
        <Link to="/community/matches" className="font-medium text-hud-cyan hover:underline">Find people like you →</Link>
      </p>
    );
  }
  const items = limit ? data.items.slice(0, limit) : data.items;
  if (items.length === 0) return <p className="text-sm text-hud-muted">Your friends have been quiet lately. Maybe say hello?</p>;
  return (
    <ul className="flex flex-col gap-3">
      {items.map((i) => (
        <li key={`${i.type}-${i.threadId}-${i.at}`} className="text-sm">
          <p className="text-hud-text">
            <Link to={`/community/u/${i.friend}`} className="font-semibold hover:underline">{i.friend}</Link>{' '}
            <span className="text-hud-muted">{i.type === 'thread' ? 'started a discussion' : 'replied to'}</span>
          </p>
          <Link to={`/community/thread/${i.threadId}`} className="font-medium text-hud-cyan hover:underline">
            {i.title}
          </Link>
          {i.excerpt && i.type === 'reply' && <p className="mt-0.5 line-clamp-2 text-xs text-hud-muted">“{i.excerpt}”</p>}
          <p className="mt-0.5 text-xs text-hud-muted">
            {timeAgo(i.at)}
            {i.group && <> · {i.group.name}</>}
          </p>
        </li>
      ))}
    </ul>
  );
}
