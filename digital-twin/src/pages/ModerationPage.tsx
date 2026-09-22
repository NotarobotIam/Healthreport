import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { apiPost } from '../data/remote/apiClient';
import { fetchModActions, fetchModReports, resolveReport, type ModAuditEntry } from '../data/remote/moderationApi';
import { PostText } from '../components/community/PostText';
import { RoleBadge } from '../components/community/RoleBadge';
import { authorLabel, timeAgo } from '../components/community/format';
import { PageContainer } from '../components/dashboardUi';
import { REPORT_REASONS, type ModAction, type ModReportDTO } from '../types';

type Tab = 'open' | 'actioned' | 'dismissed' | 'audit';

const reasonLabel = (r: string) => REPORT_REASONS.find((x) => x.value === r)?.label ?? r;

function ReportRow({ report, onDone }: { report: ModReportDTO; onDone: () => void }) {
  const [note, setNote] = useState('');
  const [days, setDays] = useState('7');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const t = report.target;
  const isCrisis = report.reason === 'self-harm';
  const open = report.status === 'open';

  const act = async (action: ModAction) => {
    setBusy(true);
    setError(null);
    try {
      await resolveReport(report.id, action, { note: note.trim() || undefined, ...(action === 'suspend_author' && { days: Number(days) }) });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed.');
      setBusy(false);
    }
  };

  return (
    <li className={`rounded-lg border bg-hud-panel p-4 ${isCrisis ? 'border-hud-red/50' : 'border-hud-border'}`}>
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className={`rounded-full px-2 py-0.5 font-semibold ${isCrisis ? 'bg-hud-red/15 text-hud-red' : 'bg-hud-panel2 text-hud-text ring-1 ring-hud-border'}`}>
          {isCrisis ? '⚠ Possible crisis' : reasonLabel(report.reason)}
        </span>
        <span className="text-hud-muted">{report.source === 'system' ? 'Auto-flagged' : `Reported by ${report.reporter ?? 'a member'}`}</span>
        <span className="text-hud-muted">· {timeAgo(report.createdAt)}</span>
        {!open && <span className="ml-auto font-semibold text-hud-muted">{report.status}{report.action ? ` (${report.action})` : ''}</span>}
      </div>
      {report.details && <p className="mt-2 text-sm italic text-hud-muted">“{report.details}”</p>}

      <div className="mt-3 rounded-md bg-hud-panel2 p-3">
        {!t ? (
          <p className="text-sm text-hud-muted">The reported item no longer exists.</p>
        ) : (
          <>
            <p className="flex flex-wrap items-center gap-2 text-xs text-hud-muted">
              <span className="font-semibold uppercase">{t.type}</span>
              {t.author && <span>by {authorLabel(t.author)}</span>}
              {t.author && <RoleBadge role={t.author.role} />}
              <span>· {t.status}</span>
              {t.threadId && <Link to={`/community/thread/${t.threadId}`} className="font-medium text-hud-cyan hover:underline">Open</Link>}
            </p>
            {t.title && <p className="mt-1 text-sm font-semibold text-hud-text">{t.title}</p>}
            {t.excerpt && <PostText className="mt-1 text-sm text-hud-text">{t.excerpt}</PostText>}
            {t.type === 'user' && <p className="mt-1 text-sm text-hud-text">{t.handle}{t.bio ? ` — ${t.bio}` : ''}</p>}
          </>
        )}
      </div>

      {open && t && (
        <>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={500}
            placeholder="Note (kept in the audit log)"
            aria-label="Moderator note"
            className="mt-3 w-full rounded-md border border-hud-borderLight px-3 py-1.5 text-sm focus:border-hud-cyan focus:outline-none"
          />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button type="button" disabled={busy} onClick={() => act('dismiss')} className="rounded-md border border-hud-borderLight px-3 py-1.5 text-xs font-medium hover:bg-hud-panel2">Dismiss</button>
            {t.type !== 'user' && (
              <>
                <button type="button" disabled={busy} onClick={() => act('hide')} className="rounded-md border border-hud-amber/60 px-3 py-1.5 text-xs font-medium hover:bg-hud-amber/10">Hide (reversible)</button>
                <button type="button" disabled={busy} onClick={() => act('remove')} className="rounded-md bg-hud-red px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#c82333]">Remove</button>
              </>
            )}
            <span className="ml-auto flex items-center gap-1 text-xs text-hud-muted">
              <button type="button" disabled={busy} onClick={() => act('suspend_author')} className="rounded-md border border-hud-red/50 px-3 py-1.5 font-medium text-hud-red hover:bg-hud-red/5">
                Suspend {t.type === 'user' ? 'member' : 'author'}
              </button>
              for
              <input type="number" min={1} max={365} value={days} onChange={(e) => setDays(e.target.value)} aria-label="Suspension days" className="w-14 rounded-md border border-hud-borderLight px-1.5 py-1 text-xs" />
              days
            </span>
          </div>
          {error && <p role="alert" className="mt-2 text-sm text-hud-red">{error}</p>}
        </>
      )}
    </li>
  );
}

