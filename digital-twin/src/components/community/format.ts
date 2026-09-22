import type { Author, ThreadRegion } from '../../types';
import { SYSTEM_BY_ID, type SystemId } from '../../atlas/anatomy';
import { formatSide } from '../atlas/painFormat';

export function authorLabel(author: Author): string {
  return author.deleted || !author.handle ? 'Deleted member' : author.handle;
}

export function regionLabel(region: ThreadRegion | null): string | null {
  if (!region) return null;
  const side = region.side ? formatSide(region.side) : '';
  const name = region.partName ?? (region.system ? (SYSTEM_BY_ID.get(region.system as SystemId)?.name ?? region.system) : '');
  return [name, side].filter(Boolean).join(' · ') || null;
}

export function timeAgo(iso: string, now = Date.now()): string {
  const minutes = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60000));
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}
