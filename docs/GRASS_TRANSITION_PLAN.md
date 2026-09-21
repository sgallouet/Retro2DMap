# Grass milestone — prove the grass–road join first

> SUPERSEDED EXECUTION ORDER: the user rejected the resulting art. Read [GRASS_COURSE_CORRECTION.md](GRASS_COURSE_CORRECTION.md). Stop implementation until a reference-matched visual sample is approved. The 48×48 art restriction below is withdrawn; 48px remains the logical cell size, not a mandatory artwork resolution. Retain this document only as historical engineering context.

2026-09-20. Next element: meadow `grass`. Roads are implemented but **provisional**, to be judged beside grass. Planning only: no runtime/art changes in this revision.

## Scope

The user paints the map. Preserve every painted terrain ID, coordinate, road width and intentional empty cell. Never reset/reload unsaved painting. Work on an exported copy or separate disposable proof.

Improve grass material and its transitions with `path` and `cobble`. Keep road center textures fixed initially; minimal road boundary-composition changes are allowed and necessary. No grass-dark family, other terrain, water/shores, props, flowers, tree shadows or editor expansion. Do not resume map reconstruction or terrain-wide plans.

## Verified diagnosis

- At 100% our grass reads as uniformly fine lime noise. Target grass has readable blade clusters and quieter spaces. Avoid sampling trees, flowers or cast shadows into the grass texture.
- The 50% view borrows target detail. It helps alignment but cannot establish art quality.
- `grass-center.png` is a 48px authored fill. `drawGrassTileEdges` in `ProceduralAssetProvider.ts` adds independent inset highlights/lines/corner marks, using its own hardcoded palette.
- `RoadTerrainCompositor.ts` clears 1–3px road contours to transparency. Those pixels reveal the reference, **not semantic grass underneath**. A neighboring grass tile cannot fill pixels inside the road tile by itself.
- Existing topology distinguishes connected/nonconnected neighbors, but cannot identify whether a different neighbor is grass, road or empty. Better material alone cannot fix this boundary problem.

## 1. One small material-and-transition proof

Use grass beside a three-cell dirt-road straight, an elbow and a concave corner. Include an empty neighbor. After the dirt contact works, add one short cobble contact. Inspect both horizontal and vertical edges. Do not start with a whole-map polish pass.

Inspect one clear grass crop from `docs/reference/target-map.png`, excluding objects and shadows. Record representative base/mid/highlight colors and blade-cluster size. Convert original target pixels to world pixels by ×1.25 (1536→1920); do not apply this again to resized screenshots.

Create one 48×48 material candidate with grouped, readable blade strokes, calm base color and modest broad variation. Start with a few-pixel cluster, then judge at actual editor zoom rather than treating that size as measured truth. Avoid pixel static, neon dots, rigid chevrons, dark circular patches or a repeated central tuft.

Use the imagegen skill for bitmap authoring when execution starts. Judge the normalized 48px output in a 4×4 repeat, not the high-resolution generation. The current provider shrinks an entire source to one tile: a bigger image does not automatically provide more runtime variation. No giant atlas or additional grass family yet.

One candidate first; a second only to fix a named defect. Develop its road contact immediately. Do not polish an isolated lawn for multiple sessions.

## 2. Single boundary owner: our pixels, not reference leakage

Use **tile-local composition informed by neighboring material IDs**. Avoid a global grass underlay, draw-order-dependent overhang, fractional cells or additional persistent terrain layers.

| Pair | Required result |
| --- | --- |
| grass / grass | Continuous opaque material; no lip, outline or alpha crack |
| grass / path | One irregular grass fringe with modest contact shading; no duplicate road bevel or transparent gutter |
| grass / cobble | Continuous coverage, restrained fringe, readable edge stones; no thick universal curb |
| grass / empty | Preserve the empty cell; no implicit grass fill outside the owned grass tile |
| road / empty | Preserve existing exposed-road behavior; never assume missing ground means grass |
| road / road | Preserve road connectivity; no invented grass between roads |
| grass / other | Do not pretend it is a road transition; leave unrelated behavior alone |

### Implementation sequence

