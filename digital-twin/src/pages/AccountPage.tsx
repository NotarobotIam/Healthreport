import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { changePassword, deleteAccount, downloadMyData } from '../data/remote/accountApi';
import { fetchBlocked, unblockMember } from '../data/remote/communityApi';
import { updateUserProfile } from '../data/remote/userApi';
import { setStoredToken } from '../auth/tokenStore';
import { PageContainer } from '../components/dashboardUi';
import { useTheme, type Theme } from '../theme/ThemeContext';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-lg bg-hud-panel p-5 shadow-sm">
      <h2 className="mb-3 text-base font-semibold text-hud-text">{title}</h2>
      {children}
    </section>
  );
}

const inputClass = 'w-full rounded-md border border-hud-borderLight bg-hud-panel px-3 py-2 text-sm text-hud-text focus:border-hud-cyan focus:outline-none';

function Status({ ok, children }: { ok: boolean; children: ReactNode }) {
  return (
    <p role={ok ? 'status' : 'alert'} className={`mt-2 rounded-md px-3 py-2 text-sm ${ok ? 'bg-hud-green/10 text-hud-green' : 'bg-hud-red/10 text-hud-red'}`}>
      {children}
    </p>
  );
}

const THEMES: { id: Theme; label: string; icon: string }[] = [
  { id: 'light', label: 'Light', icon: '☀️' },
  { id: 'dark', label: 'Dark', icon: '🌙' },
];

