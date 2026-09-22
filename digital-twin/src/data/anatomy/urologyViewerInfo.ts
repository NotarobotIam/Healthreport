// Plain-language notes for the 3D urology model (see UrologyViewer). Keyed by the base organ name — the
// model has a separate left/right mesh for paired organs (e.g. "left-kidney"/"right-kidney"), but both
// sides get the same description, so the lookup strips that prefix first.
export type UrologyLayer = 'kidneys' | 'ureters' | 'bladder' | 'prostate' | 'testes';

export const UROLOGY_LAYERS: { id: UrologyLayer; label: string }[] = [
  { id: 'kidneys', label: 'Kidneys' },
  { id: 'ureters', label: 'Ureters' },
  { id: 'bladder', label: 'Bladder & urethra' },
  { id: 'prostate', label: 'Prostate & seminal vesicles' },
  { id: 'testes', label: 'Testes & epididymis' },
];

const BASE_INFO: Record<string, string> = {
  kidney: 'One of a pair of organs that filter waste and extra fluid out of the blood to make urine, and help control blood pressure.',
  ureter: 'A thin tube that carries urine from a kidney down to the bladder.',
  bladder: 'A muscular, stretchy pouch that stores urine until you are ready to urinate.',
  urethra: 'The tube that carries urine, and in men also semen, out of the body.',
  prostate: 'A gland below the bladder, about the size of a walnut in a younger adult, that adds fluid to semen. It tends to enlarge with age, which can press on the urethra.',
  'seminal-vesicle': 'One of a pair of small glands that add fluid to semen, contributing much of its volume.',
  testis: 'One of a pair of organs that produce sperm and the hormone testosterone.',
  epididymis: 'A tightly coiled tube behind each testis where sperm mature and are stored before ejaculation.',
};

/** Strips a "left-"/"right-" prefix, e.g. "left-kidney" -> "kidney", so both sides share one description. */
export function urologyPartInfo(id: string): string | undefined {
  const base = id.replace(/^(left|right)-/, '');
  return BASE_INFO[base];
}
