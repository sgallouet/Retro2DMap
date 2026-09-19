# Retro2DMap

> **Project source of truth:** read [REQUIREMENTS.md](REQUIREMENTS.md) before changing architecture, map semantics, editor behavior, or the asset pipeline.

A **Phaser 3 + Vite + TypeScript** 2D square-tile world-map builder.

The first milestone deliberately uses **code-generated art** so the map/editor architecture can stabilize before committing to a sprite pipeline. Every world cell is one character footprint. Large props (houses, towers, trees, furniture, etc.) are anchored to cells and may visually/collision-wise span several cells.

## Goals

- Build dense retro-JRPG maps: village, water, cliffs, bridges, castle interiors, props and characters.
- Keep domain/map data independent from rendering.
- Swap procedural visuals for sprite sheets later without changing map documents.
- Make the editor useful from day one: terrain/prop/actor palettes, paint/erase, undo/redo, grid, zoom/pan, local save, JSON import/export.
- Keep the model deterministic and serializable so it can later power a game, generator, validator, AI map builder, or server-side pipeline.

## Quick start

```bash
npm install
npm run dev
```

Production check:

```bash
npm run build
```

## Controls

- **Left click / drag**: paint selected item
- **Right click / drag**: erase on the selected layer
- **B / L**: freehand brush or semantic straight-line mode
- **1 / 3 / 5**: switch terrain brush between 1×1, 3×3 and 5×5
- **Mouse wheel**: zoom
- **Middle drag** or **Space + left drag**: pan
- **Ctrl/Cmd+Z**: undo
- **Ctrl/Cmd+Shift+Z** or **Ctrl/Cmd+Y**: redo
- **G**: toggle grid

## Architecture

The important boundary is `IAssetProvider`: today `ProceduralAssetProvider` creates all textures in code. A future `SpriteAssetProvider` can resolve the same catalog IDs to PNG/WebP/atlas frames without touching editor/domain code.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Current sample

The bundled sample intentionally mirrors the *structure* of the supplied reference: a lush village on the left, a river/bridge transition, and a detailed castle complex on the right with throne room, library, bedrooms, dining/armory areas, courtyard, gate, moat-side landscaping, crops and NPCs. It does **not** embed the reference image or copy its assets.

## Design decisions

- Logical tile size: **48 px**.
- One actor occupies exactly **1×1 tile**.
- Props carry explicit footprints; their art can overhang.
- Terrain is a dense cell grid; props and actors are sparse entity arrays.
- JSON is the canonical map interchange format.
- Editor mutations are history-backed and renderer-agnostic.
- Terrain uses 8-neighbour semantic topology; connected walls/fences/bridges/cliffs derive their own network variants.
- Domain topology and placement rules are covered by automated tests.