1. Derive only the material-neighbor context needed: eight-direction grass-neighbor information for roads, and road-neighbor information for grass edge suppression. Preserve existing connect-group topology and outside-map convention. Do not serialize masks into maps or infer materials from reference pixels.
2. Where a road actually touches grass, supply our grass material in its road-side contour instead of clearing that area. Compose road fill, grass fringe and contact shading into **one final 48px tile**. Existing road contour geometry can guide the prototype.
3. Suppress the grass tile's old independent framed lip toward that road. Grass reaches the shared tile boundary; the single grass/road contact sits near the road-side contour. Do not combine two old edge systems with a third fringe.
4. Keep both material cores fully opaque. Start near the existing 1–3px boundary band; allow only a few deeper blade tips if the proof benefits without visibly narrowing a one-cell road. No broad fade revealing target grass.
5. Match grass sampling phase across the boundary. The grass band inside a road tile must continue from its neighbor, not restart at an unrelated bright/dark edge. For a periodic 48px source, use world-pixel modulo 48. Match contour endpoints across adjacent tiles.
6. Handle corners explicitly: grass diagonals can supply appropriate concave corners; empty or other-material diagonals cannot. Avoid double-dark corner intersections, missing pixels and grass covering connected road arms. Out-of-bounds is not an implicit grass neighbor.
7. Include relevant material masks in composite texture keys. Identical road topology beside grass versus empty must not reuse the same finished image. Cache only encountered grass/road combinations after base assets are ready; do not precompute every material combination for the whole catalog.
8. Neighbor edits must immediately select the changed composite. Reuse the renderer's existing document rebuild behavior; no new chunking or invalidation framework.

Start with `RoadTerrainCompositor.ts`, `ProceduralAssetProvider.ts`, `TerrainRenderContext`/`IAssetProvider.ts` and the terrain context passed by `WorldRenderer.ts`. Add a focused helper if it keeps responsibilities small. No new fallback path or alternate renderer.

Square semantic occupancy stays unchanged even though a few visual grass pixels can appear within the edge of a road tile. Navigation, painting and exported JSON continue to use the original terrain ID.

## 3. Art direction of the pair

- Interior: clustered blades and calm space; less uniform high-frequency noise.
- Dirt join: irregular small tips, subtle dark root contact, sparse light tips. No continuous trench or luminous stripe.
- Cobble join: less encroachment, stone edges remain readable. Do not tint the road green to conceal a seam.
- Corners: continuous irregular turn within the existing grid, not square brackets, beads or blobs.
- Lighting: consistent upper-left direction; rotating a lit texture must not rotate its lighting.

Tune grass against the current road centers first. If road scale/contrast still looks wrong after the join works, present that specific combined defect. The roads are not finally approved, but this is not authorization for another unattended road-generation cycle.

## 4. Evidence and review checkpoint

Make one matched target/current/candidate patch comparison, plus one compact topology sheet:

1. Map opacity 0: target reference.
2. Map opacity 100: painted grass/road pixels must be ours.
3. Actual generated textures on a conspicuous solid/checker background: expose unwanted alpha leaks. An offline diagnostic is sufficient; no new editor feature required.

Normal editor scale decides readability; native pixels diagnose seams. The supplied 50% image is alignment evidence only. Do not bake flowers, shadows or reference objects into the material to create apparent richness.

Present the concrete patch for user review before expanding variants or claiming completion. Make the working proof before this checkpoint; do not ask permission just to begin ordinary implementation.

## 5. Focused checks and token discipline

- Same road topology beside grass and empty gets distinct context/cache selection; empty stays empty.
- Actual composed pixels cover fully painted grass/road seams and corners without alpha leaks. Test the output alpha, not just rectangle counts.
- One contact sheet: grass/grass, straight H/V, convex/concave, one-cell grass island, narrow road, mixed dirt/cobble/grass meeting, empty diagonal and map-edge continuation.
- Disposable edit: grass neighbor → empty → undo. Transition changes and restores without stale textures. Do not edit the user's active map.
- Run affected compositor/topology tests and build once for a reviewable code candidate. Image-only tweaks need visual repetition/seam checks, not full-suite runs. Leave known legacy sampleKingdom failures outside scope.
- Preserve a source hash/exported snapshot: counts alone do not prove cell positions stayed unchanged.
- After two failed attempts on one defect, identify the failing layer: texture scale, contour, sampling phase, alpha or cache. Change that layer only. No segmentation, large atlas, general benchmarks or beauty scores.

Done: user approves the combined patch, repeated grass has no visible tile grid, tested road joins are coherent, and target detail does not leak through painted cores or fully painted seams. Then apply the same rendering to the user's existing grass cells. User selects the next element.

Keep `docs/M1_HANDOFF.md` around 25 lines: current proof, provisional road status, transition ownership, touched files, checks actually run, evidence and next exact defect. Do not restart previous terrain-wide plans.

## Professional reference

[Tiled: Using Terrains](https://docs.mapeditor.org/en/latest/manual/terrain/) distinguishes edge, corner and mixed matching. The useful lesson is to handle both sides and corners of material contacts, not to migrate editors or manually select visual pieces. The composition design above is specific to this renderer, not a recipe claimed by that documentation.
