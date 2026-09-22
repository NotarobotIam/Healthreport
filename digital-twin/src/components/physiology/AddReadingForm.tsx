import { useState, type FormEvent } from 'react';
import { createVital } from '../../data/remote/vitalsApi';
import { celsiusToF, cmToIn, fToCelsius, inToCm, kgToLb, lbToKg } from '../../data/physiology/vitalRanges';
import { toLocalInputValue } from '../atlas/painFormat';
import type { VitalDTO, VitalInput } from '../../types';

const UNITS_KEY = 'vitalDtUnits';
const inputClass = 'w-full rounded-md border border-hud-borderLight px-3 py-2 text-sm focus:border-hud-cyan focus:outline-none';

function readUnits(): 'metric' | 'imperial' {
  try {
    return localStorage.getItem(UNITS_KEY) === 'imperial' ? 'imperial' : 'metric';
  } catch {
    return 'metric';
  }
}

interface Props {
  onSaved: (v: VitalDTO) => void;
  onCancel: () => void;
}

/** Enter any combination of measurements. Typed in the member's preferred units, stored in metric. */
export function AddReadingForm({ onSaved, onCancel }: Props) {
  const [units, setUnits] = useState<'metric' | 'imperial'>(readUnits);
  const [when, setWhen] = useState(toLocalInputValue(new Date()));
  const [f, setF] = useState<Record<string, string>>({});
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const imp = units === 'imperial';
  const set = (k: string) => (e: { target: { value: string } }) => setF((p) => ({ ...p, [k]: e.target.value }));

  const switchUnits = (u: 'metric' | 'imperial') => {
    setUnits(u);
    setF((p) => ({ ...p, temperature: '', weight: '', height: '', waist: '' })); // typed values would be in the wrong unit
    try {
      localStorage.setItem(UNITS_KEY, u);
    } catch {
      /* preference just isn't remembered */
    }
  };

  const num = (k: string) => (f[k] && f[k].trim() !== '' ? Number(f[k]) : undefined);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const temp = num('temperature');
    const weight = num('weight');
    const height = num('height');
    const waist = num('waist');
    const input: VitalInput = {
      measuredAt: new Date(when).toISOString(),
      systolic: num('systolic'),
      diastolic: num('diastolic'),
      heartRate: num('heartRate'),
      spo2: num('spo2'),
      respiratoryRate: num('respiratoryRate'),
      bodyFatPct: num('bodyFatPct'),
      temperatureC: temp === undefined ? undefined : imp ? fToCelsius(temp) : temp,
      weightKg: weight === undefined ? undefined : imp ? lbToKg(weight) : weight,
      heightCm: height === undefined ? undefined : imp ? inToCm(height) : height,
      waistCm: waist === undefined ? undefined : imp ? inToCm(waist) : waist,
      ...(note.trim() && { note: note.trim() }),
    };
    if ([input.systolic, input.diastolic, input.heartRate, input.spo2, input.respiratoryRate, input.bodyFatPct, input.temperatureC, input.weightKg, input.heightCm, input.waistCm].some((v) => v !== undefined && Number.isNaN(v))) {
      setError('Please enter numbers only.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await createVital(input);
      onSaved(res.vital);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save this reading.');
      setBusy(false);
    }
  };

  const Field = ({ k, label, unit, step = '1' }: { k: string; label: string; unit: string; step?: string }) => (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-hud-text">{label}</span>
      <span className="flex items-center gap-2">
        <input type="number" inputMode="decimal" step={step} value={f[k] ?? ''} onChange={set(k)} className={inputClass} aria-label={label} />
        <span className="w-14 shrink-0 text-xs text-hud-muted">{unit}</span>
      </span>
    </label>
  );

  return (
    <form onSubmit={submit} className="rounded-2xl bg-hud-panel p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-hud-text">Add a reading</h2>
        <div className="flex gap-1 rounded-md border border-hud-border p-0.5 text-xs" role="group" aria-label="Units">
          {(['metric', 'imperial'] as const).map((u) => (
            <button key={u} type="button" aria-pressed={units === u} onClick={() => switchUnits(u)} className={`rounded px-2.5 py-1 ${units === u ? 'bg-hud-cyan/15 text-hud-cyan' : 'text-hud-muted'}`}>
              {u === 'metric' ? 'kg · cm · °C' : 'lb · in · °F'}
            </button>
          ))}
        </div>
      </div>
      <p className="mb-4 text-xs text-hud-muted">Fill in whatever you measured — you don't need every box.</p>
      <label className="mb-4 block">
        <span className="mb-1 block text-xs font-medium text-hud-text">When</span>
        <input type="datetime-local" value={when} max={toLocalInputValue(new Date())} onChange={(e) => setWhen(e.target.value)} className={inputClass} />
      </label>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="grid grid-cols-2 gap-3 sm:col-span-2 lg:col-span-1">
          <Field k="systolic" label="Blood pressure (top)" unit="mmHg" />
          <Field k="diastolic" label="Blood pressure (bottom)" unit="mmHg" />
        </div>
        <Field k="heartRate" label="Heart rate" unit="bpm" />
        <Field k="spo2" label="Oxygen level" unit="%" />
        <Field k="temperature" label="Temperature" unit={imp ? '°F' : '°C'} step="0.1" />
        <Field k="respiratoryRate" label="Breathing rate" unit="per min" />
        <Field k="weight" label="Weight" unit={imp ? 'lb' : 'kg'} step="0.1" />
        <Field k="height" label="Height" unit={imp ? 'in' : 'cm'} step="0.1" />
        <Field k="waist" label="Waist" unit={imp ? 'in' : 'cm'} step="0.1" />
        <Field k="bodyFatPct" label="Body fat" unit="%" step="0.1" />
      </div>
      <label className="mt-4 block">
        <span className="mb-1 block text-xs font-medium text-hud-text">Note <span className="font-normal text-hud-muted">(optional)</span></span>
        <input value={note} maxLength={200} onChange={(e) => setNote(e.target.value)} placeholder="e.g. after a walk, morning, before coffee" className={inputClass} />
      </label>
      {error && <p role="alert" className="mt-3 rounded-md bg-hud-red/10 px-3 py-2 text-sm text-hud-red">{error}</p>}
      <div className="mt-4 flex gap-2">
        <button type="submit" disabled={busy} className="rounded-md bg-[#007bff] px-5 py-2 text-sm font-semibold text-white hover:bg-[#0056b3] disabled:opacity-60">{busy ? 'Saving…' : 'Save reading'}</button>
        <button type="button" onClick={onCancel} className="rounded-md border border-hud-borderLight px-5 py-2 text-sm font-medium hover:bg-hud-panel2">Cancel</button>
      </div>
    </form>
  );
}

// Exposed for the table view, so it can show the member's preferred units.
export const displayTemp = (c: number, u: 'metric' | 'imperial') => (u === 'imperial' ? celsiusToF(c).toFixed(1) : c.toFixed(1));
export const displayWeight = (kg: number, u: 'metric' | 'imperial') => (u === 'imperial' ? kgToLb(kg).toFixed(1) : kg.toFixed(1));
export const displayLength = (cm: number, u: 'metric' | 'imperial') => (u === 'imperial' ? cmToIn(cm).toFixed(1) : cm.toFixed(0));
export const preferredUnits = readUnits;
