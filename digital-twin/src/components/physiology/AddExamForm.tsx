import { useState, type FormEvent } from 'react';
import { createReport } from '../../data/remote/reportsApi';
import { CATEGORY_LABEL, EXAM_BY_ID, EXAM_TEMPLATES, type ExamCategory } from '../../data/physiology/examCatalog';
import type { ReportDTO } from '../../types';

const inputClass = 'w-full rounded-md border border-hud-borderLight px-3 py-2 text-sm focus:border-hud-cyan focus:outline-none';
const today = () => new Date().toISOString().slice(0, 10);

interface Props {
  /** Limit the choices to one part of the appointment (the Heart tab passes "heart"). */
  category?: ExamCategory;
  onSaved: (r: ReportDTO) => void;
  onCancel: () => void;
}

/** Records an exam result from a template. It is saved as an ordinary report, so it also shows on the Reports tab. */
export function AddExamForm({ category, onSaved, onCancel }: Props) {
  const choices = EXAM_TEMPLATES.filter((t) => !category || t.category === category);
  const [templateId, setTemplateId] = useState(choices[0].id);
  const [date, setDate] = useState(today());
  const [values, setValues] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState('');
  const [abnormal, setAbnormal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const template = EXAM_BY_ID.get(templateId)!;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const results: Record<string, unknown> = { examKind: template.id };
    for (const f of template.fields) {
      const raw = (values[f.key] ?? '').trim();
      if (!raw) continue;
      if (f.kind === 'number') {
        const n = Number(raw);
        if (!Number.isFinite(n)) {
          setError(`${f.label} must be a number.`);
          return;
        }
        results[f.key] = n;
      } else {
        results[f.key] = raw;
      }
    }
    if (Object.keys(results).length === 1) {
      setError('Fill in at least one result.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await createReport({ testName: template.title, testDate: date, testType: template.testType, results, ...(notes.trim() && { notes: notes.trim() }), normal: !abnormal });
      onSaved(res.report);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save this result.');
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="rounded-2xl bg-hud-panel p-5 shadow-sm">
      <h2 className="mb-1 text-base font-semibold text-hud-text">Add an exam result</h2>
      <p className="mb-4 text-xs text-hud-muted">Copy the numbers from your report. Leave anything blank that wasn't measured.</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-hud-text">Which exam?</span>
          <select value={templateId} onChange={(e) => { setTemplateId(e.target.value); setValues({}); }} className={`${inputClass} bg-hud-panel`}>
            {(['heart', 'lungs', 'fitness', 'body'] as ExamCategory[])
              .filter((c) => choices.some((t) => t.category === c))
              .map((c) => (
                <optgroup key={c} label={CATEGORY_LABEL[c]}>
                  {choices.filter((t) => t.category === c).map((t) => (
                    <option key={t.id} value={t.id}>{t.title}</option>
                  ))}
                </optgroup>
              ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-hud-text">Date of the exam</span>
          <input type="date" value={date} max={today()} onChange={(e) => setDate(e.target.value)} required className={inputClass} />
        </label>
      </div>
      <p className="mt-2 text-xs text-hud-muted">{template.blurb}</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {template.fields.map((f) => (
          <label key={f.key} className={`block ${f.kind === 'text' && f.key === 'interpretation' ? 'sm:col-span-2' : ''}`}>
            <span className="mb-1 block text-xs font-medium text-hud-text">{f.label}{f.unit && <span className="font-normal text-hud-muted"> ({f.unit})</span>}</span>
            <input
              type={f.kind === 'number' ? 'number' : 'text'}
              step={f.kind === 'number' ? 'any' : undefined}
              inputMode={f.kind === 'number' ? 'decimal' : undefined}
              maxLength={f.kind === 'text' ? 200 : undefined}
              value={values[f.key] ?? ''}
              onChange={(e) => setValues((p) => ({ ...p, [f.key]: e.target.value }))}
              placeholder={f.placeholder}
              className={inputClass}
            />
          </label>
        ))}
      </div>
      <label className="mt-4 block">
        <span className="mb-1 block text-xs font-medium text-hud-text">Anything else your clinician said <span className="font-normal text-hud-muted">(optional)</span></span>
        <textarea value={notes} maxLength={2000} rows={2} onChange={(e) => setNotes(e.target.value)} className={inputClass} />
      </label>
      <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm text-hud-text">
        <input type="checkbox" checked={abnormal} onChange={(e) => setAbnormal(e.target.checked)} className="h-4 w-4" />
        My clinician flagged something to follow up
      </label>
      {error && <p role="alert" className="mt-3 rounded-md bg-hud-red/10 px-3 py-2 text-sm text-hud-red">{error}</p>}
      <div className="mt-4 flex gap-2">
        <button type="submit" disabled={busy} className="rounded-md bg-[#007bff] px-5 py-2 text-sm font-semibold text-white hover:bg-[#0056b3] disabled:opacity-60">{busy ? 'Saving…' : 'Save result'}</button>
        <button type="button" onClick={onCancel} className="rounded-md border border-hud-borderLight px-5 py-2 text-sm font-medium hover:bg-hud-panel2">Cancel</button>
      </div>
    </form>
  );
}
