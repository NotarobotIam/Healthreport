// The catalogue of health communities. It lives in code (not the database) so it is reviewed
// and versioned like everything else; only *membership* is stored per member, and that is private.
//
// `mesh` are official PubMed subject headings and `title` are title phrases; together they
// drive the research feeds (see lib/pubmed.js). Getting them right matters: a loose search for
// "breast cancer" returns lab-chemistry papers that merely mention it.

const CATEGORIES = [
  { slug: 'cancer', name: 'Cancer', blurb: 'For people facing a cancer diagnosis, in treatment, or in recovery — and the people who love them.' },
  { slug: 'digestive', name: 'Digestive health', blurb: 'Gut conditions that are hard to talk about but easier to live with when you are not alone.' },
  { slug: 'pain-joints', name: 'Pain & joints', blurb: 'Long-lasting pain, from backs and joints to migraines.' },
  { slug: 'heart-metabolic', name: 'Heart & metabolic', blurb: 'Heart health, blood pressure, diabetes and thyroid.' },
  { slug: 'autoimmune-neuro', name: 'Autoimmune & neurological', blurb: 'Conditions of the immune system and the nervous system.' },
  { slug: 'lungs', name: 'Lungs & breathing', blurb: 'Living and breathing well with a lung condition.' },
  { slug: 'womens-health', name: "Women's health", blurb: 'Conditions that affect the reproductive system and hormones.' },
  { slug: 'urology', name: 'Urology', blurb: 'Kidney, bladder, prostate and fertility conditions, for anyone affected.' },
  { slug: 'mind', name: 'Mind & wellbeing', blurb: 'The emotional side of living with your health.' },
];

// `exact` searches the subject heading itself, not the specific diseases beneath it (PubMed "explodes" headings by default).
const g = (slug, name, category, blurb, mesh, title, { exact = false } = {}) => ({ slug, name, category, blurb, mesh, title, exact });

