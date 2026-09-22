import { NavLink } from 'react-router-dom';

const TABS = [
  { to: '/community', label: 'Discussions', end: true },
  { to: '/community/groups', label: 'Communities', end: false },
  { to: '/community/friends', label: 'Friends', end: false },
  { to: '/community/matches', label: 'People like me', end: false },
];

/** Sub-navigation shared by every community page. */
export function CommunityNav() {
  return (
    <nav aria-label="Community sections" className="mb-5 flex flex-wrap gap-1 border-b border-hud-border">
      {TABS.map((t) => (
        <NavLink
          key={t.to}
          to={t.to}
          end={t.end}
          className={({ isActive }) =>
            `-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              isActive ? 'border-hud-cyan text-hud-cyan' : 'border-transparent text-hud-muted hover:text-hud-text'
            }`
          }
        >
          {t.label}
        </NavLink>
      ))}
    </nav>
  );
}
