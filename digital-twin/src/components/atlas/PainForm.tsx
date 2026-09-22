import { useMemo, useState, type FormEvent } from 'react';
import {
  PAIN_PATTERNS,
  PAIN_TYPES,
  PAIN_TYPE_HINTS,
  TRIGGER_SUGGESTIONS,
  type PainEntryDTO,
  type PainInput,
  type PainLocation,
  type PainPattern,
  type PainType,
  type PainVisibility,
} from '../../types';
import { formatSide, safetyNotes, severityBand, toLocalInputValue } from './painFormat';

interface PainFormProps {
  location: PainLocation;
  /** Present when editing an existing entry; the spot itself can't change then. */
  initial?: PainEntryDTO;
  onChangeSpot?: () => void;
  onSubmit: (input: PainInput) => Promise<void>;
  onCancel: () => void;
}

const HOUR = 3600_000;
const ONSET_SHORTCUTS: { label: string; msAgo: number }[] = [
  { label: 'Just now', msAgo: 0 },
  { label: 'A few hours ago', msAgo: 3 * HOUR },
  { label: 'Yesterday', msAgo: 24 * HOUR },
  { label: 'A few days ago', msAgo: 72 * HOUR },
  { label: 'A week or more', msAgo: 7 * 24 * HOUR },
];

const chipClass = (active: boolean) =>
  `rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
    active ? 'border-hud-cyan bg-hud-cyan/10 text-hud-cyan' : 'border-hud-borderLight text-hud-text hover:bg-hud-panel2'
  }`;

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <fieldset className="min-w-0">
      <legend className="mb-1.5 text-sm font-semibold text-hud-text">{label}</legend>
      {hint && <p className="-mt-1 mb-2 text-xs text-hud-muted">{hint}</p>}
      {children}
    </fieldset>
  );
}

