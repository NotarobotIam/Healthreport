// Adapted from ashemag/human-atlas (MIT, see LICENSE-human-atlas). The anatomy
// data itself is BodyParts3D 4.0, CC BY 4.0 — see /ATTRIBUTION.md.

export type SystemId =
  | 'skeletal'
  | 'muscular'
  | 'arterial'
  | 'venous'
  | 'nervous'
  | 'digestive'
  | 'respiratory'
  | 'urinary'
  | 'reproductive'
  | 'lymphatic'
  | 'endocrine'
  | 'integumentary'
  | 'connective'
  | 'sensory'
  | 'cardiac';

export interface SystemInfo {
  id: SystemId;
  name: string;
  color: string;
  description: string;
}

export const SYSTEMS: SystemInfo[] = [
  { id: 'skeletal', name: 'Skeleton', color: '#e2d9ba', description: 'Bones form the supporting framework of the body, protect organs, and provide attachment points for muscles. Their internal tissue also stores minerals and produces blood cells.' },
  { id: 'muscular', name: 'Muscles', color: '#a85b50', description: 'Skeletal muscles generate movement by pulling on their attachments. Together with tendons, they move joints, stabilize posture, and produce heat.' },
  { id: 'cardiac', name: 'Heart', color: '#b96760', description: 'The heart is a muscular pump with four chambers. Its valves direct blood forward through the pulmonary and systemic circuits.' },
  { id: 'sensory', name: 'Sensory organs', color: '#b0c8ce', description: 'These structures contribute to special senses, including sight, hearing, and balance. Their specialized tissues detect stimuli and work with the nervous system to convey information.' },
  { id: 'arterial', name: 'Arteries', color: '#c05245', description: 'The heart drives blood through the circulation. Arteries carry blood away from the heart to supply tissues or, in the pulmonary circuit, to the lungs.' },
  { id: 'venous', name: 'Veins', color: '#527c9f', description: 'Veins return blood toward the heart. Superficial and deep networks collect blood from the tissues; the pulmonary veins bring oxygenated blood back from the lungs.' },
  { id: 'nervous', name: 'Nervous system', color: '#d8b565', description: 'The brain, spinal cord, and peripheral nerves carry and process signals. They support sensation, movement, coordination, and automatic regulation of body functions.' },
  { id: 'respiratory', name: 'Respiratory', color: '#b98991', description: 'The airways conduct air to the lungs, where oxygen and carbon dioxide move between air and blood. Breathing depends on pressure changes produced by respiratory muscles.' },
  { id: 'digestive', name: 'Digestive', color: '#b8916b', description: 'The digestive tract breaks down food, absorbs nutrients and water, and moves waste onward. Accessory organs contribute bile and digestive enzymes.' },
  { id: 'urinary', name: 'Urinary', color: '#b47961', description: 'The kidneys filter blood and regulate fluid, electrolyte, and acid–base balance. Urine travels through the ureters to the bladder and exits through the urethra.' },
  { id: 'lymphatic', name: 'Lymphatic', color: '#879f7c', description: 'Lymphatic vessels return excess tissue fluid to the circulation. Lymph nodes and other lymphoid organs support immune surveillance and responses.' },
  { id: 'endocrine', name: 'Endocrine', color: '#c5a09a', description: 'Endocrine organs release hormones into the blood to coordinate processes such as metabolism, growth, stress responses, and reproduction.' },
  { id: 'reproductive', name: 'Reproductive', color: '#bda098', description: 'The male reproductive structures represented here contribute to sperm production, maturation, transport, and the production of sex hormones.' },
  { id: 'integumentary', name: 'Body surface', color: '#ba9b7d', description: 'The body surface provides an outer anatomical reference. The integumentary system forms a protective barrier and contributes to sensation and temperature regulation.' },
  { id: 'connective', name: 'Connective tissue', color: '#aec3bb', description: 'Cartilage, ligaments, and other connective tissues support, connect, and separate structures. Their roles include stabilizing joints and distributing mechanical loads.' },
];

export const SYSTEM_BY_ID = new Map(SYSTEMS.map((s) => [s.id, s]));

export interface Part {
  id: string;
  name: string;
  conceptId: string;
  system: SystemId;
  chunk: number;
  positions: number;
  normals: number;
  indices: number;
  vertexCount: number;
  indexCount: number;
  bounds: [number[], number[]];
}

export interface Concept {
  id: string;
  name: string;
  elements: string[];
}

