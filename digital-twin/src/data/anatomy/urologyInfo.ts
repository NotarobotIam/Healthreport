// Plain-language notes for the labelled urology/reproductive diagrams (see UrologyDiagram). General
// textbook anatomy, matching the structures named in the demo ultrasound reports (Reports → Imaging).
export type UrologySex = 'male' | 'female';

export interface UrologyPart {
  id: string;
  name: string;
  /** SVG-space centre of the label's leader line, [x, y] in the 400x400 viewBox. */
  at: [number, number];
  what: string;
}

const SHARED: UrologyPart[] = [
  { id: 'kidneys', name: 'Kidneys', at: [104, 78], what: 'A pair of organs that filter waste and extra fluid out of the blood to make urine, and help control blood pressure.' },
  { id: 'ureters', name: 'Ureters', at: [150, 165], what: 'Thin tubes — one from each kidney — that carry urine down to the bladder.' },
  { id: 'bladder', name: 'Bladder', at: [200, 250], what: 'A muscular, stretchy pouch that stores urine until you are ready to urinate.' },
];

export const MALE_UROLOGY: UrologyPart[] = [
  ...SHARED,
  { id: 'prostate', name: 'Prostate', at: [200, 296], what: 'A gland below the bladder, about the size of a walnut in a younger adult, that adds fluid to semen. It tends to enlarge with age, which can press on the urethra.' },
  { id: 'urethra', name: 'Urethra', at: [200, 336], what: 'The tube that carries urine (and, in men, semen) out of the body.' },
];

export const FEMALE_UROLOGY: UrologyPart[] = [
  ...SHARED,
  { id: 'uterus', name: 'Uterus', at: [200, 222], what: 'A muscular, pear-shaped organ where a pregnancy develops. Its lining is what sheds during a period.' },
  { id: 'fallopian-tubes', name: 'Fallopian tubes', at: [200, 196], what: 'Two tubes that carry an egg from an ovary to the uterus each cycle, and are where fertilisation normally happens.' },
  { id: 'ovaries', name: 'Ovaries', at: [138, 196], what: 'A pair of organs that store and release eggs, and make the hormones oestrogen and progesterone.' },
  { id: 'urethra', name: 'Urethra', at: [200, 300], what: 'The (shorter, in women) tube that carries urine out of the body, separate from the reproductive tract.' },
];

export const UROLOGY_BY_SEX: Record<UrologySex, UrologyPart[]> = { male: MALE_UROLOGY, female: FEMALE_UROLOGY };
