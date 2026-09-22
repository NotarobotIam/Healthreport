// Shared vocabulary for pain entries. The frontend mirrors these lists in
// digital-twin/src/types/pain.ts — keep the two in sync.

const PAIN_TYPES = [
  'sharp',
  'stabbing',
  'dull',
  'aching',
  'burning',
  'throbbing',
  'cramping',
  'pressure',
  'shooting',
  'tingling',
  'numbness',
  'stiffness',
];

const PAIN_PATTERNS = ['constant', 'comes-and-goes', 'getting-worse', 'getting-better'];
const PAIN_STATUSES = ['active', 'resolved'];
const PAIN_SIDES = ['left', 'right', 'midline', 'unknown'];
const PAIN_VISIBILITIES = ['private', 'community'];

module.exports = { PAIN_TYPES, PAIN_PATTERNS, PAIN_STATUSES, PAIN_SIDES, PAIN_VISIBILITIES };
