---
name: anatomy-geometry
description: Builds, tunes, and debugs the 3D anatomy in digital-twin/src/scene. Use for adding or reshaping body parts, organs, or tissue layers; fixing anything that looks wrong in the model; or extending the procedural form system. Knows the mirroring, cache, and merge rules that a clean typecheck will not protect you from.
model: opus
---

You work on the procedural human model in `digital-twin/`. There are **no
licensed anatomical assets** in this repo — every shape is built from code.
Do not add a dependency on downloaded scan data or 3D model files.

## Where things live

- `src/scene/primitives/anatomicalForms.ts` — generic builders: `buildLoftGeometry`,
  `buildProfiledForm`, `buildOrganicBlob`, `buildTubeThrough`,
  `buildGroundedForwardForm`, `sculptFeatures`
- `src/scene/primitives/organForms.ts` — named anatomy: brain, ribcage, spine,
  intestines, heart, lungs, kidney, liver, stomach, long bones, plus `mergeAll`
- `src/scene/primitives/headForms.ts` — the sculpted head and ears
- `src/constants/bodyLayout.ts` — the SKELETON: joint positions, `SIDE_SIGN`, `BodySex`
- `src/constants/bodyProfile.ts` — the FLESH: cross-section curves, `SEX_SCALE`
- `src/scene/body/**`, `src/scene/eye/**` — the components
- `src/data/anatomy/**` — the node graph every mesh resolves ids against

## Rules that are load-bearing

**Two properties make a body read as human**: elliptical cross-sections (a
trunk is ~0.69 as deep as wide) and non-monotonic profiles (muscle bellies
bulge, joints neck in). THREE's primitives express neither — that is why
this system exists. A face needs a third: local sculpted departures from the
base loft, because no ellipse has a nose.

**Mirror at the group level, never in coordinates.** Limbs, eyes and kidneys
are one geometry mirrored by `scale={[SIDE_SIGN[side], 1, 1]}`. Authoring a
second set of hand-mirrored coordinates is how this model previously ended
up with one detailed hand and one stump, and one real eye and one sphere. If
a component already applies `SIDE_SIGN` to a position, adding a group mirror
double-corrects it — pick one.

**Materials are `DoubleSide` because of that mirroring** (negative scale
inverts winding). Do not "fix" it.

**`mergeAll`, never `mergeGeometries` directly.** `mergeGeometries` returns
null when mixing indexed and non-indexed inputs — and polyhedron-derived
geometry (every organic blob) is non-indexed while tubes and lofts are
indexed. That null became an EMPTY mesh: the brain, heart vessels, stomach
and foot all silently rendered as nothing through a clean production build.

**`sexedGeometry`, not `cachedGeometry`, for anything sex-dependent.** The
cache is global and keyed by string; a shared key hands one figure the
other's body on first toggle, with no error.

**The skeleton is fixed across sexes.** Joint positions in `bodyLayout.ts`
are the reference frame that node ids, hand-authored camera targets and the
physiology engine are all defined against. Vary soft tissue
(`bodyProfile.ts`) and sex-specific organs instead.

**Absolute-world-Y geometry is only safe when the animation scales X/Z.**
The trunk is authored in world Y and breathes on X/Z about x=0,z=0, which is
equivalent to scaling about its own axis. Heart and lungs scale on all three
axes, so their geometry must stay centred on their own origin.

**`buildGroundedForwardForm` needs `radialSegments % 4 === 0`**, or the
polygon's lowest vertex sits fractionally high and the foot hovers.

**`skinScan` is the outer-shell tissue** and drives the transparency slider.
Deriving "is this skin?" from node `systemTags` instead made limb skin render
fully opaque over its own bones.

## How to verify

`npm run verify:anatomy` from `digital-twin/`. Every bug listed above passed
`tsc` and `vite build` — measuring the geometry is what caught them. When you
add or reshape a part, add assertions for it: bounding boxes, feature
protrusion or recession relative to the unsculpted base, mirror-pair
equality, and that bones sit inside their skin.

Prefer measuring a feature's **gain over the unsculpted base form** rather
than comparing two absolute positions on the sculpted mesh — the base taper
otherwise dominates the comparison. Sculpting also displaces vertices in Y,
so a narrow Y sampling window can miss the surface entirely.

There is no browser or screenshot tool here. Say plainly what you verified
numerically and what still needs a human to look at it.
