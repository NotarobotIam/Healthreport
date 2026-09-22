// Gut and microbiome tests a member might have, as forms they can fill in from their own results. Each is
// saved as an ordinary test report (type "Microbiome") whose results carry an `examKind`, so it also shows
// on the Reports tab and the Data page.
//
// HONESTY RULE: only a few gut markers have widely used reference ranges (fecal calprotectin, pancreatic
// elastase, breath-test gas rises, blood in stool). Those are flagged below, and labs differ, so the
// member's own lab range always wins. Microbiome *sequencing* results (diversity, bacterial groups) have NO
// agreed healthy range and are not a diagnostic test, so they are shown and trended but never judged.
export type GutKind = 'sequencing' | 'calprotectin' | 'stoolAnalysis' | 'breathTest';

export interface GutField {
  key: string;
  label: string;
  unit?: string;
  kind: 'number' | 'text' | 'choice';
  placeholder?: string;
  options?: string[];
  /** Largest sensible value (100 for percentages). Smallest is always 0. */
  max?: number;
}

export interface GutTemplate {
  id: GutKind;
  title: string;
  blurb: string;
  fields: GutField[];
}

const num = (key: string, label: string, unit?: string, max?: number, placeholder?: string): GutField => ({ key, label, unit, kind: 'number', max, placeholder });
const pct = (key: string, label: string): GutField => num(key, label, '%', 100);
const txt = (key: string, label: string, placeholder?: string): GutField => ({ key, label, kind: 'text', placeholder });
const choice = (key: string, label: string, options: string[]): GutField => ({ key, label, kind: 'choice', options });

export const GUT_TEMPLATES: GutTemplate[] = [
  {
    id: 'sequencing', title: 'Gut microbiome sequencing (stool)',
    blurb: 'A stool test that reads the DNA of the bacteria in your gut. Reports usually show a diversity score and the share of each bacterial group.',
    fields: [
      choice('method', 'Method', ['16S rRNA', 'Shotgun metagenomic', 'Not sure']),
      txt('provider', 'Lab or company'),
      num('shannonDiversity', 'Diversity (Shannon index)', undefined, 10, 'e.g. 3.1'),
      num('observedSpecies', 'Species detected'),
      pct('firmicutesPct', 'Firmicutes'), pct('bacteroidetesPct', 'Bacteroidetes'), pct('actinobacteriaPct', 'Actinobacteria'), pct('proteobacteriaPct', 'Proteobacteria'),
      pct('bifidobacteriumPct', 'Bifidobacterium'), pct('lactobacillusPct', 'Lactobacillus'), pct('akkermansiaPct', 'Akkermansia'), pct('faecalibacteriumPct', 'Faecalibacterium'),
      txt('interpretation', 'What the report said'),
    ],
  },
  {
    id: 'calprotectin', title: 'Fecal calprotectin',
    blurb: 'A stool test for inflammation in the bowel. Doctors use it, for example, to help tell inflammatory bowel disease from irritable bowel syndrome.',
    fields: [num('calprotectin', 'Calprotectin', 'µg/g'), txt('interpretation', 'What the report said')],
  },
  {
    id: 'stoolAnalysis', title: 'Stool analysis (blood, digestion, infections)',
    blurb: 'Tests on a stool sample for hidden blood, digestive enzymes, bacteria, toxins or parasites.',
    fields: [
      choice('occultBlood', 'Blood in stool test', ['Negative', 'Positive']),
      num('elastase', 'Pancreatic elastase', 'µg/g'),
      txt('pathogens', 'Bacteria or toxins found', 'e.g. None found'),
      txt('parasites', 'Parasites found', 'e.g. None found'),
      txt('interpretation', 'What the report said'),
    ],
  },
  {
    id: 'breathTest', title: 'Breath test (SIBO, lactose, fructose)',
    blurb: 'You drink a sugar solution and breathe into a bag over a few hours. Gas from gut bacteria shows up in your breath.',
    fields: [
      choice('substrate', 'Sugar used', ['Lactulose', 'Glucose', 'Lactose', 'Fructose', 'Other']),
      num('baselineHydrogen', 'Hydrogen before drinking', 'ppm'),
      num('hydrogenRise', 'Highest hydrogen rise above that', 'ppm'),
      num('peakMethane', 'Highest methane', 'ppm'),
      num('minutesToRise', 'Minutes until the rise', 'min'),
      txt('interpretation', 'What the report said'),
    ],
  },
];

export const GUT_BY_ID = new Map<string, GutTemplate>(GUT_TEMPLATES.map((t) => [t.id, t]));

export interface GutFlag {
  level: 'watch' | 'high';
  field: string;
  text: string;
}

const num1 = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v)) ? Number(v) : null);
const LAB = ' Labs use different ranges: check the one printed on your report.';

