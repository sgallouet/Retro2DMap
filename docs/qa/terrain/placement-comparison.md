# Gate A placement evidence

- Registration: `1536×1152` target → `40×30` cells at `38.4` target pixels per
  cell, top-left origin.
- Static reference grid: `placement-target-grid.png`.
- Live editor check: `Our map opacity` at `50%`, target image behind the map,
  `Terrain only` enabled, `Colored tile cells` enabled, and `Grid` enabled.
  The target bend and road alignment remain visible under the map cells.
- Live terrain-only check: `Our map opacity` at `100%`, `Terrain only` enabled,
  `Colored tile cells` disabled, and `Grid` enabled. No props or actors are
  used as terrain-quality evidence.
- Reviewed mask: `docs/reference-terrain-layout.md`.

The remaining differences are the explicitly listed frozen-object/support
consequences in `docs/M1_HANDOFF.md`, not unexplained terrain mismatches.

## Gate B material evidence

- `wood-floor-center.png` is an authored 48×48 center fill selected through
  the existing `terrain-base` manifest path; procedural topology remains the
  single edge implementation.
- `wood-floor-tile-repeat.png` shows the center fill repeated 10×10 with
  nearest-neighbor pixels. The wood grain and plank seams remain consistent
  across tile boundaries; no separate border family was added without a
  demonstrated transition defect.
- `water-center-tile-repeat.png` shows the authored static water center fill
  repeated 10×10 with no visible tile grid, shore, foam, or land contamination.
- The farm-soil center fill was also checked as a 10×10 repeat before
  integration. Its continuous furrow rhythm has no tile-boundary grid; the
  temporary repeat was discarded to keep this QA folder within four files.
- The stone-floor center fill passed the same 10×10 repeat check after a
  targeted irregular-stone generation; no hard 48-pixel grid was visible.
  The temporary repeat was discarded to keep this QA folder within four files.
- Disposable browser study route: `http://127.0.0.1:5667/?map=wood-seam`.

The accepted stone candidate is a center fill only; procedural topology still
owns all material transitions and corners.

## Gate B topology study

- Disposable route: `http://127.0.0.1:5667/?map=terrain-study`.
- The 24×18 semantic study contains a 4×4 interior patch, isolated/end/strip
  roles, L/T/cross junctions, a two-cell corridor, concave soil holes,
  grass/path/soil/cobble/wood/stone contacts, and land/water plus
  water/deep-water adjacency. It contains zero props and zero actors.
- Live edit smoke: painted a disposable elbow, erased one cell, confirmed
  undo and redo updated the derived borders, then erased the remaining test
  cells and reloaded the study to verify the clean source state.