export function PainForm({ location, initial, onChangeSpot, onSubmit, onCancel }: PainFormProps) {
  const [types, setTypes] = useState<PainType[]>(initial?.painTypes ?? []);
  const [severity, setSeverity] = useState(initial?.severity ?? 5);
  const [onset, setOnset] = useState(toLocalInputValue(initial ? new Date(initial.onset) : new Date()));
  const [pattern, setPattern] = useState<PainPattern>(initial?.pattern ?? 'constant');
  const [triggers, setTriggers] = useState<string[]>(initial?.triggers ?? []);
  const [customTrigger, setCustomTrigger] = useState('');
  const [radiatesTo, setRadiatesTo] = useState(initial?.radiatesTo ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [visibility, setVisibility] = useState<PainVisibility>(initial?.visibility ?? 'private');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const band = severityBand(severity);
  const notesForUser = useMemo(() => safetyNotes(location, severity), [location, severity]);
  const nowLocal = toLocalInputValue(new Date());
  const side = formatSide(location.side);

  const toggleType = (t: PainType) =>
    setTypes((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  const toggleTrigger = (t: string) =>
    setTriggers((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  const addCustomTrigger = () => {
    const t = customTrigger.trim();
    if (t && !triggers.includes(t) && triggers.length < 10) setTriggers((prev) => [...prev, t]);
    setCustomTrigger('');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (types.length === 0) {
      setError('Pick at least one word that describes the pain.');
      return;
    }
    const onsetDate = new Date(onset);
    if (Number.isNaN(onsetDate.getTime())) {
      setError('Enter when the pain started.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSubmit({
        location,
        painTypes: types,
        severity,
        onset: onsetDate.toISOString(),
        pattern,
        triggers,
        radiatesTo: radiatesTo.trim(),
        notes: notes.trim(),
        visibility,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save this entry.');
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="rounded-lg border border-hud-border bg-hud-panel2 p-3">
        <p className="hud-panel-title mb-1">Where it hurts</p>
        <p className="text-sm font-semibold text-hud-text">{location.partName}</p>
        {side && <p className="text-xs text-hud-muted">{side}</p>}
        {onChangeSpot && !initial && (
          <button type="button" onClick={onChangeSpot} className="mt-1.5 text-xs font-medium text-hud-cyan hover:underline">
            Choose a different spot
          </button>
        )}
        {onChangeSpot && !initial && (
          <p className="mt-1 text-[11px] text-hud-muted">Or tap the body again to move the marker.</p>
        )}
      </div>

      <Field label="What does it feel like?" hint="Pick all that fit.">
        <div className="flex flex-wrap gap-1.5">
          {PAIN_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              title={PAIN_TYPE_HINTS[t]}
              aria-pressed={types.includes(t)}
              onClick={() => toggleType(t)}
              className={chipClass(types.includes(t))}
            >
              {t[0].toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
        {types.length > 0 && (
          <p className="mt-2 text-xs text-hud-muted">
            {types.map((t) => `${t[0].toUpperCase()}${t.slice(1)}: ${PAIN_TYPE_HINTS[t].toLowerCase()}`).join(' · ')}
          </p>
        )}
      </Field>

      <Field label="How strong is it?" hint="0 is no pain, 10 is the worst you can imagine.">
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={0}
            max={10}
            step={1}
            value={severity}
            onChange={(e) => setSeverity(Number(e.target.value))}
            aria-label="Pain severity from 0 to 10"
            className="h-2 flex-1 cursor-pointer"
            style={{ accentColor: band.color }}
          />
          <span className="w-32 shrink-0 whitespace-nowrap text-right text-sm font-semibold" style={{ color: band.color }}>
            {severity}/10 · {band.label}
          </span>
        </div>
      </Field>

      <Field label="When did it start?">
        <div className="mb-2 flex flex-wrap gap-1.5">
          {ONSET_SHORTCUTS.map((s) => (
            <button
              key={s.label}
              type="button"
              onClick={() => setOnset(toLocalInputValue(new Date(Date.now() - s.msAgo)))}
              className={chipClass(false)}
            >
              {s.label}
            </button>
          ))}
        </div>
        <input
          type="datetime-local"
          value={onset}
          max={nowLocal}
          onChange={(e) => setOnset(e.target.value)}
          aria-label="Date and time the pain started"
          className="w-full rounded-md border border-hud-borderLight bg-hud-panel px-3 py-2 text-sm text-hud-text focus:border-hud-cyan focus:outline-none"
        />
      </Field>

      <Field label="How does it behave?">
        <div className="grid grid-cols-2 gap-1.5">
          {PAIN_PATTERNS.map((p) => (
            <button
              key={p.value}
              type="button"
              aria-pressed={pattern === p.value}
              onClick={() => setPattern(p.value)}
              className={`rounded-lg border px-3 py-2 text-left transition-colors ${
                pattern === p.value ? 'border-hud-cyan bg-hud-cyan/10' : 'border-hud-borderLight hover:bg-hud-panel2'
              }`}
            >
              <span className={`block text-xs font-semibold ${pattern === p.value ? 'text-hud-cyan' : 'text-hud-text'}`}>
                {p.label}
              </span>
              <span className="block text-[11px] text-hud-muted">{p.hint}</span>
            </button>
          ))}
        </div>
      </Field>

      <Field label="What brings it on or eases it?" hint="Optional.">
        <div className="flex flex-wrap gap-1.5">
          {TRIGGER_SUGGESTIONS.map((t) => (
            <button key={t} type="button" aria-pressed={triggers.includes(t)} onClick={() => toggleTrigger(t)} className={chipClass(triggers.includes(t))}>
              {t}
            </button>
          ))}
          {triggers
            .filter((t) => !(TRIGGER_SUGGESTIONS as readonly string[]).includes(t))
            .map((t) => (
              <button key={t} type="button" aria-pressed onClick={() => toggleTrigger(t)} className={chipClass(true)}>
                {t} ✕
              </button>
            ))}
        </div>
        <div className="mt-2 flex gap-1.5">
          <input
            type="text"
            value={customTrigger}
            maxLength={40}
            onChange={(e) => setCustomTrigger(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addCustomTrigger();
              }
            }}
            placeholder="Something else…"
            aria-label="Add another trigger"
            className="min-w-0 flex-1 rounded-md border border-hud-borderLight px-3 py-1.5 text-sm focus:border-hud-cyan focus:outline-none"
          />
          <button type="button" onClick={addCustomTrigger} className="rounded-md border border-hud-borderLight px-3 text-xs font-medium hover:bg-hud-panel2">
            Add
          </button>
        </div>
      </Field>

      <Field label="Does it spread anywhere?" hint="Optional — for example “down my left arm”.">
        <input
          type="text"
          value={radiatesTo}
          maxLength={120}
          onChange={(e) => setRadiatesTo(e.target.value)}
          className="w-full rounded-md border border-hud-borderLight bg-hud-panel px-3 py-2 text-sm text-hud-text focus:border-hud-cyan focus:outline-none"
        />
      </Field>

      <Field label="Anything else?" hint="In your own words. Optional.">
        <textarea
          value={notes}
          maxLength={2000}
          rows={4}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="What you were doing, other symptoms, what you've tried…"
          className="w-full resize-y rounded-md border border-hud-borderLight px-3 py-2 text-sm focus:border-hud-cyan focus:outline-none"
        />
      </Field>

      <div className="rounded-lg border border-hud-border bg-hud-panel2 p-3">
        <label className="flex cursor-pointer items-start gap-2.5">
          <input
            type="checkbox"
            checked={visibility === 'community'}
            onChange={(e) => setVisibility(e.target.checked ? 'community' : 'private')}
            className="mt-0.5 h-4 w-4 accent-hud-cyan"
          />
          <span>
            <span className="block text-sm font-semibold text-hud-text">Share anonymously to find people like me</span>
            <span className="mt-0.5 block text-xs leading-relaxed text-hud-muted">
              {visibility === 'community'
                ? 'Other members with similar pain will be able to find you by your username. They see the area, type of pain, severity, pattern and roughly how long — never your notes, exact dates, name or email. You can stop sharing any time.'
                : 'Off by default. This entry stays completely private to you.'}
            </span>
          </span>
        </label>
      </div>

      {notesForUser.length > 0 && (
        <div role="alert" className="rounded-lg border border-hud-red/40 bg-hud-red/5 p-3 text-xs leading-relaxed text-hud-text">
          <p className="mb-1 font-semibold text-hud-red">When to get help now</p>
          <ul className="flex list-disc flex-col gap-1 pl-4">
            {notesForUser.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </div>
      )}

      {error && (
        <p role="alert" className="rounded-md bg-hud-red/10 px-3 py-2 text-sm text-hud-red">
          {error}
        </p>
      )}

      {/* -bottom-4/-mb-4 cancel the scroll container's p-4 so no content shows beneath the bar. */}
      <div className="sticky -bottom-4 -mx-4 -mb-4 flex gap-2 border-t border-hud-border bg-hud-panel px-4 py-3">
        <button
          type="submit"
          disabled={saving}
          className="flex-1 rounded-md bg-[#007bff] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0056b3] disabled:opacity-60"
        >
          {saving ? 'Saving…' : initial ? 'Save changes' : 'Save to my pain log'}
        </button>
        <button type="button" onClick={onCancel} disabled={saving} className="rounded-md border border-hud-borderLight px-4 py-2 text-sm font-medium text-hud-text hover:bg-hud-panel2">
          Cancel
        </button>
      </div>
    </form>
  );
}