/** Markers with a widely used reference range. Everything else (notably sequencing) is never judged. */
export function gutFlags(kind: string | undefined, results: Record<string, unknown>): GutFlag[] {
  const flags: GutFlag[] = [];
  if (kind === 'calprotectin') {
    const v = num1(results.calprotectin);
    if (v !== null && v > 200) flags.push({ level: 'high', field: 'calprotectin', text: `Calprotectin is high (over 200 µg/g), which can mean inflammation in the bowel. Please discuss it with your doctor.${LAB}` });
    else if (v !== null && v >= 50) flags.push({ level: 'watch', field: 'calprotectin', text: `Calprotectin is in a borderline range (50 to 200 µg/g). Worth mentioning to your doctor, who may repeat it.${LAB}` });
  }
  if (kind === 'stoolAnalysis') {
    if (results.occultBlood === 'Positive') flags.push({ level: 'high', field: 'occultBlood', text: 'Blood was found in the stool. Please tell your doctor soon; there are several possible causes and it needs checking.' });
    const e = num1(results.elastase);
    if (e !== null && e < 100) flags.push({ level: 'high', field: 'elastase', text: `Pancreatic elastase is low (under 100 µg/g), which can mean the pancreas is not releasing enough digestive enzymes. Please discuss it with your doctor.${LAB}` });
    else if (e !== null && e < 200) flags.push({ level: 'watch', field: 'elastase', text: `Pancreatic elastase is a little low (100 to 200 µg/g). Worth mentioning to your doctor.${LAB}` });
  }
  if (kind === 'breathTest') {
    const h = num1(results.hydrogenRise);
    const m = num1(results.peakMethane);
    if (h !== null && h >= 20) flags.push({ level: 'watch', field: 'hydrogenRise', text: `A hydrogen rise of 20 ppm or more is commonly read as a positive breath test.${LAB}` });
    if (m !== null && m >= 10) flags.push({ level: 'watch', field: 'peakMethane', text: `Methane of 10 ppm or more is commonly read as positive.${LAB}` });
  }
  return flags;
}

/** Numeric markers that can be trended, with a friendly name. Built from the templates so it never drifts. */
export const GUT_MARKERS: { key: string; label: string; unit?: string; kind: GutKind }[] = GUT_TEMPLATES.flatMap((t) =>
  t.fields.filter((f) => f.kind === 'number').map((f) => ({ key: f.key, label: f.label, unit: f.unit, kind: t.id })),
);

export const gutFieldLabel = (kind: string | undefined, key: string): { label: string; unit?: string } => {
  const f = GUT_BY_ID.get(kind ?? '')?.fields.find((x) => x.key === key);
  return f ? { label: f.label, unit: f.unit } : { label: key.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase()) };
};

/**
 * What each bacterial group (and the two summary measures) on a sequencing report actually is, in plain
 * language. General microbiology background, not an interpretation of the member's own numbers — the
 * catalogue above is deliberately silent on what a "good" share looks like, since there is no agreed
 * healthy range (see the HONESTY RULE at the top of this file).
 */
export const GUT_BACTERIA_INFO: Record<string, string> = {
  shannonDiversity: 'A single number combining how many different kinds of bacteria were found and how evenly balanced they are. Higher usually means a more varied mix, but there is no agreed "healthy" target.',
  observedSpecies: 'How many distinct kinds of bacteria (or similar groups) the test detected in the sample.',
  firmicutesPct: 'Firmicutes is one of the two largest groups of bacteria in most adult guts (alongside Bacteroidetes). It includes many species that ferment fibre and produce short-chain fatty acids.',
  bacteroidetesPct: 'Bacteroidetes is the other of the two largest groups in most adult guts. It includes many species that break down complex plant fibres.',
  actinobacteriaPct: 'Actinobacteria is a smaller group that includes Bifidobacterium (below), among others.',
  proteobacteriaPct: 'Proteobacteria includes many familiar bacteria, including some strains of E. coli. It is usually a small share of a typical gut; some research links a larger share to gut inflammation, though this test alone cannot say why yours is what it is.',
  bifidobacteriumPct: 'Bifidobacterium is common in the infant gut and is often included in probiotic supplements and fermented foods.',
  lactobacillusPct: 'Lactobacillus is well known from fermented foods (yoghurt, kefir) and is a common ingredient in probiotic supplements.',
  akkermansiaPct: 'Akkermansia (notably the species Akkermansia muciniphila) lives in the mucus lining of the gut. It is an active area of research, but not yet part of routine clinical care.',
  faecalibacteriumPct: 'Faecalibacterium (notably the species Faecalibacterium prausnitzii) is known for producing butyrate, a short-chain fatty acid that feeds the cells lining the colon.',
};

/** When to see a doctor rather than read a website. */
export const GUT_RED_FLAGS = [
  'Blood in your stool, or black, tarry stool',
  'Losing weight without trying',
  'Stomach pain that is severe, or that wakes you at night',
  'Vomiting that will not stop, or trouble swallowing',
  'Diarrhoea that lasts more than a few weeks, or comes with a fever',
  'A change in bowel habits that is new and lasts, especially over age 45',
  'A close relative who had bowel cancer or inflammatory bowel disease',
];
