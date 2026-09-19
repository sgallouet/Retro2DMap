# First Authored Sprite Trial — Round Tree

This is the recommended **first real sprite** for Retro2DMap.

Why this one:

- it is a static prop, so there is no autotile/topology complexity
- it is visually important in the target map
- it is repeated often enough that one good sprite noticeably improves the whole scene
- it exercises transparent overhang cleanly
- if the result is bad, procedural fallback still works automatically

The logical footprint stays **1×2 tiles = 48×96 logical pixels**.

The visual sprite may overhang horizontally. Target final sprite canvas:

- **72×96 px**
- transparent background
- centered on the logical 48×96 footprint
- about 12 px transparent/visual overhang available on each side
- trunk base centered near the bottom
- no map data changes

Generate a high-resolution master first, preferably **576×768 px**, then downsample carefully to 72×96 px.

---

## Image-generation prompt

Attach the project target screenshot as the visual reference.

> Create ONE original 2D JRPG world-map sprite: a lush round deciduous fantasy tree. Transparent background only. Use the attached reference screenshot for camera angle, palette, rendering density, and overall visual language, but do not copy any specific tree from it.
>
> The sprite is for a strict square-grid game where one logical tile is 48×48 px and this tree occupies a 1×2 logical footprint. The final sprite will be displayed on a 72×96 px transparent canvas, centered over a 48×96 logical footprint, allowing approximately 12 px of horizontal visual overhang on each side.
>
> Use a polished Japanese retro-RPG map aesthetic with crisp, readable forms at small size. Camera is top-down / high three-quarter world-map view, matching the attached target screenshot. The crown should be broad, compact, rounded and layered, not a simple circle. Build the canopy from overlapping irregular leaf masses with a strong readable silhouette.
>
> Palette should match the reference: sunny yellow-green highlights on the upper-left/top surfaces, saturated medium green midtones, deep emerald / blue-green shadows underneath and between leaf clusters. Keep the darkest values concentrated inside the lower canopy so the tree feels dimensional without a heavy outline.
>
> Only a small amount of warm brown trunk should be visible at the bottom center. Most of the trunk must be hidden behind foliage, like the reference trees. The trunk base must align with the bottom-center of the sprite so it can sit naturally on one grid cell.
>
> Use hand-painted sprite detail, crisp small forms, subtle clustered texture, and clear light/shadow grouping. It should remain attractive after downsampling to 72×96 px.
>
> No background. No ground patch. No scenery. No cliff. No flowers. No fruit. No sign. No text. No border. No frame. No separate shadow extending outside the sprite. Do not crop the canopy or trunk. Keep the entire tree isolated and fully visible with clean alpha edges.
>
> Original design only; do not reproduce an exact tree from the reference.

---

## Negative guidance

Avoid:

- photorealistic leaves
- painterly blur
- generic spherical tree canopy
- heavy black outlines
- visible sky/background
- large exposed trunk
- isometric side view
- extreme perspective
- symmetrical Christmas-tree silhouette
- large empty transparent padding
- decorative ground or grass attached to the sprite

---

## Integration contract

When the final file is ready:

1. name it `tree-round.png`
2. final size: **72×96 px**
3. place it at `public/assets/props/tree-round.png`
4. enable the existing commented `tree-round` manifest entry in `src/assets/spriteManifest.ts`

No map JSON, topology, placement, or renderer semantics should change.
