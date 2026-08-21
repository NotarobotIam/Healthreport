export interface ParsedMetricValue {
  numeric: number | null;
  raw: string;
  unit?: string;
}

/**
 * Blood test values arrive as free-text strings like "13.5 g/dL" or
 * "95 mg/dL" (see routes/reports.js's transpose endpoint / the seed data's
 * `results` shape) — mirrors TransposeView.js's number-extraction approach
 * (same proven parsing rule, rebuilt for this app's own components rather
 * than literally reused, since the two apps don't share a component tree).
 * Non-numeric values (e.g. "true" for a `fasting` flag) parse to
 * `numeric: null` and are excluded from charting/stats, not coerced to 0.
 */
export function parseMetricValue(value: string | number | boolean): ParsedMetricValue {
  if (typeof value === 'number') {
    return { numeric: value, raw: String(value) };
  }
  const raw = String(value);
  const match = raw.match(/-?\d+(\.\d+)?/);
  if (!match || match.index === undefined) {
    return { numeric: null, raw };
  }
  const numeric = parseFloat(match[0]);
  const unit = raw.slice(match.index + match[0].length).trim() || undefined;
  return { numeric, raw, unit };
}