export interface AtlasChunk {
  url: string;
  bytes: number;
  gzip?: string;
  gzipBytes?: number;
}

export interface Atlas {
  version: string;
  sex?: 'male';
  source?: string;
  scope?: string;
  parts: Part[];
  concepts: Concept[];
  chunks: AtlasChunk[];
  triangles: number;
}

export type View = 'three-quarter' | 'front' | 'back' | 'side';

export const DEFAULT_VISIBLE: SystemId[] = [
  'cardiac', 'sensory', 'skeletal', 'muscular', 'arterial', 'venous', 'nervous',
  'respiratory', 'digestive', 'urinary', 'lymphatic', 'endocrine', 'reproductive', 'connective',
];

export interface LayerPreset {
  id: string;
  label: string;
  systems: SystemId[];
}

export const LAYER_PRESETS: LayerPreset[] = [
  { id: 'all', label: 'Everything', systems: DEFAULT_VISIBLE },
  { id: 'skin', label: 'Skin', systems: ['integumentary'] },
  { id: 'muscles', label: 'Muscles', systems: ['muscular', 'connective'] },
  { id: 'skeleton', label: 'Skeleton', systems: ['skeletal', 'connective'] },
  { id: 'organs', label: 'Organs', systems: ['cardiac', 'respiratory', 'digestive', 'urinary', 'endocrine', 'lymphatic', 'reproductive'] },
  { id: 'nerves', label: 'Nerves', systems: ['nervous', 'sensory'] },
  { id: 'vessels', label: 'Vessels', systems: ['arterial', 'venous', 'cardiac'] },
];

export const EXPLANATIONS: Record<string, string> = {
  'heart': 'A muscular pump in the chest. Its right side sends blood to the lungs; its left side sends blood through the systemic circulation.',
  'liver': 'A large organ beneath the right side of the diaphragm. It processes absorbed nutrients, produces bile, and synthesizes many proteins carried in the blood.',
  'brain': 'The central organ of the nervous system. Its interconnected regions support perception, movement, memory, language, and the regulation of bodily functions.',
  'stomach': 'A muscular chamber between the esophagus and small intestine. It stores and mixes food with acid and enzymes before releasing it into the duodenum.',
  'spleen': 'A lymphoid organ in the upper left abdomen. It filters blood, removes aging blood cells, and participates in immune responses.',
  'pancreas': 'An abdominal organ with digestive and endocrine roles. It supplies enzymes to the small intestine and releases hormones including insulin and glucagon.',
  'urinary bladder': 'A muscular reservoir in the pelvis that stores urine arriving from the kidneys through the ureters.',
  'trachea': 'The main airway connecting the larynx to the bronchi. Its cartilage supports keep the airway open during breathing.',
  'diaphragm': 'A broad muscle separating the chest and abdomen. When it contracts, it increases chest volume and helps draw air into the lungs.',
};

export function explanation(name: string, system: SystemId): string {
  return EXPLANATIONS[name.toLowerCase()] ?? SYSTEM_BY_ID.get(system)?.description ?? '';
}

export type Side = 'left' | 'right' | 'midline' | 'unknown';

// Model space: metres, +y up, the figure faces +z, and the patient's LEFT is
// +x (verified against the atlas: 845 of 867 "left …" parts sit at +x).
const MIDLINE_HALF_WIDTH = 0.02;

/**
 * Which side of the body a spot is on. The structure's own name wins when it
 * says "left"/"right" — a few paired structures straddle the midline — and
 * the x coordinate of the clicked point is the fallback.
 */
export function sideOf(partName: string, x: number): Side {
  if (/\bleft\b/i.test(partName)) return 'left';
  if (/\bright\b/i.test(partName)) return 'right';
  if (Math.abs(x) <= MIDLINE_HALF_WIDTH) return 'midline';
  return x > 0 ? 'left' : 'right';
}

let atlasPromise: Promise<Atlas> | null = null;

/** Fetches the manifest once; every later caller shares the same request. */
export function loadAtlas(): Promise<Atlas> {
  if (!atlasPromise) {
    atlasPromise = fetch('/models/atlas.json')
      .then((res) => {
        if (!res.ok) throw new Error('The anatomy manifest could not be loaded.');
        return res.json() as Promise<Atlas>;
      })
      .catch((err) => {
        atlasPromise = null; // let a later mount retry
        throw err;
      });
  }
  return atlasPromise;
}
