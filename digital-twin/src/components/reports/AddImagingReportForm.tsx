import { useState, type FormEvent } from 'react';
import { createReport } from '../../data/remote/reportsApi';
import { COMMON_BODY_REGIONS, IMAGING_MODALITIES, type ImagingModality } from '../../data/reports/imagingCatalog';
import type { ReportDTO } from '../../types';

const inputClass = 'w-full rounded-md border border-hud-borderLight bg-hud-panel px-3 py-2 text-sm text-hud-text focus:border-hud-cyan focus:outline-none';
const today = () => new Date().toISOString().slice(0, 10);

/** Records a scan (X-ray, ultrasound, CT, MRI, PET). Saved as an ordinary report, so it also shows on the Data page. */
export function AddImagingReportForm({ onSaved, onCancel }: { onSaved: (r: ReportDTO) => void; onCancel: () => void }) {
  const [modality, setModality] = useState<ImagingModality>('MRI');
  const [bodyRegion, setBodyRegion] = useState('');
  const [date, setDate] = useState(today());
  const [findings, setFindings] = useState('');
  const [notes, setNotes] = useState('');
  const [flagged, setFlagged] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const region = bodyRegion.trim();
    if (!region) {
      setError('Say what part of the body this scan was of.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await createReport({
        testName: `${modality} — ${region}`,
        testDate: date,
        testType: 'Imaging',
        results: { imaging: { modality, bodyRegion: region, ...(findings.trim() && { findings: findings.trim() }) } },
        ...(notes.trim() && { notes: notes.trim() }),
        normal: !flagged,
      });
      onSaved(res.report);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save this report.');
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="rounded-2xl bg-hud-panel p-5 shadow-sm">
      <h2 className="mb-1 text-base font-semibold text-hud-text">Add a scan</h2>
      <p className="mb-4 text-xs text-hud-muted">An X-ray, ultrasound, CT, MRI or PET result. Copy the details from your report.</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-hud-text">Type of scan</span>
          <select value={modality} onChange={(e) => setModality(e.target.value as ImagingModality)} className={inputClass}>
            {IMAGING_MODALITIES.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-hud-text">Date of the scan</span>
          <input type="date" value={date} max={today()} onChange={(e) => setDate(e.target.value)} required className={inputClass} />
        </label>
      </div>
      <label className="mt-4 block">
        <span className="mb-1 block text-xs font-medium text-hud-text">Part of the body</span>
        <input
          list="imaging-body-regions"
          value={bodyRegion}
          onChange={(e) => setBodyRegion(e.target.value)}
          maxLength={100}
          placeholder="e.g. Lumbar spine, or Kidneys and bladder"
          className={inputClass}
        />
        <datalist id="imaging-body-regions">
          {COMMON_BODY_REGIONS.map((r) => <option key={r} value={r} />)}
        </datalist>
      </label>
      <label className="mt-4 block">
        <span className="mb-1 block text-xs font-medium text-hud-text">Findings <span className="font-normal text-hud-muted">(optional)</span></span>
        <textarea value={findings} maxLength={2000} rows={3} onChange={(e) => setFindings(e.target.value)} placeholder="What the radiologist's report said" className={inputClass} />
      </label>
      <label className="mt-4 block">
        <span className="mb-1 block text-xs font-medium text-hud-text">Anything else <span className="font-normal text-hud-muted">(optional)</span></span>
        <textarea value={notes} maxLength={2000} rows={2} onChange={(e) => setNotes(e.target.value)} className={inputClass} />
      </label>
      <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm text-hud-text">
        <input type="checkbox" checked={flagged} onChange={(e) => setFlagged(e.target.checked)} className="h-4 w-4" />
        My clinician flagged something to follow up
      </label>
      {error && <p role="alert" className="mt-3 rounded-md bg-hud-red/10 px-3 py-2 text-sm text-hud-red">{error}</p>}
      <div className="mt-4 flex gap-2">
        <button type="submit" disabled={busy} className="rounded-md bg-[#007bff] px-5 py-2 text-sm font-semibold text-white hover:bg-[#0056b3] disabled:opacity-60">{busy ? 'Saving…' : 'Save scan'}</button>
        <button type="button" onClick={onCancel} className="rounded-md border border-hud-borderLight px-5 py-2 text-sm font-medium hover:bg-hud-panel2">Cancel</button>
      </div>
    </form>
  );
}
