import type { BodyRegionState } from '../../types';

/**
 * Combines mocked and real per-region physiology: real data wins for any
 * key it covers, every mock-only key passes through untouched. Kept as its
 * own tiny module (rather than folded into mockGenerator.ts, which is
 * documented as "the ONLY place fabricated values are produced") so that
 * file's purity claim stays literally true.
 */
export function mergeRealBodyRegions(
  mock: Record<string, BodyRegionState>,
  real: Record<string, BodyRegionState>,
): Record<string, BodyRegionState> {
  return { ...mock, ...real };
}