function RoleForm() {
  const [handle, setHandle] = useState('');
  const [role, setRole] = useState('moderator');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await apiPost(`/mod/users/${encodeURIComponent(handle.trim().toLowerCase())}/role`, { role });
      setMsg({ ok: true, text: `${handle} is now ${role}.` });
      setHandle('');
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : 'Failed.' });
    }
  };
  return (
    <form onSubmit={submit} className="mt-6 rounded-lg border border-hud-border bg-hud-panel p-4">
      <h2 className="mb-2 text-sm font-semibold text-hud-text">Change a member's role (admins only)</h2>
      <div className="flex flex-wrap gap-2">
        <input value={handle} onChange={(e) => setHandle(e.target.value)} placeholder="username" required aria-label="Username" className="min-w-0 flex-1 rounded-md border border-hud-borderLight px-3 py-1.5 text-sm" />
        <select value={role} onChange={(e) => setRole(e.target.value)} aria-label="Role" className="rounded-md border border-hud-borderLight bg-hud-panel px-2 py-1.5 text-sm">
          <option value="user">Member</option>
          <option value="moderator">Moderator</option>
          <option value="admin">Admin</option>
        </select>
        <button type="submit" className="rounded-md bg-[#007bff] px-4 py-1.5 text-sm font-semibold text-white hover:bg-[#0056b3]">Apply</button>
      </div>
      {msg && <p role={msg.ok ? 'status' : 'alert'} className={`mt-2 text-sm ${msg.ok ? 'text-hud-green' : 'text-hud-red'}`}>{msg.text}</p>}
    </form>
  );
}

export function ModerationPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('open');
  const [reports, setReports] = useState<ModReportDTO[]>([]);
  const [audit, setAudit] = useState<ModAuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (tab === 'audit') setAudit((await fetchModActions()).actions);
      else {
        const res = await fetchModReports(tab);
        setReports(res.reports);
        setTotal(res.total);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load.');
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    void load();
  }, [load]);

  const tabs: { id: Tab; label: string }[] = [
    { id: 'open', label: 'Needs review' },
    { id: 'actioned', label: 'Actioned' },
    { id: 'dismissed', label: 'Dismissed' },
    { id: 'audit', label: 'Audit log' },
  ];

  return (
    <PageContainer>
      <h1 className="text-2xl font-semibold text-hud-text">Moderation</h1>
      <p className="mb-4 text-sm text-hud-muted">
        Reports from members and automatic flags. Possible-crisis items are listed first — please look at those promptly. Contact details are never shown here.
      </p>
      <div className="mb-4 flex gap-1 border-b border-hud-border" role="tablist">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium ${tab === t.id ? 'border-hud-cyan text-hud-cyan' : 'border-transparent text-hud-muted hover:text-hud-text'}`}
          >
            {t.label}
            {t.id === 'open' && tab === 'open' && total > 0 ? ` (${total})` : ''}
          </button>
        ))}
      </div>

      {error && <p role="alert" className="mb-3 rounded-md bg-hud-red/10 px-3 py-2 text-sm text-hud-red">{error}</p>}
      {loading ? (
        <p className="py-8 text-center text-sm text-hud-muted">Loading…</p>
      ) : tab === 'audit' ? (
        <ul className="flex flex-col gap-1.5">
          {audit.length === 0 && <li className="text-sm text-hud-muted">No moderation actions yet.</li>}
          {audit.map((a) => (
            <li key={a.id} className="rounded-md bg-hud-panel px-3 py-2 text-sm">
              <strong>{a.moderator ?? 'unknown'}</strong> · {a.action} · {a.targetType}
              {a.note && <span className="text-hud-muted"> — {a.note}</span>}
              <span className="float-right text-xs text-hud-muted">{timeAgo(a.createdAt)}</span>
            </li>
          ))}
        </ul>
      ) : reports.length === 0 ? (
        <div className="rounded-lg border border-dashed border-hud-borderLight p-8 text-center text-sm text-hud-muted">
          {tab === 'open' ? 'Nothing needs review right now. 🎉' : 'Nothing here.'}
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {reports.map((r) => (
            <ReportRow key={r.id} report={r} onDone={load} />
          ))}
        </ul>
      )}

      {user?.role === 'admin' && <RoleForm />}
    </PageContainer>
  );
}
