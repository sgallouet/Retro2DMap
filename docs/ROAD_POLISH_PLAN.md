# Road-only plan — prove one visible improvement before expanding

2026-09-20. Supersedes all previous M1 layout/terrain-wide plans.

## Contract

The user draws the map. The assistant improves **one element at a time**. Current element: roads, implemented sequentially as `path` first, then `cobble`.

Preserve every user-painted cell and transparent empty cell. Do not trace/rebuild the map, correct road widths or routes, touch other materials, introduce props, or fix the old generated sample. The difference between the user's road shape and the target is accepted. No full-map reference mask, new comparison editor or broad terrain study is needed.

This document is a plan, not a claim that road art is improved. Current evidence is the user's target-only and target-plus-road screenshots, the actual 48×48 road PNGs, and the current render code.

Saved evidence: [target-only screenshot](reference/roads-target-only-2026-09-20.png) and [current road overlay](reference/roads-before-2026-09-20.png). A bounded GPT Luna review independently confirmed the material-scale and rectangular-border causes. No broad tutorial research was needed to identify this implementation defect.

## Diagnosis: why the current roads fail

| Visible problem | Verified implementation / implication |
| --- | --- |
| Dirt road reads as yellow grain; cobble as gray grit | Both center PNGs contain very small repeated stones. At fit zoom their features collapse. Match stone size before adding more detail. |
| Borders look like rulers framing a flat ribbon | `ProceduralAssetProvider.drawTerrainEdges` paints straight 4px soft / 3px hard strips, highlights and rectangular corner patches. Neither road has a material-specific edge treatment. |
| Replacing the center cannot fix the silhouette | Manifest uses `terrain-base`: authored center first, generic procedural edge overlay afterward. Both parts need a road-specific result. |
| More randomness will not necessarily improve repetition | `blitTerrainMaterial` draws the same whole image into each 48px cell; the four procedural variants do not vary that authored center. The present `terrain-base` setup selects its material during prepare. |
| Larger source images could make the grain even worse | `drawImage(source,0,0,width,height)` shrinks the entire source to 48×48. A 96px sheet does NOT currently become four 48px tiles. |

The target's warm road appears to have softly outlined, irregular rounded paving shapes; the gray road has larger readable stones, subtle light/dark faces and joints. Neither should be treated as generic noise. Target grass/object detail must not be mistaken for road texture.

## 0. Protect the working map; establish honest evidence

- Read `docs/M1_HANDOFF.md` and `git status --short`. Default source is `src/maps/reference-map-01-river-castle.json` through `referenceMap01.ts`; `sampleKingdom.ts` is not the working map.
- Do not reset, reload or replace a live editor document with unsaved user painting. Use a separate preview tab/document for experiments. If the latest painting exists only in the editor, export a backup through its existing UI before any operation that would destroy it. Preserve the original source JSON byte-for-byte during art work.
- Current opacity control is **Our map opacity**: 0 = target only, 100 = our opaque roads over target. Empty cells remain transparent. Do not revert this to the older target-transparency behavior.
- Capture target-only and current-road views at exactly the same viewport, camera position and zoom. The supplied screenshots differ in framing; they establish the problem but are not registered pixel-difference inputs.
- Keep two tight comparison crops: a dirt straight/bend and the gray approach road. Also inspect road pixels against a neutral checker/solid background so an attractive target cannot conceal missing/transparent material.

## 1. Measure the reference material, not the whole map

Spend one short inspection on unobstructed road patches from `docs/reference/target-map.png`. Record only:

1. Rough stone width/height and number of stones across a road strip.
2. Base, joint, highlight and shadow colors (representative clusters, not every pixel).
3. Boundary character: soft eroded dirt edge versus stone edges/joints; any curb must be distinguished from nearby walls/stairs.

Reference registration remains 1536×1152 → 1920×1440: multiply reference-pixel sizes by **1.25** for world pixels. Do not measure a resized screenshot then apply that factor again. Initial candidates may be roughly 7–12px warm paving shapes and 10–16px cobbles at world scale, but these are trial ranges, not measured facts: correct them from the crop before generation.

Deliver one small target/material comparison sheet. No segmentation, whole-map annotation or beauty score. Optional Python/Pillow can crop, nearest-neighbor enlarge, make repeat sheets and measure dimensions/colors. It must not classify target objects as terrain or implement a parallel renderer.

## 2. Dirt road: one small proof, center first

**Finish this proof before producing cobble or a full tile family.**

Use one 48px repeatable material with readable warm rounded paving shapes, restrained joints, small upper-left highlights and modest lower-right shading. Avoid uniform honeycomb, dense one-pixel grain, glossy bevels, realistic gravel and a flat solid yellow fill. Target contrast and stone scale matter more than decorative variation.

Use imagegen for bitmap authoring/editing when that phase begins; read its skill then. Supply a tight road-only reference crop and explicit final feature scale. Never ask for an entire environment or 47 unrelated topology tiles. Judge the final normalized 48px output, not the attractive high-resolution source. If downsampling erases the stones, reject the normalization rather than boosting noise or sharpening blindly.

Show the candidate tiled 4×4 and on a short one-cell-wide horizontal/vertical road with one elbow. Use the same intended material path as the actual renderer. A development proof may temporarily use the current border, but **cannot pass road acceptance with that border**.

First review asks: can individual paving shapes be read at normal editor fit zoom, do colors resemble the target, and does repetition avoid seams/obvious stamps? If no, fix only the center. Do not write edge code to compensate for an unreadable material.

