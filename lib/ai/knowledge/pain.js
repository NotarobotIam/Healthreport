// A small, deliberately conservative library of "what a pattern could be consistent with", used by the
// free rules-based summary (no AI involved). Every entry says a clinician is needed to know, names the
// warning signs for the area, and never gives a dose or a treatment.
//
// STATUS: DRAFT. This was written from general medical knowledge and has NOT been reviewed by a
// clinician. Before real members use it, have a qualified clinician review every entry and then set
// REVIEWED to true. Until then every summary shows a visible "draft" notice.
const REVIEWED = false;

const CHEST_EMERGENCY = 'Chest pain with shortness of breath, sweating, nausea, or pain spreading to the arm or jaw can be a medical emergency. Call your local emergency number.';
const HEAD_URGENT = 'A sudden, severe headache, or head pain with confusion, weakness, trouble speaking, or changes in vision needs emergency care.';
const BELLY_URGENT = 'Severe or worsening belly pain, especially with fever, vomiting, or blood in your stool, needs prompt medical attention.';

// area: matched against the name of the body structure. types / patterns: matched against how it feels and behaves.
const ENTRIES = [
  {
    id: 'breast', area: /breast|mammar|nipple|areola/i,
    name: 'Breast tenderness linked to hormones, or a benign breast change',
    why: 'Breast pain is common and is often linked to hormone changes or to harmless changes such as a cyst. The only way to tell what is behind it is an examination, so new or lasting breast pain deserves one.',
    urgency: 'soon',
    tests: ['Whether a clinical breast exam and, depending on your age, an ultrasound or mammogram would be sensible'],
    questions: ['Could this be related to my cycle or hormones?', 'Do I need a breast exam or imaging?', 'Does it matter which kind of touch or pressure brings it on?'],
    redFlags: ['A new lump or thickening, dimpling or redness of the skin, nipple discharge or a nipple that turns inward, swelling, or pain in one spot that does not go away should be checked promptly.'],
  },
  {
    id: 'heart', area: /heart|cardiac|aort|ventric|atri|coronary/i,
    name: 'A heart-related cause that a clinician should rule out',
    why: 'Pain around the heart can have many causes, most of them not dangerous, but heart causes need to be ruled out by a professional rather than assumed away.',
    urgency: 'urgent',
    tests: ['Whether an ECG or other heart tests are needed'],
    questions: ['Could this be coming from my heart, and how would we know?'],
    redFlags: [CHEST_EMERGENCY],
  },
  {
    id: 'chestwall', area: /pector|rib\b|ribs|sternum|costal|thorac|intercostal/i,
    name: 'Chest-wall or muscle irritation',
    why: 'Pain over the ribs, breastbone or chest muscles that changes with movement, pressing or breathing can be consistent with irritation of the muscles or cartilage there.',
    urgency: 'soon',
    tests: ['Whether an ECG or chest imaging is needed to rule out other causes'],
    questions: ['Could this come from the chest wall rather than the heart or lungs?', 'What would rule out other causes?'],
    redFlags: [CHEST_EMERGENCY],
  },
  {
    id: 'lung', area: /lung|bronch|trache|diaphragm|pleura|respir/i,
    name: 'A breathing-related cause',
    why: 'Pain that changes with breathing or coughing can be consistent with irritation of the lining around the lungs or the muscles used to breathe.',
    urgency: 'soon',
    tests: ['Whether a chest examination or chest imaging would help'],
    questions: ['Is this related to my breathing?'],
    redFlags: ['Trouble breathing, coughing up blood, or a blue tint to the lips needs emergency care.'],
  },
  {
    id: 'shoulder', area: /shoulder|deltoid|trapezius|rotator|clavic|acromi|scapul|supraspin|infraspin/i,
    name: 'Overuse of the muscles, tendons or joint around the shoulder',
    why: 'Pain that is sharp or aching with reaching or lifting, and that eases with rest, can be consistent with overuse of the muscles and tendons around the shoulder.',
    urgency: 'routine',
    tests: ['Whether an examination of shoulder movement, or imaging, would help'],
    questions: ['Which movements should I avoid, and which should I keep doing?', 'Would physiotherapy be appropriate?'],
    redFlags: ['Sudden weakness of the arm, or shoulder pain with chest pressure or shortness of breath, needs urgent care.'],
  },
  {
    id: 'neck', area: /neck|cervical|thyroid|larynx/i,
    name: 'Muscle or joint strain in the neck',
    why: 'Neck pain that changes with posture or movement can be consistent with muscle tension or strain of the joints in the neck.',
    urgency: 'routine',
    tests: ['Whether an examination of neck movement or imaging would help'],
    questions: ['Could my posture or daily habits be involved?'],
    redFlags: ['Neck pain with fever and a stiff neck, or with weakness or numbness in the arms, needs urgent care.'],
  },
  {
    id: 'back', area: /vertebra|lumbar|spine|spinal|sacr|back|coccyx|lumbosacral/i,
    name: 'Muscle strain or irritation of the joints in the back',
    why: 'Back pain that changes with posture, lifting or long periods of sitting can be consistent with muscle strain or irritation of the small joints and discs in the spine.',
    urgency: 'routine',
    tests: ['Whether an examination or imaging of the spine would help'],
    questions: ['Which activities should I change?', 'Would physiotherapy or a strengthening plan help?'],
    redFlags: ['Back pain with numbness in the groin or legs, new trouble controlling your bladder or bowels, or leg weakness needs urgent care.'],
  },
  {
    id: 'lowerlimb', area: /knee|patella|femur|hip|ankle|tibia|fibula|foot|meniscus|thigh|calf|gluteal/i,
    name: 'Overuse, wear or injury of a joint or the muscles around it',
    why: 'Pain in a hip, knee, ankle or the muscles around them that builds with activity can be consistent with overuse, wear of the joint, or a minor injury.',
    urgency: 'routine',
    tests: ['Whether an examination of the joint, or imaging, would help'],
    questions: ['What is putting strain on this joint?', 'Which exercises are safe for me?'],
    redFlags: ['A hot, swollen, red joint with fever, or a leg that is suddenly swollen, painful and warm, needs urgent care.'],
  },
  {
    id: 'upperlimb', area: /humerus|elbow|forearm|wrist|hand|finger|radius|ulna|thumb/i,
    name: 'Overuse or irritation of the tendons or a nerve in the arm or hand',
    why: 'Pain, tingling or aching in the arm or hand that builds with repeated use can be consistent with overuse of a tendon or irritation of a nerve.',
    urgency: 'routine',
    tests: ['Whether an examination of the arm and hand would help'],
    questions: ['Could a repeated movement at work or home be involved?'],
    redFlags: ['Sudden weakness, a drooping face, or trouble speaking with arm symptoms needs emergency care.'],
  },
  {
    id: 'head', area: /brain|head|skull|cranium|temporal|frontal|occipit|eye|sinus|jaw|mandib/i,
    name: 'A tension-type or migraine-type headache pattern',
    why: 'Head pain that builds over the day, or comes with light sensitivity or nausea, can be consistent with tension-type headaches or migraine.',
    urgency: 'soon',
    tests: ['Whether a neurological examination would help'],
    questions: ['What kind of headache could this be?', 'Which triggers should I track?'],
    redFlags: [HEAD_URGENT],
  },
  {
    id: 'upperbelly', area: /stomach|liver|gall|pancrea|spleen|duoden|esophag|epigastr/i,
    name: 'A digestive cause such as reflux, gastritis or gallbladder-related pain',
    why: 'Pain in the upper belly that relates to meals, lying down or fatty food can be consistent with a digestive-system cause.',
    urgency: 'soon',
    tests: ['Whether blood tests or an ultrasound of the upper belly would help'],
    questions: ['Is this related to what or when I eat?'],
    redFlags: [BELLY_URGENT],
  },
  {
    id: 'lowerbelly', area: /colon|intestin|bowel|rectum|appendix|ileum|cecum|sigmoid|abdom|bowel/i,
    name: 'A bowel-related cause such as gas, constipation or irritable bowel',
    why: 'Cramping or aching in the belly that comes and goes, or changes with meals and bowel habits, can be consistent with a bowel-related cause.',
    urgency: 'soon',
    tests: ['Whether a stool or blood test, or an examination of the belly, would help'],
    questions: ['Is this related to my bowel habits or diet?'],
    redFlags: [BELLY_URGENT],
  },
  {
    id: 'pelvic', area: /kidney|ureter|bladder|urethra|prostate|testis|testic|scrot|uter|ovar|pelvi|vagin|genital/i,
    name: 'A urinary or reproductive-system cause',
    why: 'Pain low in the belly, the pelvis or the sides that relates to passing urine, periods or activity can be consistent with a urinary or reproductive-system cause.',
    urgency: 'soon',
    tests: ['Whether a urine test, or an examination of the pelvis, would help'],
    questions: ['Could this be urinary or gynaecological (or urological), and how would we check?'],
    redFlags: ['Pain with fever, blood in the urine, or sudden severe one-sided pain needs prompt medical attention.'],
  },
  {
    id: 'nerve', types: ['tingling', 'numbness', 'shooting'],
    name: 'Irritation or pinching of a nerve',
    why: 'Tingling, numbness or shooting pain that travels along a line can be consistent with a nerve being pinched or irritated.',
    urgency: 'soon',
    tests: ['Whether a nerve or spine examination would help'],
    questions: ['Where could a nerve be irritated?'],
    redFlags: ['Sudden numbness or weakness on one side, or loss of control of bladder or bowels, needs emergency care.'],
  },
  {
    id: 'burning', types: ['burning'],
    name: 'Irritation of the skin or of a nerve',
    why: 'A burning quality can be consistent with irritation of the skin or of a nerve, and sometimes with acid irritation in the gut.',
    urgency: 'routine',
    tests: ['Whether an examination of the area would help'],
    questions: ['Does the burning quality point to a particular cause?'],
  },
  {
    id: 'worsening', when: (ctx) => ctx.worsening,
    name: 'A pattern that is getting stronger and is worth a prompt check',
    why: 'Pain that is getting stronger over time is more important to have looked at sooner than pain that is steady or easing, whatever the cause.',
    urgency: 'soon',
    tests: [],
    questions: ['Why might this be getting stronger, and how soon should I be seen?'],
  },
];

const GENERIC_QUESTIONS = [
  'What could be causing this pattern?',
  'Which of my triggers should I keep track of?',
  'What warning signs mean I should come back sooner?',
  'Is there anything here I should be more (or less) concerned about?',
];

module.exports = { ENTRIES, GENERIC_QUESTIONS, REVIEWED };
