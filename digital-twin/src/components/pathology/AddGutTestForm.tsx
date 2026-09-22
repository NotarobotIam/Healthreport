import { useMemo, useState, type FormEvent } from 'react';
import { createReport } from '../../data/remote/reportsApi';
import { GUT_BY_ID, GUT_TEMPLATES, gutFlags } from '../../data/pathology/gutCatalog';
import type { ReportDTO } from '../../types';

const inputClass = 'w-full rounded-md border border-hud-borderLight bg-hud-panel px-3 py-2 text-sm focus:border-hud-cyan focus:outline-none';
const today = () => new Date().toISOString().slice(0, 10);

/** Records a gut or microbiome test result. It is saved as an ordinary report, so it also shows on the Reports tab. */
export function AddGutTestForm({ onSaved, onCancel }: { onSaved: (r: ReportDTO) => void; onCancel: () => void }) {
  const [templateId, setTemplateId] = useState(GUT_TEMPLATES[0].id);
  const [date, setDate] = useState(today());
  const [values, setValues] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState('');
  const [flaggedByClinician, setFlaggedByClinician] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const template = GUT_BY_ID.get(templateId)!;

  /** The values typed so far, as they would be saved (numbers as numbers). Anything invalid is reported. */
  const parsed = useMemo(() => {
    const results: Record<string, unknown> = { examKind: template.id };
    let problem: string | null = null;
    for (const f of template.fields) {
      const raw = (values[f.key] ?? '').trim();
      if (!raw) continue;
      if (f.kind === 'number') {
        const n = Number(raw);
        if (!Number.isFinite(n) || n < 0 || (f.max !== undefined && n > f.max)) {
          problem ??= `${f.label} must be a number from 0${f.max !== undefined ? ` to ${f.max}` : ''}.`;
          continue;
        }
        results[f.key] = n;
      } else {
        results[f.key] = raw;
      }
    }
    return { results, problem };
  }, [template, values]);
  const flags = gutFlags(template.id, parsed.results);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!date) return setError('Choose the date of the test.');
    if (parsed.problem) return setError(parsed.problem);
    if (Object.keys(parsed.results).length === 1) return setError('Fill in at least one result.');
    setBusy(true);
    setError(null);
    try {
      const res = await createReport({
        testName: template.title, testDate: date, testType: 'Microbiome', results: parsed.results,
        ...(notes.trim() && { notes: notes.trim() }),
        normal: !(flaggedByClinician || flags.length > 0),
      });
      onSaved(res.report);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save this result.');
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="rounded-2xl bg-hud-panel p-5 shadow-sm">
      <h2 className="mb-1 text-base font-semibold text-hud-text">Add a gut test result</h2>
      <p className="mb-4 text-xs text-hud-muted">Copy the numbers from your report. Leave blank anything that was not measured.</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-hud-text">Which test?</span>
          <select value={templateId} onChange={(e) => { setTemplateId(e.target.value as typeof templateId); setValues({}); }} className={inputClass}>
            {GUT_TEMPLATES.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-hud-text">Date of the test</span>
          <input type="date" value={date} max={today()} onChange={(e) => setDate(e.target.value)} required className={inputClass} />
        </label>
      </div>
      <p className="mt-2 text-xs text-hud-muted">{template.blurb}</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {template.fields.map((f) => (
          <label key={f.key} className={`block ${f.key === 'interpretation' ? 'sm:col-span-2' : ''}`}>
            <span className="mb-1 block text-xs font-medium text-hud-text">{f.label}{f.unit && <span className="font-normal text-hud-muted"> ({f.unit})</span>}</span>
            {f.kind === 'choice' ? (
              <select value={values[f.key] ?? ''} onChange={(e) => setValues((p) => ({ ...p, [f.key]: e.target.value }))} className={inputClass}>
                <option value="">Not sure / not done</option>
                {f.options!.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            ) : (
              <input
                type={f.kind === 'number' ? 'number' : 'text'}
                step={f.kind === 'number' ? 'any' : undefined}
                min={f.kind === 'number' ? 0 : undefined}
                max={f.kind === 'number' ? f.max : undefined}
                inputMode={f.kind === 'number' ? 'decimal' : undefined}
                maxLength={f.kind === 'text' ? 200 : undefined}
                value={values[f.key] ?? ''}
                onChange={(e) => setValues((p) => ({ ...p, [f.key]: e.target.value }))}
                placeholder={f.placeholder}
                className={inputClass}
              />
            )}
          </label>
        ))}
      </div>
      <label className="mt-4 block">
        <span className="mb-1 block text-xs font-medium text-hud-text">Anything else your clinician said <span className="font-normal text-hud-muted">(optional)</span></span>
        <textarea value={notes} maxLength={2000} rows={2} onChange={(e) => setNotes(e.target.value)} className={inputClass} />
      </label>
      <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm text-hud-text">
        <input type="checkbox" checked={flaggedByClinician} onChange={(e) => setFlaggedByClinician(e.target.checked)} className="h-4 w-4" />
        My clinician flagged something to follow up
      </label>
      {flags.length > 0 && (
        <div role="status" className="mt-3 rounded-md bg-hud-amber/10 px-3 py-2 text-sm text-hud-text">
          <p className="font-medium">Some values are outside a commonly used range, so this result will be listed under “To follow up”.</p>
          <ul className="ml-4 mt-1 list-disc text-xs">{flags.map((f) => <li key={f.field}>{f.text}</li>)}</ul>
        </div>
      )}
      {error && <p role="alert" className="mt-3 rounded-md bg-hud-red/10 px-3 py-2 text-sm text-hud-red">{error}</p>}
      <div className="mt-4 flex gap-2">
        <button type="submit" disabled={busy} className="rounded-md bg-[#007bff] px-5 py-2 text-sm font-semibold text-white hover:bg-[#0056b3] disabled:opacity-60">{busy ? 'Saving…' : 'Save result'}</button>
        <button type="button" onClick={onCancel} className="rounded-md border border-hud-borderLight px-5 py-2 text-sm font-medium hover:bg-hud-panel2">Cancel</button>
      </div>
    </form>
  );
}
