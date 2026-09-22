import { usePainEntries } from '../../hooks/usePainEntries';
import { usePhysiologyData } from '../../hooks/usePhysiologyData';
import { formatOnset, formatSide, formatTypes } from '../atlas/painFormat';
import type { InsightDTO } from '../../types';

/** A one-page summary to take to an appointment: the logged records, and the questions to ask. Print or save as PDF. */
export function DoctorSummary({ insight }: { insight: InsightDTO }) {
  const pain = usePainEntries();
  const phys = usePhysiologyData();
  const r = insight.result;
  const today = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <section id="doctor-summary" className="rounded-2xl bg-hud-panel p-5 shadow-sm sm:p-6" aria-label="Summary for your doctor">
      <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-hud-text">🩺 Take this to your doctor</h2>
        <button type="button" onClick={() => window.print()} className="rounded-md bg-[#007bff] px-4 py-1.5 text-sm font-semibold text-white hover:bg-[#0056b3]">Print or save as PDF</button>
      </div>
      <div className="print-page">
        <h2 className="hidden text-xl font-semibold print:block">{insight.kind === 'question' ? 'Question for my doctor' : insight.kind === 'pain' ? 'Pain log summary' : 'Physiology summary'} — prepared {today}</h2>
        <p className="text-sm text-hud-muted">Made by the patient using an AI-assisted tool to prepare for this visit. It is not a diagnosis, and the ideas below are for the clinician's judgement.</p>

        {insight.question && (
          <>
            <h3 className="mt-4 text-sm font-semibold text-hud-text">The patient's question</h3>
            <p className="mt-1 text-sm text-hud-text">{insight.question}</p>
          </>
        )}
        {insight.kind !== 'question' && <h3 className="mt-4 text-sm font-semibold text-hud-text">What the patient recorded</h3>}
        {insight.kind === 'question' ? null : insight.kind === 'pain' ? (
          <table className="mt-2 w-full text-left text-sm">
            <thead><tr className="border-b border-hud-border text-xs uppercase text-hud-muted"><th className="py-1 pr-2">Where</th><th className="pr-2">Feels like</th><th className="pr-2">Strength</th><th className="pr-2">Started</th><th>Pattern</th></tr></thead>
            <tbody>
              {pain.entries.slice(0, 15).map((e) => (
                <tr key={e._id} className="border-b border-hud-border align-top">
                  <td className="py-1 pr-2">{e.location.partName}{formatSide(e.location.side) && ` (${formatSide(e.location.side).toLowerCase()})`}</td>
                  <td className="pr-2">{formatTypes(e.painTypes)}</td>
                  <td className="pr-2">{e.severity}/10</td>
                  <td className="pr-2">{formatOnset(e.onset)}</td>
                  <td>{e.pattern.replace(/-/g, ' ')}{e.status === 'resolved' ? ' (resolved)' : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="mt-2 w-full text-left text-sm">
            <thead><tr className="border-b border-hud-border text-xs uppercase text-hud-muted"><th className="py-1 pr-2">Date</th><th className="pr-2">BP</th><th className="pr-2">Heart rate</th><th className="pr-2">Oxygen</th><th>Weight</th></tr></thead>
            <tbody>
              {phys.vitals.slice(0, 12).map((v) => (
                <tr key={v._id} className="border-b border-hud-border">
                  <td className="py-1 pr-2">{new Date(v.measuredAt).toLocaleDateString()}</td>
                  <td className="pr-2">{v.systolic ? `${v.systolic}/${v.diastolic}` : '–'}</td>
                  <td className="pr-2">{v.heartRate ?? '–'}</td>
                  <td className="pr-2">{v.spo2 ? `${v.spo2}%` : '–'}</td>
                  <td>{v.weightKg ? `${v.weightKg} kg` : '–'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <h3 className="mt-5 text-sm font-semibold text-hud-text">Patterns the tool noticed</h3>
        <p className="mt-1 text-sm text-hud-text">{r.summary}</p>
        {r.possibilities.length > 0 && (
          <>
            <h3 className="mt-4 text-sm font-semibold text-hud-text">Possibilities the patient would like to discuss</h3>
            <ol className="ml-5 mt-1 list-decimal space-y-1 text-sm text-hud-text">
              {r.possibilities.map((p) => (<li key={p.name}><strong>{p.name}</strong> — {p.why}</li>))}
            </ol>
          </>
        )}
        {r.testsToAskAbout.length > 0 && (<><h3 className="mt-4 text-sm font-semibold text-hud-text">Tests or checks to ask about</h3><ul className="ml-5 mt-1 list-disc text-sm text-hud-text">{r.testsToAskAbout.map((t) => (<li key={t}>{t}</li>))}</ul></>)}
        <h3 className="mt-4 text-sm font-semibold text-hud-text">Questions for the doctor</h3>
        <ul className="ml-5 mt-1 list-disc space-y-1 text-sm text-hud-text">
          {r.questionsForDoctor.map((q) => (<li key={q}>{q}</li>))}
          <li>Is there anything here I should be more (or less) concerned about?</li>
        </ul>
        <p className="mt-5 border-t border-hud-border pt-3 text-xs text-hud-muted">{insight.disclaimer}</p>
      </div>
    </section>
  );
}
