import { NavLink } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';

const NAV_LINKS: { to: string; label: string }[] = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/overview', label: 'Overview' },
  { to: '/anatomy', label: 'Anatomy' },
  { to: '/community', label: 'Community' },
  { to: '/physiology', label: 'Physiology' },
  { to: '/pathology', label: 'Pathology' },
  { to: '/simulation', label: 'Simulation' },
  { to: '/data', label: 'Data' },
  { to: '/reports', label: 'Reports' },
];

/**
 * The one component that intentionally keeps the OLD dark theme as literal
 * values instead of `hud-*` tokens: the health-report dashboard's own nav
 * bar was always dark (#2c3e50), and `hud.panel`/`hud.muted` are now light
 * (needed for every actual card surface) — these two facts collide on the
 * same tokens, so this bar opts out of the token swap rather than the rest
 * of the app opting in to staying dark. See tailwind.config.js's top comment.
 */
export function TopNav() {
  const { user, logout } = useAuth();
  const isModerator = user?.role === 'moderator' || user?.role === 'admin';
  const links = isModerator ? [...NAV_LINKS, { to: '/moderation', label: 'Moderation' }] : NAV_LINKS;

  return (
    <header className="flex h-12 shrink-0 items-center justify-between bg-[#2c3e50] px-4 shadow-md">
      <div className="flex shrink-0 items-center gap-3">
        <span className="font-mono text-sm font-bold tracking-[0.2em] text-hud-cyan">VITAL-DT</span>
        <span className="hidden text-[10px] uppercase tracking-widest text-[#ecf0f1] lg:inline">
          Digital Twin Platform
        </span>
      </div>

      <nav className="flex flex-1 items-center justify-center gap-1 overflow-x-auto whitespace-nowrap px-4">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              `shrink-0 rounded px-3 py-1.5 text-xs font-medium tracking-wide transition-colors ${
                isActive ? 'bg-hud-cyan/15 text-hud-cyan' : 'text-[#ecf0f1] hover:bg-white/10'
              }`
            }
          >
            {link.label}
          </NavLink>
        ))}
      </nav>

      <div className="flex shrink-0 items-center gap-3">
        <span className="hud-status-dot h-1.5 w-1.5 rounded-full bg-hud-green" />
        <span className="hidden text-[10px] uppercase tracking-widest text-[#ecf0f1] sm:inline">Normal</span>
        <div className="mx-1 h-5 w-px bg-white/15" />
        <NavLink to="/account" className="text-xs text-[#ecf0f1] hover:text-hud-cyan" title="Account &amp; privacy">
          {user?.handle ?? 'Account'}
        </NavLink>
        <button
          type="button"
          onClick={logout}
          className="rounded border border-white/20 px-2.5 py-1 text-xs text-[#ecf0f1] transition-colors hover:bg-white/10"
        >
          Logout
        </button>
      </div>
    </header>
  );
}
