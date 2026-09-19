# Retro2DMap — Product Requirements

> **Source of truth for project intent.**
>
> Read this file before making architectural, editor, rendering, map-format, or asset-pipeline changes.
> If a proposed implementation conflicts with this document, preserve these requirements unless the user explicitly changes them.

Last clarified: **2026-09-19**

---

## 1. Product goal

Retro2DMap is a **2D square-tile world/map builder** for a retro fantasy RPG-style game.

The target is a map that can feel as rich, readable, and attractive as a polished Japanese retro RPG map: villages, rivers, bridges, cliffs, castles, castle interiors, roads, vegetation, props, NPCs, and other dense environmental detail.

The editor should be useful as a real **game-building system**, not merely a tile painting demo.

---

## 2. Non-negotiable spatial rules

### 2.1 Square grid

- The world uses a strict **square tile grid**.
- All gameplay-relevant placement is aligned to integer grid coordinates.
- Grid semantics must stay independent from the final art resolution.

### 2.2 Character scale

- **One character occupies exactly one logical tile.**
- The logical tile size is currently **48×48 px**, but gameplay/map semantics must not depend on that pixel size.

### 2.3 Multi-tile world objects

Many things may occupy multiple logical tiles.

Examples:

- houses
- towers
- castle gates
- fountains
- tables
- beds
- large trees
- bridges
- castle rooms
- large decorative structures
- future prefabs

Multi-tile placement is a core feature, not an exception.

A multi-tile object should have:

- a grid anchor
- an explicit logical footprint
- deterministic collision/occupancy semantics
- independent visual overhang when needed

Do not force large objects into a fake 1×1 model.

---

## 3. The painter paints meaning, not graphics

This is one of the most important architectural rules.

The world painter should operate on **logical/semantic content** such as:

- water
- grass
- road
- dirt
- stone floor
- castle wall
- fence
- cliff
- room
- bridge network

It should **not** ask the user to manually choose low-level visual fragments such as:

- water north edge
- water bottom-left corner
- wall T-junction
- road end cap
- fence east corner

Those are derived by the system.

### Required flow

```text
User paints semantic world content
        ↓
Logical map changes
        ↓
Topology/connectivity is recomputed
        ↓
System determines interior / edge / corner / junction / end-cap role
        ↓
Current asset provider renders the correct visual
```

The map data should describe **what the world is**, not how a particular sprite atlas happens to represent it.

---

## 4. Smart multi-tile painting

The world painter must support painting more than one cell at a time.

Current minimum:

- 1×1 brush
- 3×3 brush
- 5×5 brush
- rectangular region painting
- path/line painting

Longer-term tools should use the same semantic painting layer:

- rivers
- roads
- walls
- fences
- cliffs
- rooms
- castle outlines
- selection fills
- generated regions
- prefab placement

The painter should intelligently handle topology after each logical modification.

A future procedural generator or AI map builder must be able to call the **same logical painter API** as the human editor.

---

## 5. Smart borders and connectivity

Connected terrain and structures must automatically choose their correct visual form.

The topology system must be capable of representing:

- isolated tile
- interior tile
- north/east/south/west borders
- inner corners
- outer corners
- straight runs
- end caps
- L corners
- T junctions
- four-way junctions

The topology contract must support a rich **8-neighbour / Wang-style topology system** for authored sprite atlases and natural-looking transitions.

The current implementation already derives eight-neighbour terrain connectivity, including concave inner corners, while connected prop networks derive straight/corner/T/cross/end roles from semantic neighbors. Future authored sprites must preserve this semantic contract rather than moving variant choice into map data.

This logic should eventually apply to both terrain and connected structures, especially:

- rivers / water banks
- paths / roads
- cliffs
- castle walls
- fences
- bridges
- room boundaries

---

## 6. Art pipeline

### 6.1 Current phase

For now, visual assets are generated in code.

This is intentional.

The goal is to stabilize:

- world model
- painter semantics
- editor workflow
- topology rules
- footprints
- rendering contracts
- serialization

before investing heavily in final sprite production.

### 6.2 Future phase

Later, generated art may be replaced by:

- PNG sprites
- WebP sprites
- sprite sheets
- texture atlases
- authored tile variants

That replacement must **not require redesigning or rewriting saved maps**.

Catalog IDs and semantic topology should remain stable.

### 6.3 Props

Props are expected to become sprites.

The editor/domain model should therefore describe a prop independently from its current procedural representation.

---

## 7. Rendering architecture

The renderer is an implementation detail behind clean interfaces.

