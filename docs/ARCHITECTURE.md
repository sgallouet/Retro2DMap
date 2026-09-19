# Architecture

> Product intent and non-negotiable design rules live in [../REQUIREMENTS.md](../REQUIREMENTS.md). If this document and the requirements diverge, the requirements win.

Retro2DMap is split so **map semantics do not depend on Phaser or on any specific art pipeline**.

## Layers

### 1. Domain

`src/domain`

Owns serializable data only:

- `MapDocument`
- terrain cells
- sparse prop instances
- sparse actor instances
- catalog definitions
- footprints / blocking metadata
- map-format validation

No Phaser types belong here.

### 2. Editor application

`src/editor`

`EditorController` owns editing state and history. It exposes a small interface used by both the DOM shell and Phaser scene.

`LogicalWorldPainter` is the semantic painting API. The editor, future procedural generators and future AI map builders should all call the same painter instead of selecting visual frames themselves. It currently supports square brushes, rectangular regions and grid-native path strokes.

A stroke creates one history checkpoint, then can mutate many cells. This matters for paint-drag ergonomics and keeps undo meaningful.

### 3. Topology / smart borders

`src/domain/autotile.ts`

Terrain stores only semantic IDs such as `water`, `path` or `stone-floor`. Border graphics are **not** persisted in the map.

`TerrainTopologyResolver` inspects all eight neighboring logical cells. It produces cardinal connectivity plus concave inner-corner information and a stable `topologyKey`. Terrain definitions declare a `connectGroup`, so related materials can connect even when their exact IDs differ; for example shallow and deep water are both part of the `water` group.

`PropTopologyResolver` applies the same principle to connected 1×1 structures. Castle walls, fences, bridges and cliffs are catalogued as semantic networks and derive isolated/end/straight/corner/T/cross roles from neighboring instances.

Those topology results are the contract for both today's procedural renderer and a future sprite atlas. This is the key rule: **the painter decides what the world is; the topology layer decides which visual role each tile plays.**

### 4. Rendering boundary

`src/phaser/IAssetProvider.ts`

This is the deliberate seam between **what a map contains** and **how it looks**.

Today:

`Catalog ID -> ProceduralAssetProvider -> generated Phaser texture`

Later:

`Catalog ID -> SpriteAssetProvider -> PNG/WebP/atlas frame`

The map JSON should not change when the art pipeline changes.

### 5. Phaser world renderer

`WorldRenderer` turns the document into game objects. Terrain, props and actors share the same square coordinate system. Y-based depth sorting lets characters naturally pass in front of or behind tall props.

The MVP rebuilds the visible world after a document mutation. This keeps the implementation simple and correct while the map is small. The renderer is isolated so it can later switch to dirty-chunk updates without touching domain/editor code.

### 6. DOM editor shell

`src/ui`

The editor chrome is regular HTML/CSS rather than Phaser UI. This gives us crisp controls, accessibility, responsive layout and simpler file import/export.

## Reference contracts

- [Topology contract](TOPOLOGY.md)
- [Asset pipeline](ASSET_PIPELINE.md)

## Coordinate model

- Logical tile = **48 × 48 px**.
- Actor footprint = exactly **1 × 1 tile**.
- Props have explicit footprints, e.g. a house can be **3 × 3** while still being anchored to one integer tile coordinate.
- Terrain painting can affect **1×1, 3×3 or 5×5** regions today; larger semantic region/path tools use the same painter API.
- Terrain is dense because every cell has exactly one base terrain.
- Border/corner visuals are derived from neighborhood topology and are never baked into the map JSON.
- Props and actors are sparse arrays because most cells do not contain them.

That model is suitable for later pathfinding, collision baking, procedural generation, region validation, multiplayer serialization and AI-assisted map building.

## Why not Phaser Tilemap yet?

Phaser Tilemap is excellent when the visual tileset is already the source of truth. Here we are intentionally making the **map model** the source of truth while visuals are temporary procedural art.

Keeping the first renderer sprite-based makes large props, code-generated textures and future mixed atlases straightforward. Once the sprite atlas stabilizes, terrain rendering can be migrated behind `IWorldRenderer` to a chunked Tilemap implementation without changing the document format.

## Next strategic milestones

1. **Topology authoring contract** for mapping semantic terrain/network keys onto future atlas frames, including organic authored corner variants.
2. **Connected-network editor refinement**: live line preview, network-aware erase and richer road/wall/bridge tools.
3. **SpriteAssetProvider** with atlas metadata and per-catalog fallbacks to procedural art.
4. **Selection/move/rotate tools** and multi-cell marquee operations.
5. **Collision/pathfinding preview** using catalog footprints.
6. **Prefab system** for houses, rooms, castle wings and decorative clusters.
7. **Rule-based generator API** so algorithms or AI can lay out semantic maps through commands rather than drawing pixels.
8. **Validation pass**: unreachable doors, blocked roads, overlaps, missing spawn points, water discontinuities.
9. **Map chunks / streaming** for worlds much larger than one screen.
10. **Tiled/LDtk adapter** only if interoperability becomes useful; the native JSON remains the clean canonical format.

## Visual direction

The sample is composed to capture the reference's useful structure rather than its exact art:

- lush, readable outdoor terrain
- hard-edged river transition
- bridge as a gameplay connector
- village with clustered buildings and props
- a castle that exposes multiple functional rooms
- central throne axis
- courtyard / fountain / gate hierarchy
- small NPCs occupying one square each
- dense decoration without changing map semantics

This creates a good stress test for the builder before real sprites arrive.