const GROUPS = [
  // --- Cancer
  g('breast-cancer', 'Breast Cancer', 'cancer', 'Patients, survivors and loved ones sharing experiences of breast cancer.', ['Breast Neoplasms'], ['breast cancer']),
  g('colorectal-cancer', 'Colon & Rectal Cancer', 'cancer', 'Colon and rectal cancer: diagnosis, treatment, and life afterwards.', ['Colorectal Neoplasms'], ['colorectal cancer', 'colon cancer', 'rectal cancer']),
  g('lung-cancer', 'Lung Cancer', 'cancer', 'Support and shared experience for people affected by lung cancer.', ['Lung Neoplasms'], ['lung cancer']),
  g('prostate-cancer', 'Prostate Cancer', 'cancer', 'Prostate cancer: screening, treatment decisions, and recovery.', ['Prostatic Neoplasms'], ['prostate cancer']),
  g('skin-cancer', 'Skin Cancer & Melanoma', 'cancer', 'Melanoma and other skin cancers.', ['Skin Neoplasms', 'Melanoma'], ['melanoma', 'skin cancer']),
  g('blood-cancers', 'Blood Cancers', 'cancer', 'Leukemia, lymphoma and myeloma.', ['Hematologic Neoplasms'], ['leukemia', 'lymphoma', 'myeloma']),
  g('gynecologic-cancers', 'Ovarian & Cervical Cancer', 'cancer', 'Gynecologic cancers, including ovarian and cervical.', ['Ovarian Neoplasms', 'Uterine Cervical Neoplasms'], ['ovarian cancer', 'cervical cancer']),
  g('bladder-cancer', 'Bladder Cancer', 'cancer', 'Bladder cancer: diagnosis, treatment and life afterwards.', ['Urinary Bladder Neoplasms'], ['bladder cancer']),
  // --- Digestive
  g('ibs', 'IBS', 'digestive', 'Irritable bowel syndrome: symptoms, triggers, diets and what actually helps.', ['Irritable Bowel Syndrome'], ['irritable bowel']),
  g('ibd', "Crohn's & Ulcerative Colitis", 'digestive', 'Inflammatory bowel disease, flares and remission.', ['Inflammatory Bowel Diseases'], ['crohn', 'ulcerative colitis', 'inflammatory bowel']),
  g('gerd', 'Acid Reflux & GERD', 'digestive', 'Heartburn and reflux that will not go away.', ['Gastroesophageal Reflux'], ['reflux', 'GERD']),
  g('gut-microbiome', 'Gut Microbiome', 'digestive', 'Gut bacteria, stool and breath tests, diet and digestion: what the tests can and cannot tell you.', ['Gastrointestinal Microbiome'], ['gut microbiome', 'gut microbiota', 'intestinal microbiome']),
  g('celiac', 'Celiac Disease', 'digestive', 'Living gluten-free and everything that comes with it.', ['Celiac Disease'], ['celiac', 'coeliac']),
  // --- Pain & joints
  g('chronic-pain', 'Chronic Pain', 'pain-joints', 'Pain that lasts for months or years, wherever it is.', ['Chronic Pain'], ['chronic pain']),
  g('back-neck-pain', 'Back & Neck Pain', 'pain-joints', 'Spine, back and neck problems.', ['Back Pain', 'Neck Pain'], ['back pain', 'neck pain', 'sciatica']),
  g('fibromyalgia', 'Fibromyalgia', 'pain-joints', 'Widespread pain and fatigue, and being believed.', ['Fibromyalgia'], ['fibromyalgia']),
  g('osteoarthritis', 'Osteoarthritis', 'pain-joints', 'Worn joints, stiffness and staying active.', ['Osteoarthritis'], ['osteoarthritis']),
  g('migraine', 'Migraine & Headaches', 'pain-joints', 'Migraine, cluster and other headache disorders.', ['Migraine Disorders', 'Headache Disorders'], ['migraine', 'headache']),
  // --- Heart & metabolic
  g('heart-disease', 'Heart Disease', 'heart-metabolic', 'Heart conditions, recovery and staying well.', ['Heart Diseases'], ['heart disease', 'heart failure', 'coronary']),
  g('high-blood-pressure', 'High Blood Pressure', 'heart-metabolic', 'Hypertension: monitoring, lifestyle and medication experiences.', ['Hypertension'], ['hypertension', 'high blood pressure']),
  g('type-2-diabetes', 'Type 2 Diabetes', 'heart-metabolic', 'Type 2 diabetes day to day.', ['Diabetes Mellitus, Type 2'], ['type 2 diabetes']),
  g('type-1-diabetes', 'Type 1 Diabetes', 'heart-metabolic', 'Type 1 diabetes day to day.', ['Diabetes Mellitus, Type 1'], ['type 1 diabetes']),
  g('thyroid', 'Thyroid Conditions', 'heart-metabolic', 'Underactive, overactive and everything in between.', ['Thyroid Diseases'], ['thyroid', 'hypothyroidism', 'hyperthyroidism']),
  // --- Autoimmune & neurological
  g('lupus', 'Lupus', 'autoimmune-neuro', 'Systemic lupus and related conditions.', ['Lupus Erythematosus, Systemic'], ['lupus']),
  g('rheumatoid-arthritis', 'Rheumatoid Arthritis', 'autoimmune-neuro', 'Rheumatoid arthritis and inflammatory joint disease.', ['Arthritis, Rheumatoid'], ['rheumatoid arthritis']),
  g('multiple-sclerosis', 'Multiple Sclerosis', 'autoimmune-neuro', 'Living with MS.', ['Multiple Sclerosis'], ['multiple sclerosis']),
  g('parkinsons', "Parkinson's Disease", 'autoimmune-neuro', "Parkinson's disease, for patients and care partners.", ['Parkinson Disease'], ['parkinson']),
  g('epilepsy', 'Epilepsy', 'autoimmune-neuro', 'Seizures, medication and daily life.', ['Epilepsy'], ['epilepsy', 'seizure']),
  // --- Lungs
  g('asthma', 'Asthma', 'lungs', 'Asthma control, triggers and treatments.', ['Asthma'], ['asthma']),
  g('copd', 'COPD', 'lungs', 'Chronic obstructive pulmonary disease.', ['Pulmonary Disease, Chronic Obstructive'], ['COPD', 'chronic obstructive pulmonary']),
  // --- Women's health
  g('endometriosis', 'Endometriosis', 'womens-health', 'Endometriosis: getting diagnosed and finding relief.', ['Endometriosis'], ['endometriosis']),
  g('pcos', 'PCOS', 'womens-health', 'Polycystic ovary syndrome.', ['Polycystic Ovary Syndrome'], ['polycystic ovary', 'PCOS']),
  // --- Urology
  g('fertility', 'Fertility Issues', 'urology', 'Trying to conceive, fertility testing and treatment — for either partner.', ['Infertility'], ['infertility', 'fertility']),
  g('kidney-stones', 'Kidney Stones', 'urology', 'Passing and preventing kidney stones.', ['Kidney Calculi'], ['kidney stone', 'renal calculi']),
  g('overactive-bladder', 'Overactive Bladder & Incontinence', 'urology', 'Urinary urgency, frequency and leakage.', ['Urinary Incontinence', 'Urinary Bladder, Overactive'], ['overactive bladder', 'urinary incontinence']),
  // --- Mind
  g('chronic-illness-life', 'Living with Chronic Illness', 'mind', 'The everyday reality of long-term illness: energy, work, relationships and coping.', ['Chronic Disease'], ['chronic illness', 'chronic disease', 'long-term condition'], { exact: true }),
  g('anxiety-depression', 'Anxiety & Depression', 'mind', 'Support for anxiety and low mood, including alongside physical illness. If you are in crisis, please see the help links on this site.', ['Anxiety Disorders', 'Depressive Disorder'], ['anxiety', 'depression']),
];

const BY_SLUG = new Map(GROUPS.map((x) => [x.slug, x]));

/** The community for a slug, or undefined. Always check user-supplied slugs through this. */
const getGroup = (slug) => (typeof slug === 'string' ? BY_SLUG.get(slug) : undefined);

/** Members may belong to a limited number of communities, to blunt bulk-joining. */
const MAX_MEMBERSHIPS = 20;

module.exports = { CATEGORIES, GROUPS, getGroup, MAX_MEMBERSHIPS };
