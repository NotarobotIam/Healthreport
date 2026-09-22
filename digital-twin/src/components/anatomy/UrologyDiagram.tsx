import type { KeyboardEvent } from 'react';
import { UROLOGY_BY_SEX, type UrologySex } from '../../data/anatomy/urologyInfo';

interface Props {
  sex: UrologySex;
  selected: string | null;
  onSelect: (id: string) => void;
}

const ORGAN_FILL = '#c96a5e'; // urinary-tract organs (kidneys, ureters, bladder, urethra) — matches the app's muscular/urinary tone
const REPRO_FILL = '#b98fc9'; // reproductive-only organs (prostate; uterus, tubes, ovaries) — a second, distinguishable tone
const URINARY_IDS = new Set(['kidneys', 'ureters', 'bladder', 'urethra']);

/**
 * A simplified, labelled schematic of the urinary tract (both diagrams) plus the prostate (male) or
 * uterus/tubes/ovaries (female) — not a scan or a photorealistic illustration, just enough to show where
 * each structure named in an ultrasound report actually is. Click a label, or a shape, to select it; the
 * caller shows the matching plain-language description alongside.
 */
export function UrologyDiagram({ sex, selected, onSelect }: Props) {
  const parts = UROLOGY_BY_SEX[sex];
  const fillFor = (id: string) => (URINARY_IDS.has(id) ? ORGAN_FILL : REPRO_FILL);

  /** Interaction + accessibility props shared by every clickable shape, filled or line. */
  const interactive = (id: string) => ({
    className: 'cursor-pointer transition-opacity',
    onClick: () => onSelect(id),
    role: 'button' as const,
    tabIndex: 0,
    'aria-pressed': id === selected,
    'aria-label': parts.find((p) => p.id === id)?.name,
    onKeyDown: (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onSelect(id);
      }
    },
  });
  /** A filled organ (kidney, bladder, prostate, uterus, ovary). */
  const filled = (id: string) => ({
    ...interactive(id),
    fill: fillFor(id),
    fillOpacity: id === selected ? 1 : 0.55,
    stroke: id === selected ? '#1d4ed8' : 'none',
    strokeWidth: id === selected ? 2.5 : 0,
  });
  /** A tube drawn as a stroked line (ureter, urethra, fallopian tube) — wider + highlighted when selected. */
  const tube = (id: string) => ({
    ...interactive(id),
    fill: 'none' as const,
    stroke: fillFor(id),
    strokeOpacity: id === selected ? 1 : 0.55,
    strokeWidth: id === selected ? 9 : 6,
    strokeLinecap: 'round' as const,
  });

  return (
    <svg viewBox="0 0 400 400" role="img" aria-label={`Simplified diagram of the ${sex} urinary tract${sex === 'female' ? ' and reproductive organs' : ' and prostate'}`} className="h-full w-full">
      {/* Body outline, purely for context — not a labelled/selectable structure. */}
      <path d="M 200 20 C 120 20 70 70 70 150 L 70 320 C 70 360 130 380 200 380 C 270 380 330 360 330 320 L 330 150 C 330 70 280 20 200 20 Z" fill="none" stroke="currentColor" strokeOpacity="0.15" strokeWidth="2" className="text-hud-text" />

      {/* Kidneys (both diagrams) */}
      <path d="M 90 55 C 70 55 62 75 66 95 C 68 108 80 110 92 104 C 104 98 104 55 90 55 Z" {...filled('kidneys')} />
      <path d="M 310 55 C 330 55 338 75 334 95 C 332 108 320 110 308 104 C 296 98 296 55 310 55 Z" {...filled('kidneys')} />

      {/* Ureters */}
      <path d="M 82 108 C 100 155 118 195 155 240" {...tube('ureters')} />
      <path d="M 318 108 C 300 155 282 195 245 240" {...tube('ureters')} />

      {/* Bladder — for the female diagram, positioned clearly below the uterus rather than overlapping it. */}
      <path d="M 200 235 C 235 235 258 255 258 282 C 258 309 232 322 200 322 C 168 322 142 309 142 282 C 142 255 165 235 200 235 Z" {...filled('bladder')} />

      {sex === 'male' ? (
        <>
          <circle cx="200" cy="333" r="18" {...filled('prostate')} />
          <path d="M 200 351 L 200 383" {...tube('urethra')} />
        </>
      ) : (
        <>
          <path d="M 200 150 C 185 150 175 160 175 173 L 178 200 C 180 213 220 213 222 200 L 225 173 C 225 160 215 150 200 150 Z" {...filled('uterus')} />
          <path d="M 178 159 C 160 153 148 148 138 145" {...tube('fallopian-tubes')} />
          <path d="M 222 159 C 240 153 252 148 262 145" {...tube('fallopian-tubes')} />
          <ellipse cx="132" cy="145" rx="12" ry="8" {...filled('ovaries')} />
          <ellipse cx="268" cy="145" rx="12" ry="8" {...filled('ovaries')} />
          <path d="M 200 322 L 200 350" {...tube('urethra')} />
        </>
      )}
    </svg>
  );
}
