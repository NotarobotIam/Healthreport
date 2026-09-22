// Plain-language notes for each structure in the 3D heart. General textbook anatomy, not advice about the
// member's own heart. `related` lists exam templates (see examCatalog) that look at that structure.
export type HeartLayer = 'muscle' | 'chambers' | 'valves' | 'coronary' | 'veins' | 'vessels';

export const HEART_LAYERS: { id: HeartLayer; label: string }[] = [
  { id: 'muscle', label: 'Heart muscle' },
  { id: 'chambers', label: 'Chambers' },
  { id: 'valves', label: 'Valves' },
  { id: 'coronary', label: 'Coronary arteries' },
  { id: 'veins', label: 'Cardiac veins' },
  { id: 'vessels', label: 'Blood vessels' },
];

export interface HeartInfo {
  what: string;
  related?: string[];
}

export const HEART_INFO: Record<string, HeartInfo> = {
  ventricles: { what: 'The thick muscular walls of the two lower chambers. The left side is the strongest part of the heart because it pushes blood all the way around the body.', related: ['echo', 'cardiacImaging'] },
  'left-atrium-wall': { what: 'The thin muscular wall of the upper left chamber.', related: ['echo'] },
  'right-atrium-wall': { what: 'The thin muscular wall of the upper right chamber. The heart’s natural pacemaker, which sets your heart rate, sits in this wall.', related: ['ecg', 'holter'] },
  'left-ventricle': { what: 'Pumps oxygen-rich blood out through the aortic valve to the whole body. The “ejection fraction” on an echocardiogram is the share of the blood in this chamber that is pumped out with each beat.', related: ['echo', 'cardiacImaging'] },
  'right-ventricle': { what: 'Pumps oxygen-poor blood through the pulmonary valve to the lungs to pick up oxygen.', related: ['echo'] },
  'left-atrium': { what: 'Receives oxygen-rich blood from the lungs through the pulmonary veins, then passes it down through the mitral valve.', related: ['echo'] },
  'right-atrium': { what: 'Receives oxygen-poor blood returning from the body through the two large veins (vena cavae), then passes it down through the tricuspid valve.', related: ['echo', 'ecg'] },
  'aortic-valve': { what: 'Three flaps between the left ventricle and the aorta. They open to let blood out to the body and close to stop it flowing back. Your doctor listens for this valve with a stethoscope.', related: ['auscultation', 'echo'] },
  'pulmonary-valve': { what: 'Three flaps between the right ventricle and the pulmonary trunk, letting blood flow to the lungs but not back.', related: ['auscultation', 'echo'] },
  'mitral-valve': { what: 'Two flaps between the left atrium and left ventricle. It closes as the ventricle squeezes so blood goes out to the body, not backwards.', related: ['auscultation', 'echo'] },
  'tricuspid-valve': { what: 'Three flaps between the right atrium and right ventricle.', related: ['auscultation', 'echo'] },
  'papillary-muscles': { what: 'Small muscles inside the ventricles that anchor fine cords holding the mitral and tricuspid valve flaps, so they do not flip backwards.', related: ['echo'] },
  'left-coronary': { what: 'Feeds the front and left side of the heart muscle. The heart needs its own blood supply; a narrowing here can cause chest pain on effort (angina) or a heart attack.', related: ['stress', 'cardiacImaging'] },
  'right-coronary': { what: 'Feeds the right side and the back of the heart muscle, including parts of the electrical system.', related: ['stress', 'cardiacImaging'] },
  'cardiac-veins': { what: 'Carry used blood from the heart muscle back to the right atrium.' },
  'ascending-aorta': { what: 'The start of the body’s largest artery, rising straight from the left ventricle.', related: ['echo', 'cardiacImaging'] },
  'aortic-arch': { what: 'The curve of the aorta over the top of the heart. Branches from it carry blood to the head and arms.' },
  brachiocephalic: { what: 'The first branch off the aortic arch. It supplies the right arm and the right side of the head and neck.' },
  'pulmonary-trunk': { what: 'The vessel that carries oxygen-poor blood from the right ventricle towards the lungs. It splits into the left and right pulmonary arteries.', related: ['echo'] },
  'left-pulmonary-artery': { what: 'Carries oxygen-poor blood to the left lung.' },
  'right-pulmonary-artery': { what: 'Carries oxygen-poor blood to the right lung.' },
  'pulmonary-veins': { what: 'Bring freshly oxygenated blood from the lungs back to the left atrium. (Unusually, these veins carry oxygen-rich blood.)' },
  'superior-vena-cava': { what: 'Brings used blood from the head, neck and arms down to the right atrium.' },
  'inferior-vena-cava': { what: 'Brings used blood from the legs and belly up to the right atrium.' },
};

/** The teaching colour code: red = carrying oxygen-rich blood, blue = oxygen-poor. Tissue and valves have their own colours. */
export const HEART_COLOR = {
  red: '#cf3f37',
  blue: '#3f6fb5',
  muscle: '#b96760',
  valve: '#eadfbc',
  papillary: '#a05a55',
} as const;
