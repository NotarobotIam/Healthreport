import { useState } from 'react';
import { reportContent } from '../../data/remote/communityApi';
import { REPORT_REASONS, type ReportReason, type ReportTarget } from '../../types';

interface ReportDialogProps {
  targetType: ReportTarget;
  targetId: string;
  onClose: () => void;
}

export function ReportDialog({ targetType, targetId, onClose }: ReportDialogProps) {
  const [reason, setReason] = useState<ReportReason | ''>('');
  const [details, setDetails] = useState('');
  const [state, setState] = useState<'form' | 'sending' | 'done'>('form');
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!reason) {
      setError('Please choose a reason.');
      return;
    }
    setState('sending');
    setError(null);
    try {
      await reportContent(targetType, targetId, reason, details.trim() || undefined);
      setState('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send your report.');
      setState('form');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-label="Report">
      <div className="w-full max-w-md rounded-lg bg-hud-panel p-5 shadow-xl">
        {state === 'done' ? (
          <>
            <h2 className="text-base font-semibold text-hud-text">Thank you</h2>
            <p className="mt-2 text-sm text-hud-muted">
              Our moderators will review this. If someone is in immediate danger, please contact local emergency services.
            </p>
            <button type="button" onClick={onClose} className="mt-4 rounded-md bg-[#007bff] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0056b3]">
              Close
            </button>
          </>
        ) : (
          <>
            <h2 className="text-base font-semibold text-hud-text">Report this {targetType === 'user' ? 'member' : targetType}</h2>
            <fieldset className="mt-3 flex flex-col gap-1.5">
              <legend className="sr-only">Reason</legend>
              {REPORT_REASONS.map((r) => (
                <label key={r.value} className="flex cursor-pointer items-center gap-2 text-sm text-hud-text">
                  <input type="radio" name="reason" checked={reason === r.value} onChange={() => setReason(r.value)} className="accent-hud-cyan" />
                  {r.label}
                </label>
              ))}
            </fieldset>
            <label htmlFor="report-details" className="mt-3 block text-sm font-medium text-hud-text">
              Anything we should know? <span className="font-normal text-hud-muted">(optional)</span>
            </label>
            <textarea
              id="report-details"
              value={details}
              maxLength={500}
              rows={3}
              onChange={(e) => setDetails(e.target.value)}
              className="mt-1 w-full rounded-md border border-hud-borderLight px-3 py-2 text-sm focus:border-hud-cyan focus:outline-none"
            />
            {error && (
              <p role="alert" className="mt-2 text-sm text-hud-red">
                {error}
              </p>
            )}
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={submit}
                disabled={state === 'sending'}
                className="rounded-md bg-[#007bff] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0056b3] disabled:opacity-60"
              >
                {state === 'sending' ? 'Sending…' : 'Send report'}
              </button>
              <button type="button" onClick={onClose} className="rounded-md border border-hud-borderLight px-4 py-2 text-sm font-medium hover:bg-hud-panel2">
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
