# Grass recovery — art proof before more engineering

2026-09-20. Replaces the execution order in GRASS_TRANSITION_PLAN.md.

## Audit and responsibility

Reviewed the task **Implement grass transition plan**, including its image prompts, normalization commands, selected source image and runtime asset. The user's cut-out comparison rejects the current art. Tests passing does not alter that verdict.

Verified failures:

1. The generation prompt demanded hard-edged 16/32-bit pixel art and explicitly excluded painterly texture. The target has softer, densely interwoven grass strokes. This was a style mismatch before integration.
2. The selected 1254×1254 source was reduced to 48×48 with nearest-neighbor sampling. It became tiny, high-contrast tuft symbols on a relatively flat field. Nearest-neighbor enlargement of finished pixel art and drastic reduction of a generated painting are different operations.
3. The source itself had sparse separate tufts; changing the reduction filter alone cannot make it the right grass.
4. The previous plan unnecessarily equated a 48px logical cell with mandatory 48px source/output artwork. Gameplay scale does not establish the best visual sampling strategy.
5. Work advanced from “separated clumps” to extensive compositor tests without a convincing matched-scale target/candidate comparison. Engineering evidence displaced visual acceptance.

The prior plan bears responsibility for its rigid sizing and excessive implementation detail. Do not attribute this only to Luna. Preserve useful transition code, but treat the selected grass as a rejected candidate, not completed art.

## Immediate rule

**No additional runtime changes, topology work, tests, new variants or other materials until one small grass-and-road visual sample is accepted.** Preserve the user's painting, saved maps, empty cells and existing working code. Do not reset the live editor or roll back unrelated changes.

## Next deliverable: one comparison image

1. Take a clean grass-and-dirt boundary crop from the original target. Exclude flowers, trees and their shadows from the material area; retain a short natural verge. Show it at the same world/display scale as the current art, not at unrelated zooms.
2. Use that actual crop as an image-generation reference, not just a verbal description or guessed hex colors. The task is to match the material's appearance: soft overlapping directional grass blades, similar coverage and tonal range, no detached dark V-shaped tuft icons, no flat lime base with evenly spaced stamps. Do not prescribe “no painterly texture.”
3. Generate **one** clean material/contact study: grass interior plus a short irregular grass-to-dirt edge. No scene, props or landscape reconstruction. It is an art proof, not a final atlas or an implementation of the whole user's road geometry.
4. Show target, existing asset and candidate at the same displayed size. Include a small repeated interior patch to expose repetition. The candidate must supply its own opaque material: no target showing through its center. An enlarged view is diagnostic only; judge the normal display view first.
5. Decide the sampling method from that comparison. Do not blindly squeeze a large image into 48px using nearest-neighbor. Assess a properly filtered reduction at the current runtime size first. If the desired detail cannot survive that size, test a higher-resolution visual sample at the same logical/display size offline. Higher resolution is not automatically better and is not authorization for a global renderer rewrite.

Read the imagegen skill when authoring. Respect its editing workflow; do not construct replacement art with improvised pixel scripts. Diagnostic crops/contact sheets may use ordinary image tooling. Preserve originals and disclose which sampling method each displayed candidate uses.

## The visual decision

Accept only if the candidate reads as the same general material/style beside the target: comparable blade density and size, softer integrated light/dark variation, no sparse black-speckle lawn, no visible repeated stamped grid. The verge needs interlocking blades and restrained contact shadow, not a geometric trim line.

Roads remain provisional. Do not claim that grass can hide the road's more strongly outlined, repetitive stones. Identify that mismatch separately if it remains in the comparison; do not launch road regeneration in parallel.

Maximum one initial generation and one targeted correction for a named defect. If both fail, stop and show the evidence and limitation; do not fill the remaining budget with coding, more variants or broad research. This is a spending checkpoint, not acceptance of a bad result.

## Only after the visual proof is approved

Extract/author production material and edge pieces with the approved appearance, preserving the measured feature scale. Reuse the existing material-neighbor and coverage code. Adapt resolution or sampling only where the proof demonstrates a need, keeping 48px logical cells and map JSON unchanged. Tile seams and grass/road alpha coverage then get focused checks and one build.

Keep the handoff under 15 lines: selected/reference paths, displayed scale, sampling, accepted/rejected status, exact visible defect and next action. No full-suite run or repeated source audit for an art-only sample.