export function AccountPage() {
  const { user, setUser, logout } = useAuth();
  const { theme, setTheme } = useTheme();

  const [bio, setBio] = useState(user?.bio ?? '');
  const [bioMsg, setBioMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const [blocked, setBlocked] = useState<string[]>([]);
  const [exportMsg, setExportMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const [confirming, setConfirming] = useState(false);
  const [deletePw, setDeletePw] = useState('');
  const [deleteMsg, setDeleteMsg] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchBlocked().then((r) => setBlocked(r.blocked)).catch(() => setBlocked([]));
  }, []);

  if (!user) return null;

  const saveBio = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const res = await updateUserProfile({ name: user.name, bio });
      setUser(res.user);
      setBioMsg({ ok: true, text: 'Saved.' });
    } catch (err) {
      setBioMsg({ ok: false, text: err instanceof Error ? err.message : 'Could not save.' });
    }
  };

  const savePassword = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const res = await changePassword(current, next);
      setStoredToken(res.token); // older sessions on other devices are now signed out
      setCurrent('');
      setNext('');
      setPwMsg({ ok: true, text: 'Password changed. Your other sessions have been signed out.' });
    } catch (err) {
      setPwMsg({ ok: false, text: err instanceof Error ? err.message : 'Could not change password.' });
    }
  };

  const doDelete = async () => {
    setDeleting(true);
    setDeleteMsg(null);
    try {
      await deleteAccount(deletePw);
      logout();
    } catch (err) {
      setDeleteMsg(err instanceof Error ? err.message : 'Could not delete your account.');
      setDeleting(false);
    }
  };

  return (
    <PageContainer>
      <div className="mx-auto flex max-w-2xl flex-col gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-hud-text">Account &amp; privacy</h1>
          <p className="text-sm text-hud-muted">
            Your name, email, phone, date of birth, test reports and notes are private. Other members only ever see your username, and whatever you choose to
            share. <Link to="/privacy" className="underline">Privacy Policy</Link>
          </p>
        </div>

        <Section title="Appearance">
          <p className="mb-3 text-sm text-hud-muted">Choose how the app looks. This is saved on this device.</p>
          <div className="flex gap-2" role="radiogroup" aria-label="Colour theme">
            {THEMES.map((t) => (
              <button
                key={t.id}
                type="button"
                role="radio"
                aria-checked={theme === t.id}
                onClick={() => setTheme(t.id)}
                className={`flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium transition-colors ${
                  theme === t.id ? 'border-hud-cyan bg-hud-cyan/10 text-hud-cyan' : 'border-hud-borderLight text-hud-text hover:bg-hud-panel2'
                }`}
              >
                <span aria-hidden="true">{t.icon}</span>
                {t.label}
              </button>
            ))}
          </div>
        </Section>

        <Section title="Your public profile">
          <p className="mb-3 text-sm text-hud-text">
            Username: <strong>{user.handle}</strong> <span className="text-hud-muted">(can't be changed)</span>
          </p>
          <form onSubmit={saveBio}>
            <label htmlFor="bio" className="mb-1 block text-sm font-medium text-hud-text">Short bio <span className="font-normal text-hud-muted">(optional, visible to members)</span></label>
            <textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} maxLength={280} rows={3} className={inputClass} />
            <div className="mt-2 flex items-center gap-3">
              <button type="submit" className="rounded-md bg-[#007bff] px-4 py-1.5 text-sm font-semibold text-white hover:bg-[#0056b3]">Save</button>
              <span className="text-xs text-hud-muted">{bio.length}/280 · Please don't include your real name or contact details.</span>
            </div>
            {bioMsg && <Status ok={bioMsg.ok}>{bioMsg.text}</Status>}
          </form>
        </Section>

        <Section title="Change password">
          <form onSubmit={savePassword} className="flex flex-col gap-3">
            <input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} placeholder="Current password" autoComplete="current-password" required className={inputClass} aria-label="Current password" />
            <input type="password" value={next} onChange={(e) => setNext(e.target.value)} placeholder="New password (10+ characters)" autoComplete="new-password" required minLength={10} maxLength={128} className={inputClass} aria-label="New password" />
            <button type="submit" className="self-start rounded-md bg-[#007bff] px-4 py-1.5 text-sm font-semibold text-white hover:bg-[#0056b3]">Change password</button>
            {pwMsg && <Status ok={pwMsg.ok}>{pwMsg.text}</Status>}
          </form>
        </Section>

        <Section title="Blocked members">
          {blocked.length === 0 ? (
            <p className="text-sm text-hud-muted">You haven't blocked anyone.</p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {blocked.map((h) => (
                <li key={h} className="flex items-center justify-between rounded-md bg-hud-panel2 px-3 py-2 text-sm">
                  <span>{h}</span>
                  <button
                    type="button"
                    onClick={async () => {
                      await unblockMember(h);
                      setBlocked((prev) => prev.filter((x) => x !== h));
                    }}
                    className="text-xs font-medium text-hud-cyan hover:underline"
                  >
                    Unblock
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Your data">
          <p className="mb-3 text-sm text-hud-muted">Download everything we hold about you — profile, pain log, test reports, discussions and replies — as a JSON file.</p>
          <button
            type="button"
            onClick={async () => {
              try {
                await downloadMyData();
                setExportMsg({ ok: true, text: 'Your download has started.' });
              } catch (err) {
                setExportMsg({ ok: false, text: err instanceof Error ? err.message : 'Export failed.' });
              }
            }}
            className="rounded-md border border-hud-borderLight px-4 py-1.5 text-sm font-medium hover:bg-hud-panel2"
          >
            Download my data
          </button>
          {exportMsg && <Status ok={exportMsg.ok}>{exportMsg.text}</Status>}
        </Section>

        <Section title="Delete my account">
          <p className="mb-3 text-sm text-hud-muted">
            This permanently erases your pain log and test reports, removes your discussions and replies, and closes your account. It can't be undone.
          </p>
          {confirming ? (
            <div className="flex flex-col gap-2">
              <input type="password" value={deletePw} onChange={(e) => setDeletePw(e.target.value)} placeholder="Enter your password to confirm" autoComplete="current-password" className={inputClass} aria-label="Password to confirm deletion" />
              <div className="flex gap-2">
                <button type="button" onClick={doDelete} disabled={deleting || !deletePw} className="rounded-md bg-hud-red px-4 py-1.5 text-sm font-semibold text-white hover:bg-[#c82333] disabled:opacity-60">
                  {deleting ? 'Deleting…' : 'Permanently delete my account'}
                </button>
                <button type="button" onClick={() => { setConfirming(false); setDeletePw(''); }} className="rounded-md border border-hud-borderLight px-4 py-1.5 text-sm font-medium hover:bg-hud-panel2">
                  Keep my account
                </button>
              </div>
              {deleteMsg && <Status ok={false}>{deleteMsg}</Status>}
            </div>
          ) : (
            <button type="button" onClick={() => setConfirming(true)} className="rounded-md border border-hud-red/50 px-4 py-1.5 text-sm font-medium text-hud-red hover:bg-hud-red/5">
              Delete my account…
            </button>
          )}
        </Section>
      </div>
    </PageContainer>
  );
}
