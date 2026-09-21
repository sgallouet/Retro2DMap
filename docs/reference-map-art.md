> HISTORICAL: superseded for current execution by docs/M1_REFERENCE_MAP_EXECUTION_PLAN.md. Terrain placement is not accepted; prop/art work is frozen.

# Reference Map 01 — M1 art contract

The target is a three-quarter top-down JRPG reference. It is an art-direction
reference, not a pixel template: the editable map keeps a strict square grid,
integer anchors, and the semantic footprints in
[`reference-map-layout.md`](reference-map-layout.md).

## Shared contract

- Logical tile: 48×48 px. Character footprint: 1×1, opaque body height about
  36–44 px, feet close to the bottom-center of its cell.
- Props are normalized to their declared footprint before integration. A 1×2
  tree uses a 48×96 logical footprint with transparent canopy overhang; a
  2×2 landmark uses a 96×96 logical canvas. No per-instance scale or padding
  compensation belongs in the map recipe.
- Viewpoint is consistent three-quarter top-down: visible top planes plus front
  faces. No isometric diamonds, orthographic side views, or mixed camera tilt.
- Light comes from the upper-left. Shadows are restrained, lower-right, and
  remain visual pixels rather than extra occupied cells.
- Palette: calm grass greens; warm ochre path and wood; cool gray masonry;
  restrained red/gold royal accents; readable blue armor. Grass must not be the
  brightest texture around every landmark.
- Nearest-neighbor sampling, integer dimensions, and a common source pixel
  density are required for authored raster families.

## Family contracts

| Family | Runtime ID(s) | Canvas / footprint | Ground or feet anchor | Status |
| --- | --- | --- | --- | --- |
| Terrain centers | `grass`, `path`, `cobble` | 48×48 / 1×1 | full-cell fill | authored center trials; topology edges remain combined procedural art |
| Round trees | `tree-round` | 72×96 / 1×2 | ground at x=36, y=94 | authored four variants |
| Castle masonry | `castle-wall`, `castle-tower`, `castle-gate` | 48×48, 96×144, 96×96 | wall ground at bottom; tower/gate ground centered | authored tower and open gate; wall network remains procedural |
| Royal surfaces | `rug-red`, `throne`, `banner` | connected 48×48 surface cells; 96×96 throne | surface ground; throne ground bottom-center | authored throne and connected rug; banner remains procedural |
| Village buildings | `house-blue`, `house-red`, signs | 144×144 house / 3×3 | house ground at bottom-center | authored blue house; red house and signs provisional |
| People | `hero`, `king`, `guard`, `scholar`, villagers, farmer | 48×48 / 1×1 | feet near bottom-center | provisional procedural, facing context selected in recipe |
| Courtyard | `fountain`, `statue`, `garden-border` | 96×96 fountain; 48×48 details | ground at footprint bottom | provisional procedural |

The M1.2 castle proof set also covers normalized `bookshelf` (96×48), `table`
(144×48), `stairs` (96×48), and `pillar` (48×96) images. Their transparent
canvases match the catalog footprints; the recipe does not gain any art-specific
offsets.

`rug-red` is a semantic connected surface network. Its renderer draws the gold
border only on exposed sides; internal cells are continuous red. A rectangle,
elbow, T, cross, or edited border must therefore remain a surface-connectivity
operation, not a list of named sprite pieces.

## M1.2 representative section

The proof section is the real throne hall + library + stairs/courtyard
junction: castle masonry and doorway joins, the continuous 2-wide carpet and
2×2 throne, pillars and stairs, the king/guards/hero, library furniture, and
the two courtyard bypasses must be judged together at native and fit-to-map
scale. Water is not part of this art proof; its placement and bridge semantics
are validated separately.

When a bitmap family replaces the procedural provider, the manifest must cover
the actual legal topology keys or fail clearly with the catalog ID/key. It must
not conceal a missing declared frame by silently returning a different family.

