import type { MemberRole } from '../../types';

export function RoleBadge({ role }: { role: MemberRole }) {
  if (role === 'user') return null;
  return (
    <span className="rounded-full bg-hud-cyan/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-hud-cyan">
      {role === 'admin' ? 'Admin' : 'Moderator'}
    </span>
  );
}