At most two materially different center candidates before presenting the stronger one with the remaining defect. Do not run an unattended generation loop. A visible sample is the review deliverable; stop for the user's choice if art direction is still uncertain.

## 3. Dirt road: replace the generic border with a connected road edge

Recommended implementation: retain the existing semantic topology resolver and material loading, add a small road-only compositor/helper called from `drawTerrain` for `path` (later `cobble`). That branch owns fill + edge + corner composition and returns; do not then apply generic `drawTerrainEdges` on top. Do not change global `soft`/`hard` behavior for other terrain.

The road compositor uses the existing cardinal and inner-corner masks:

- Connected neighbors have full continuous material up to the shared cell boundary: no border, transparent crack or shadow line there.
- Exposed sides have a narrow, irregular **inset** contour and sparse material-specific edge accents. Start around 1–3px inset; no broad faded band or painted grass fringe.
- Keep most road pixels fully opaque. Small alpha cutouts are acceptable only at the exposed contour/corners; no semi-transparent center pretending target stones are our stones.
- Outer corners become subtly rounded/stepped within their owned square. Concave corners must join both arms without a square dark notch. Keep the visual change small so the user's road width/layout remains intact.
- Where exposed sides continue along successive cells, contour endpoints must match at tile boundaries for every allowed variant. Do not independently randomize edge endpoints. Never rotate lighting with a tile to obtain another direction.
- Empty neighbors mean exposed road. Do not infer grass, bridge, water, curb or stairs from reference-image pixels. Road/road boundaries may show a material seam, but do not carve a transparent gutter between touching `path` and `cobble`; use neighbor context if needed for that specific join, not a new terrain-layer framework.
- Preserve the resolver's existing outside-map connectivity convention; do not accidentally add end caps where roads continue off the map. Include one map-edge continuation in the proof.

A road alpha contour on an empty cell boundary reveals whatever is behind it. In the present editor that is the reference; it is not generated grass and must be described honestly. On a neutral background the edge must still read as a road, without broad missing chunks. Solving future road-on-grass substrate layering is outside this proof unless a real in-scope join requires a minimal fix.

Reuse `enumerateTerrainTopologies()` to exercise legal keys; derive outputs from the common center/edge rules. Do not hand-author a separate image for every mask or build a universal atlas generator.

If one 48px material repeats visibly after the proof succeeds, add only the variation required. Edge-compatible variants are acceptable; arbitrary flipping/rotation can reverse lighting or break seams. A larger 2×2 material needs explicit 48px quadrant selection with fixed world-coordinate phase, not the current whole-image scaling and not random quadrant choice. Defer that extension until repeated-pattern evidence warrants it.

## 4. Integrate and review dirt road before cobble

Apply the approved road material/compositor to the user's unchanged cells. Compare:

- target only (map opacity 0);
- our road over target (100, not 50);
- our road on a neutral background.

At the same zoom, the replacement should no longer jump out as a grainy yellow ribbon. Evaluate readable paving size, warm palette, restrained relief, natural edge and seam-free turns. Ignore accepted layout differences. If target bridge/NPC pixels are covered by user-painted road, do not restore objects or change cells to hide that artifact; assess a clear road segment.

Deliver the small before/after. **User review of this concrete dirt-road proof is the checkpoint before cobble work.** Do not claim success from texture file existence, test counts or an image-generation result that was never rendered.

## 5. Cobble, using the proven workflow

After dirt is accepted, produce one gray material with readable irregular stones, muted gray/warm-gray variation, narrow darker joints and restrained upper-left light. Make a road, not gray static or evenly beveled square bathroom tiles.

Use the same compositor structure but a cobble-specific contour/joint treatment. Do not reuse the dirt's eroded edge blindly or add a thick black picture-frame border. A curb is optional only if the target road sample actually calls for one; it belongs to the road edge, not a new prop project.

Prove a short straight + elbow + wider patch, then apply to the unchanged gray approach cells. Judge at normal zoom and on a neutral background. Add no fountain, stairs, walls, grass or character work.

## Small, relevant verification only

- Preserve source JSON hash/cell coordinates and empty-cell semantics across the art change. Counts alone cannot prove cells did not move. Avoid touching map files entirely.
- One contact sheet per road: interior repeat, isolated cell, end, straight H/V, convex/concave elbow, T/cross, two-wide patch and a path/cobble join. Inspect connected boundaries for cracks and outer contours for discontinuities. A focused pixel test is useful for alpha continuity at connected edges; do not assert every noisy pixel matches a golden image.
- One disposable edit smoke check: add/remove a road neighbor, confirm the corner changes, undo. User's active map stays untouched.
- Run the existing road-map test and tests directly affected by loading/topology changes. Build once for each reviewable code candidate. No full-suite reruns for each texture edit, no old castle route repair, no new tests that merely count study cells.

If two iterations fail on the same defect, name the failed criterion and inspect that layer (stone scale, texture seams, contour or compositing). Do not change three things at once or add another fallback. Keep evidence to one target/before/after sheet and one topology sheet per road; output first few failures only.

## Handoff and completion

Handoff, at most 20–30 lines: current road, approved center/edge decisions, exact remaining defect, source-map hash, touched files, evidence paths, checks actually run, next action. No rereading previous terrain plans next session.

Completion: the user accepts dirt and cobble on their unchanged layout at 100% map opacity; roads remain functional when edited; no target pixels inside opaque road cores are being used as our art. Everything else awaits the user's next element choice.
