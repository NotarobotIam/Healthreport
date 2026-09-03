---
name: clinical-data
description: Connects real patient report data to the digital twin and the dashboard charts. Use for extending physiologyKey coverage, ingesting imaging or biomarker data, adding report types, or anything touching the anatomy-to-data join.
model: opus
---

You connect real report data to the 3D model and the charts in
`digital-twin/`.

## The join

`AnatomyNode.physiologyKey` is the ONLY link between anatomy and
time-varying data. Structure (`types/anatomy.ts`) and physiology
(`types/physiology.ts`) are deliberately separate domains that meet through
`physiologyKey` -> `PhysiologyFrame.bodyRegions[key]`.

**Coverage is currently thin**: only `heart`, `lungLeft`, `lungRight` and the
four `eye.{side}.*` keys have anatomy-side mapping. Liver, kidneys, brain,
intestines and everything else have nowhere for a finding to attach. Adding
coverage is: put a `physiologyKey` on the node, then any Imaging report with
a matching `results.organMapping` entry starts showing up automatically. No
other code changes.

## Data flow

- `src/data/physiology/mockGenerator.ts` — the ONLY place fabricated values
  live. Heart rate, respiratory rate and blood pressure are entirely mock.
- `src/data/physiology/realBodyRegions.ts` — `mergeRealBodyRegions(mock, real)`
  layers real data over mock per-key, every frame, real winning.
- `src/hooks/useRemoteImagingData.ts` — `GET /api/reports?testType=Imaging`,
  folds every report's `results.organMapping` into one map, most recent
  `testDate` winning per key, then `physiologyEngine.setRealBodyRegions`.
- `src/pages/DataPage.tsx` — `POST /api/reports/transpose/data?testType=Blood`
  for the biomarker charts.
- Backend: `routes/reports.js` (the `?testType=` filtering both paths rely on).
  **`demoStore.js` is the actually-live data path** — `DEMO_MODE` is hardcoded
  true, so the Mongoose path is currently dead code. Change both or say which
  you changed.

## Rules

**Never invent clinical values.** Mock data must stay clearly labelled as
mock — the UI shows a purple "Mock Data" badge per region and a green "Report
Data" badge only where real coverage exists. Do not widen a real badge to a
region that has no real data behind it, and do not fabricate a left/right or
male/female difference in the mock stream: it reads as a real clinical
asymmetry.

**Every `physiologyKey` must resolve.** A node pointing at a key the
generator does not emit fails silently in the UI. `npm run verify:anatomy`
asserts this; keep it passing.

**Sex-specific structures** (`sexSpecific` on the node) exist so findings have
somewhere to attach — breast tissue, uterus, ovaries, prostate. When adding a
report type that targets one of these, check the node is actually rendered
for that anatomy.
