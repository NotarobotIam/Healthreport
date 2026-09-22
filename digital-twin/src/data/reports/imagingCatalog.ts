// Imaging/scan reports (testType "Imaging"). Saved as an ordinary report whose results carry an `imaging`
// object ({ modality, bodyRegion, findings }) — see types/reports.ts's ImagingMetadata, which this mirrors.

export const IMAGING_MODALITIES = ['X-ray', 'Ultrasound', 'CT', 'MRI', 'PET', 'Other'] as const;
export type ImagingModality = (typeof IMAGING_MODALITIES)[number];

/**
 * Suggestions only (an editable text field with a <datalist>), not a restriction — imaging can be of
 * almost any part of the body. Grouped roughly head-to-toe, with the region names a urology scan would
 * use grouped together.
 */
export const COMMON_BODY_REGIONS = [
  'Brain',
  'Head and neck',
  'Chest',
  'Heart',
  'Abdomen',
  'Pelvis',
  'Kidneys and bladder',
  'Kidneys, bladder and prostate',
  'Kidneys, bladder, uterus and ovaries',
  'Scrotum and testes',
  'Lumbar spine',
  'Cervical spine',
  'Shoulder',
  'Hip',
  'Knee',
  'Ankle',
  'Wrist',
] as const;