Required separation:

```text
Map/domain semantics
      ↓
Painter / topology
      ↓
Catalog IDs + render context
      ↓
Asset provider
      ↓
Phaser rendering
```

Important consequences:

- Phaser must not become the source of truth for the map.
- Sprite frame names must not leak into map JSON.
- Generated art must not leak into gameplay logic.
- Switching from procedural assets to authored sprites should be localized.
- Future renderer optimizations must not change the semantic map format.

---

## 8. Editor requirements

The builder should feel deliberate and game-oriented.

Core editor capabilities:

- terrain palette
- prop palette
- actor palette
- paint
- erase
- multi-tile brushes
- semantic straight-line painting for terrain and connected networks
- filled rectangle terrain painting
- grid visualization
- footprint / gesture preview
- derived walkability debug overlay
- semantic prefab placement for compound terrain/props/networks/actors
- select and drag-move actors / props
- actor facing rotation
- quarter-turn orientation for explicitly rotatable props, including footprint/collision/navigation rotation
- route/pathfinding inspection using derived navigation
- semantic validation warnings/errors with map markers
- zoom
- pan
- undo / redo
- local save/load
- JSON import/export

Future editor direction:

- prefab-level orientation / variation tools
- marquee selection
- connected-network refinement
- semantic room/castle composition tools
- richer topology/debug overlay
- procedural generation refinement

Avoid bloated UI for features that can be inferred automatically.

---

## 9. Visual target

The reference image establishes the desired **level of world richness and readability**, not a mandate to copy its assets.

Desired feeling:

- beautiful
- coherent
- game-like
- retro fantasy
- Japanese RPG sensibility
- clear top-down readability
- dense but not visually noisy
- strong separation of terrain, structures, interiors, props, and characters
- visually appealing enough that generated/provisional art still feels intentional

The system should support maps with combinations such as:

- lush village
- paths
- crops
- forest
- rivers
- waterfalls
- cliffs
- bridges
- castle exterior
- courtyard
- gates
- towers
- throne rooms
- libraries
- bedrooms
- dining rooms
- armories
- NPCs and guards

Do not optimize the architecture around a visually trivial tile map.

---

## 10. Map format principles

Map data should be:

- deterministic
- serializable
- renderer-agnostic
- stable across asset changes
- suitable for versioning
- suitable for validation
- suitable for procedural generation
- suitable for future AI-assisted building
- suitable for pathfinding/collision generation

JSON is currently the canonical interchange format.

Avoid persisting information that can be deterministically derived from semantic map state.

For example:

**Good**

```json
{ "terrainId": "water" }
```

**Bad**

```json
{ "sprite": "water_outer_corner_bottom_left_07.png" }
```

---

## 11. Engineering requirements

Use:

- **Vite**
- **Phaser 3**
- **TypeScript**

Code quality priorities:

- clear interfaces
- small responsibilities
- domain logic independent from UI/rendering
- deterministic behavior
- testable pure logic where practical
- avoid premature coupling
- avoid architecture that assumes current placeholder art is permanent

This project is intended to grow into a reusable 2D game/world-building foundation, so structural clarity matters more than shortcuts that only make the first screenshot easier.

---

## 12. Decision rule for future work

When choosing between implementations, prefer the one that keeps:

1. semantic map data clean,
2. topology automatic,
3. multi-tile composition first-class,
4. the sprite pipeline replaceable,
5. editor and procedural generation using the same domain operations,
6. gameplay rules independent from rendering.

If a requested feature would materially compromise one of these principles, **ask the user before making the compromise**.

Do not silently trade long-term map-builder architecture for a short-term visual hack.

---

## 13. Current strategic priorities

In rough order:

1. Marquee selection and bulk semantic editing.
2. Room/castle composition tools built from terrain + connected networks + prefabs.
3. Prefab-level orientation and reusable structural variations.
4. Generator refinement on top of the shared serializable world-command API.
5. Large-map chunking/streaming and dirty-region rendering.
6. Richer validation for entrances, connectivity and generated layouts.
7. Progressive authored sprite/atlas replacement while preserving semantic IDs.
8. Optional Tiled/LDtk interoperability without replacing native JSON.

---

## 14. Requirement-change policy

This document should evolve when the user changes direction.

When a requirement changes:

- update this file,
- keep the wording explicit,
- remove obsolete requirements rather than leaving contradictory guidance,
- update architecture documentation if the change affects implementation strategy.

This file is the project's product/architecture memory. Keep it short enough to reread regularly, but specific enough to prevent design drift.
