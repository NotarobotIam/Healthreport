import type { PainLocation, PainSide } from '../../types';

export interface SeverityBand {
  label: string;
  color: string;
}

/** Same colour bands the 3D markers use (see severityColor in AnatomyScene). */
export function severityBand(severity: number, resolved = false): SeverityBand {
  if (resolved) return { label: 'Resolved', color: '#8a94a0' };
  if (severity >= 7) return { label: 'Severe', color: '#d92d20' };
  if (severity >= 4) return { label: 'Moderate', color: '#f07d1a' };
  if (severity >= 1) return { label: 'Mild', color: '#e8b923' };
  return { label: 'No pain', color: '#8a94a0' };
}

const SIDE_LABELS: Record<PainSide, string> = {
  left: 'Left side',
  right: 'Right side',
  midline: 'Midline',
  unknown: '',
};

export function formatSide(side: PainSide): string {
  return SIDE_LABELS[side];
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function formatTypes(types: string[]): string {
  return capitalize(types.join(', '));
}

export function formatOnset(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/** "3 hours", "2 days" … — how long ago the pain started. */
export function formatSince(iso: string, now = Date.now()): string {
  const minutes = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60000));
  if (minutes < 60) return 'Just now';
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.round(hours / 24);
  if (days < 14) return `${days} day${days === 1 ? '' : 's'} ago`;
  const weeks = Math.round(days / 7);
  if (days < 60) return `${weeks} weeks ago`;
  const months = Math.round(days / 30);
  return `${months} months ago`;
}

/** Value for <input type="datetime-local">, which wants local time without a zone. */
export function toLocalInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

const CHEST = /heart|sternum|rib\b|ribs|thora|lung|pector|bronch|pleura|esophag|aort|cardiac|ventric|atri/i;
const HEAD = /brain|cerebr|cranium|skull|meninge|cerebell|head\b/i;

/**
 * Generic "when to get urgent care" notes shown while writing a report. They
 * are deliberately broad, standard red flags — not a triage of the user's
 * actual condition.
 */
export function safetyNotes(location: PainLocation, severity: number): string[] {
  const notes: string[] = [];
  const where = `${location.partName} ${location.system}`;
  if (CHEST.test(where) || location.system === 'cardiac' || location.system === 'respiratory') {
    notes.push(
      'Chest pain, especially with shortness of breath, sweating, nausea, or pain spreading to the arm or jaw, can be a medical emergency. Call your local emergency number.',
    );
  }
  if (HEAD.test(where)) {
    notes.push(
      'A sudden, severe headache, or head pain with confusion, weakness, trouble speaking, or vision changes needs emergency care.',
    );
  }
  if (severity >= 8) {
    notes.push(
      'Severe pain, or pain that came on suddenly and is getting worse, should be checked promptly. If you feel very unwell, seek emergency care.',
    );
  }
  return notes;
}
